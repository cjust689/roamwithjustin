const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const { pathToFileURL } = require("url")
const {
  isSafeRelativePath,
  sha256,
  validateManifest,
} = require("./lib/media-ingestion.js")

const projectRoot = path.resolve(__dirname, "..")
const defaultConcurrency = 3
const defaultRetries = 3

function usage() {
  return `Prepared media upload

Usage:
  npm run media:upload -- --manifest <file> [--dry-run]
  npm run media:upload -- --manifest <file> [--endpoint <url>] [--receipt <file>]

Options:
  --manifest <file>      publication-manifest.json from media:prepare
  --endpoint <url>       Upload Worker URL (default: MEDIA_UPLOAD_WORKER_URL)
  --receipt <file>       Receipt output (default: <package>/r2-verification.json)
  --concurrency <n>      Simultaneous object uploads (default: ${defaultConcurrency}, maximum: 8)
  --retries <n>          Retries for network, 429, and 5xx failures (default: ${defaultRetries})
  --dry-run              Validate local bytes and print the remote plan; upload nothing
  --resume               Accepted for clarity; reruns are idempotent by default
  --help, --h, -h        Show this help

Credentials:
  MEDIA_UPLOAD_WORKER_URL  Deployed upload-only Worker origin
  MEDIA_UPLOAD_TOKEN       Bearer secret shared with the Worker

The token is read only from the environment. It is never accepted as a CLI
argument, printed, written to the manifest, or stored in the receipt.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${option} requires a value\n\n${usage()}`)
  }
  return value
}

function parseInteger(value, option, minimum, maximum) {
  if (!/^\d+$/.test(value || "")) {
    throw new Error(`${option} must be an integer`)
  }
  const parsed = Number(value)
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${option} must be between ${minimum} and ${maximum}`)
  }
  return parsed
}

function parseArguments(args) {
  const options = {
    concurrency: defaultConcurrency,
    dryRun: false,
    endpoint: process.env.MEDIA_UPLOAD_WORKER_URL || "",
    help: false,
    manifest: null,
    receipt: null,
    resume: false,
    retries: defaultRetries,
    token: process.env.MEDIA_UPLOAD_TOKEN || "",
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--resume") options.resume = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (argument === "--manifest") {
      options.manifest = readValue(args, index, "--manifest")
      index += 1
    } else if (argument.startsWith("--manifest=")) {
      options.manifest = argument.slice("--manifest=".length)
    } else if (argument === "--endpoint") {
      options.endpoint = readValue(args, index, "--endpoint")
      index += 1
    } else if (argument.startsWith("--endpoint=")) {
      options.endpoint = argument.slice("--endpoint=".length)
    } else if (argument === "--receipt") {
      options.receipt = readValue(args, index, "--receipt")
      index += 1
    } else if (argument.startsWith("--receipt=")) {
      options.receipt = argument.slice("--receipt=".length)
    } else if (argument === "--concurrency") {
      options.concurrency = parseInteger(
        readValue(args, index, "--concurrency"),
        "--concurrency",
        1,
        8
      )
      index += 1
    } else if (argument.startsWith("--concurrency=")) {
      options.concurrency = parseInteger(
        argument.slice("--concurrency=".length),
        "--concurrency",
        1,
        8
      )
    } else if (argument === "--retries") {
      options.retries = parseInteger(
        readValue(args, index, "--retries"),
        "--retries",
        0,
        10
      )
      index += 1
    } else if (argument.startsWith("--retries=")) {
      options.retries = parseInteger(
        argument.slice("--retries=".length),
        "--retries",
        0,
        10
      )
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }

  if (options.help) return options
  if (!options.manifest) {
    throw new Error(`Upload requires --manifest\n\n${usage()}`)
  }
  if (!options.dryRun && !options.endpoint) {
    throw new Error(
      "Upload requires MEDIA_UPLOAD_WORKER_URL or --endpoint; use --dry-run for local validation"
    )
  }
  if (!options.dryRun && !options.token) {
    throw new Error(
      "Upload requires MEDIA_UPLOAD_TOKEN in the environment; tokens are not accepted as arguments"
    )
  }
  if (options.endpoint) validateEndpoint(options.endpoint)
  return options
}

function validateEndpoint(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("Upload Worker endpoint must be an absolute URL")
  }
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname
  )
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new Error(
      "Upload Worker endpoint must use HTTPS except for local development"
    )
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Upload Worker endpoint cannot contain credentials, query parameters, or a fragment"
    )
  }
}

function readJsonFile(file, label) {
  let contents
  try {
    contents = fs.readFileSync(file, "utf8")
  } catch (error) {
    throw new Error(`${label} cannot be read at ${file}: ${error.message}`)
  }
  try {
    return { contents, value: JSON.parse(contents.replace(/^\uFEFF/, "")) }
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`)
  }
}

async function importJourneys() {
  return import(
    pathToFileURL(
      path.join(projectRoot, "src", "content", "journeys", "index.mjs")
    ).href
  )
}

async function loadPreparedPackage(manifestFile) {
  const absoluteManifest = path.resolve(process.cwd(), manifestFile)
  const input = readJsonFile(absoluteManifest, "Publication manifest")
  const journeyModule = await importJourneys()
  const validation = validateManifest(input.value, {
    journeys: journeyModule.journeyRecords,
  })
  if (validation.errors.length) {
    throw new Error(
      `Publication manifest rejected:\n- ${validation.errors.join("\n- ")}`
    )
  }

  const packageDirectory = path.dirname(absoluteManifest)
  const realPackageDirectory = await fs.promises.realpath(packageDirectory)
  const packageRoot = `${realPackageDirectory}${path.sep}`
  const preparedAssets = []
  for (const asset of input.value.assets) {
    const relativePath = asset.output.relativePath
    if (!isSafeRelativePath(relativePath)) {
      throw new Error(`Unsafe package path in manifest: ${relativePath}`)
    }
    const target = path.resolve(packageDirectory, ...relativePath.split("/"))
    let realTarget
    try {
      realTarget = await fs.promises.realpath(target)
    } catch (error) {
      throw new Error(
        `Packaged file is missing: ${relativePath} (${error.message})`
      )
    }
    if (!realTarget.startsWith(packageRoot)) {
      throw new Error(`Packaged file escapes the manifest directory: ${relativePath}`)
    }
    preparedAssets.push({ asset, file: realTarget })
  }

  return {
    manifest: input.value,
    manifestFile: absoluteManifest,
    manifestSha256: sha256(input.contents),
    packageDirectory,
    preparedAssets,
  }
}

async function readVerifiedAsset(prepared) {
  const { asset, file } = prepared
  const data = await fs.promises.readFile(file)
  const output = asset.output
  if (data.length !== output.byteSize) {
    throw new Error(
      `${output.relativePath} size is ${data.length}; manifest declares ${output.byteSize}`
    )
  }
  if (sha256(data) !== output.sha256) {
    throw new Error(`${output.relativePath} does not match its manifest SHA-256`)
  }
  if (output.mimeType === "video/mp4") {
    if (data.length < 12 || data.toString("ascii", 4, 8) !== "ftyp") {
      throw new Error(`${output.relativePath} does not contain MP4 bytes`)
    }
  } else {
    const metadata = await sharp(data).metadata()
    const expectedFormat = output.mimeType === "image/jpeg" ? "jpeg" : "png"
    if (
      metadata.format !== expectedFormat ||
      metadata.width !== output.width ||
      metadata.height !== output.height
    ) {
      throw new Error(
        `${output.relativePath} image format or dimensions do not match the manifest`
      )
    }
  }
  return data
}

function encodedObjectKey(objectKey) {
  return objectKey.split("/").map(encodeURIComponent).join("/")
}

function uploadUrl(endpoint, objectKey) {
  const base = new URL(endpoint)
  base.pathname = `/v1/objects/${encodedObjectKey(objectKey)}`
  base.search = ""
  base.hash = ""
  return base.toString()
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get("retry-after"))
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 10000)
  }
  return Math.min(250 * 2 ** attempt, 4000)
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function responseJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 500) }
  }
}

async function uploadPreparedAsset(prepared, manifest, options) {
  const data = await readVerifiedAsset(prepared)
  const output = prepared.asset.output
  const targetUrl = uploadUrl(options.endpoint, output.objectKey)
  let lastError

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    let response
    try {
      response = await options.fetchImpl(targetUrl, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${options.token}`,
          "content-length": String(data.length),
          "content-type": output.mimeType,
          "x-media-batch-id": manifest.batchId,
          "x-media-byte-size": String(output.byteSize),
          "x-media-sha256": output.sha256,
        },
        body: data,
      })
    } catch (error) {
      lastError = error
      if (attempt < options.retries) {
        await options.waitImpl(Math.min(250 * 2 ** attempt, 4000))
        continue
      }
      throw new Error(`${output.relativePath} upload failed: ${error.message}`)
    }

    if ((response.status === 429 || response.status >= 500) && attempt < options.retries) {
      await response.arrayBuffer()
      await options.waitImpl(retryDelay(response, attempt))
      continue
    }

    const result = await responseJson(response)
    if (!response.ok) {
      throw new Error(
        `${output.relativePath} upload rejected (${response.status} ${result.error || "upload_error"}): ${result.message || "No detail returned"}`
      )
    }
    if (
      !["uploaded", "already_present"].includes(result.outcome) ||
      result.key !== output.objectKey ||
      result.byteSize !== output.byteSize ||
      result.sha256 !== output.sha256 ||
      result.digestVerified !== true
    ) {
      throw new Error(
        `${output.relativePath} received incomplete or mismatched remote verification`
      )
    }
    return result
  }

  throw lastError || new Error(`${output.relativePath} upload failed`)
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex
        nextIndex += 1
        try {
          results[index] = { value: await callback(items[index], index) }
        } catch (error) {
          results[index] = { error }
        }
      }
    }
  )
  await Promise.all(workers)
  return results
}

function receiptObjects(manifest) {
  return manifest.assets.map(asset => ({
    objectKey: asset.output.objectKey,
    byteSize: asset.output.byteSize,
    sha256: asset.output.sha256,
  }))
}

function receiptMatches(existing, expected) {
  return Boolean(
    existing?.schemaVersion === expected.schemaVersion &&
      existing?.batchId === expected.batchId &&
      JSON.stringify(existing?.objects) === JSON.stringify(expected.objects)
  )
}

async function writeReceipt(receiptFile, receipt) {
  const target = path.resolve(process.cwd(), receiptFile)
  if (fs.existsSync(target)) {
    const existing = readJsonFile(target, "Existing verification receipt").value
    if (!receiptMatches(existing, receipt)) {
      throw new Error(
        `Refusing to overwrite a different verification receipt: ${target}`
      )
    }
    return { target, existing: true }
  }

  const parent = path.dirname(target)
  const parentStat = await fs.promises.stat(parent).catch(() => null)
  if (!parentStat?.isDirectory()) {
    throw new Error(`Receipt parent directory does not exist: ${parent}`)
  }
  const temporary = `${target}.incoming-${process.pid}-${Date.now()}`
  try {
    await fs.promises.writeFile(
      temporary,
      `${JSON.stringify(receipt, null, 2)}\n`,
      { flag: "wx" }
    )
    await fs.promises.rename(temporary, target)
  } catch (error) {
    await fs.promises.unlink(temporary).catch(unlinkError => {
      if (unlinkError.code !== "ENOENT") throw unlinkError
    })
    throw error
  }
  return { target, existing: false }
}

async function validatePreparedAssets(mediaPackage) {
  for (const prepared of mediaPackage.preparedAssets) {
    await readVerifiedAsset(prepared)
  }
}

async function uploadMediaPackage(input) {
  const mediaPackage = await loadPreparedPackage(input.manifestFile)
  const options = {
    concurrency: input.concurrency ?? defaultConcurrency,
    endpoint: input.endpoint,
    fetchImpl: input.fetchImpl || fetch,
    retries: input.retries ?? defaultRetries,
    token: input.token,
    waitImpl: input.waitImpl || wait,
  }

  if (input.dryRun) {
    await validatePreparedAssets(mediaPackage)
    return { dryRun: true, mediaPackage, receipt: null, results: [] }
  }

  validateEndpoint(options.endpoint)
  if (!options.token) throw new Error("An upload token is required")
  const settled = await mapWithConcurrency(
    mediaPackage.preparedAssets,
    options.concurrency,
    prepared => uploadPreparedAsset(prepared, mediaPackage.manifest, options)
  )
  const failures = settled.filter(result => result.error)
  if (failures.length) {
    throw new Error(
      `Media upload did not complete:\n- ${failures.map(result => result.error.message).join("\n- ")}`
    )
  }
  const results = settled.map(result => result.value)
  const receipt = {
    schemaVersion: 1,
    batchId: mediaPackage.manifest.batchId,
    objects: receiptObjects(mediaPackage.manifest),
    verification: {
      method: "worker-r2-sha256",
      endpoint: new URL(options.endpoint).origin,
      manifestSha256: mediaPackage.manifestSha256,
      verifiedAt: new Date().toISOString(),
      requestIds: results.map(result => result.requestId).filter(Boolean),
    },
  }
  const receiptFile =
    input.receiptFile ||
    path.join(mediaPackage.packageDirectory, "r2-verification.json")
  const receiptWrite = await writeReceipt(receiptFile, receipt)
  return { dryRun: false, mediaPackage, receipt, receiptWrite, results }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const result = await uploadMediaPackage({
    concurrency: options.concurrency,
    dryRun: options.dryRun,
    endpoint: options.endpoint,
    manifestFile: options.manifest,
    receiptFile: options.receipt,
    retries: options.retries,
    token: options.token,
  })
  const { manifest } = result.mediaPackage
  console.log(`Batch: ${manifest.batchId}`)
  console.log(`Journey: ${manifest.journeyId}`)
  if (manifest.placeId) console.log(`Place: ${manifest.placeId}`)
  console.log(`Objects: ${manifest.assets.length}`)

  if (result.dryRun) {
    manifest.assets.forEach(asset => {
      console.log(
        `WOULD UPLOAD ${asset.output.relativePath} -> ${asset.output.objectKey} (${asset.output.byteSize} bytes)`
      )
    })
    console.log("Dry run complete; no remote requests or receipt writes occurred.")
    return
  }

  result.results.forEach((remote, index) => {
    const relativePath = manifest.assets[index].output.relativePath
    console.log(`${remote.outcome.toUpperCase()} ${relativePath} -> ${remote.key}`)
  })
  console.log(
    `${result.receiptWrite.existing ? "Verified existing" : "Created"} receipt: ${result.receiptWrite.target}`
  )
  console.log(
    "Upload complete. Run npm run media:ingest with this manifest and verification receipt."
  )
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = {
  loadPreparedPackage,
  parseArguments,
  readVerifiedAsset,
  uploadMediaPackage,
  uploadPreparedAsset,
  usage,
  validateEndpoint,
  writeReceipt,
}
