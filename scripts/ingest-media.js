const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const sharp = require("sharp")
const { pathToFileURL } = require("url")
const {
  isSafeRelativePath,
  planMediaIngestion,
  serializeMediaRecords,
  sha256,
  validateManifest,
} = require("./lib/media-ingestion.js")

const projectRoot = path.resolve(__dirname, "..")
const recordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "media",
  "generated",
  "records.json"
)

function usage() {
  return `Journey media ingestion

Usage:
  npm run media:ingest -- --manifest <file> --verification-receipt <file> [--dry-run] [--build]
  npm run media:ingest -- --manifest <file> --verify-public --accept-head-only [--dry-run] [--build]
  npm run media:journeys

Direct usage:
  node scripts/ingest-media.js --manifest <file> --verification-receipt <file>
  node scripts/ingest-media.js --manifest <file> --dry-run

Options:
  --manifest <file>              publication-manifest.json from media:prepare
  --verification-receipt <file> Uploaded-object receipt with key, size, SHA-256
  --verify-public                Send HEAD requests to every public object URL
  --accept-head-only             Explicitly accept size/MIME verification without hashes
  --base-url <url>               Public media base URL (default: https://media.roamwithjustin.com)
  --dry-run                      Validate and print the plan without writing
  --build                        Run the production build after a successful apply
  --journeys                     List canonical Journey IDs
  --help, --h, -h                Show this help

Safety:
  Applying requires uploaded-object verification. A receipt is the strong
  path because it verifies SHA-256; public HEAD is allowed only with the
  explicit --accept-head-only acknowledgement. The command writes only the
  generated Media shard, rolls back failed content validation, and never
  changes curated Journey hero/gallery data.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${option} requires a value\n\n${usage()}`)
  }
  return value
}

function parseArguments(args) {
  const options = {
    acceptHeadOnly: false,
    baseUrl: "https://media.roamwithjustin.com",
    build: false,
    dryRun: false,
    help: false,
    journeys: false,
    manifest: null,
    receipt: null,
    verifyPublic: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--accept-head-only") options.acceptHeadOnly = true
    else if (argument === "--build") options.build = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--journeys") options.journeys = true
    else if (argument === "--verify-public") options.verifyPublic = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (argument === "--manifest") {
      options.manifest = readValue(args, index, "--manifest")
      index += 1
    } else if (argument.startsWith("--manifest=")) {
      options.manifest = argument.slice("--manifest=".length)
    } else if (argument === "--verification-receipt") {
      options.receipt = readValue(args, index, "--verification-receipt")
      index += 1
    } else if (argument.startsWith("--verification-receipt=")) {
      options.receipt = argument.slice("--verification-receipt=".length)
    } else if (argument === "--base-url") {
      options.baseUrl = readValue(args, index, "--base-url")
      index += 1
    } else if (argument.startsWith("--base-url=")) {
      options.baseUrl = argument.slice("--base-url=".length)
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }

  if (options.help) return options
  if (options.journeys) {
    if (
      options.manifest ||
      options.receipt ||
      options.verifyPublic ||
      options.dryRun ||
      options.build
    ) {
      throw new Error("--journeys cannot be combined with ingestion options")
    }
    return options
  }
  if (!options.manifest) {
    throw new Error(`Ingestion requires --manifest\n\n${usage()}`)
  }
  if (options.receipt && options.verifyPublic) {
    throw new Error(
      "Choose either a verification receipt or public HEAD verification"
    )
  }
  if (options.acceptHeadOnly && !options.verifyPublic) {
    throw new Error("--accept-head-only requires --verify-public")
  }
  if (options.verifyPublic && !options.acceptHeadOnly) {
    throw new Error(
      "Public HEAD cannot prove checksums; add --accept-head-only or use a verification receipt"
    )
  }
  if (!options.dryRun && !options.receipt && !options.verifyPublic) {
    throw new Error(
      "Applying ingestion requires --verification-receipt or --verify-public --accept-head-only"
    )
  }
  if (options.build && options.dryRun) {
    throw new Error("--build cannot be combined with --dry-run")
  }
  try {
    new URL(options.baseUrl)
  } catch {
    throw new Error("--base-url must be an absolute URL")
  }
  return options
}

async function importContent(relativePath) {
  return import(pathToFileURL(path.join(projectRoot, relativePath)).href)
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

async function verifyLocalPackage(manifest, manifestFile) {
  const packageDirectory = path.dirname(manifestFile)

  for (const asset of manifest.assets || []) {
    const relativePath = asset?.output?.relativePath
    if (!isSafeRelativePath(relativePath)) {
      throw new Error(`Unsafe package path in manifest: ${relativePath}`)
    }
    const target = path.resolve(packageDirectory, ...relativePath.split("/"))
    const packageRoot = `${path.resolve(packageDirectory)}${path.sep}`
    if (!target.startsWith(packageRoot)) {
      throw new Error(
        `Package path escapes the manifest directory: ${relativePath}`
      )
    }
    let data
    try {
      data = await fs.promises.readFile(target)
    } catch (error) {
      throw new Error(
        `Packaged file is missing: ${relativePath} (${error.message})`
      )
    }
    if (data.length !== asset.output.byteSize) {
      throw new Error(
        `${relativePath} size is ${data.length}; manifest declares ${asset.output.byteSize}`
      )
    }
    const checksum = sha256(data)
    if (checksum !== asset.output.sha256) {
      throw new Error(`${relativePath} does not match its manifest SHA-256`)
    }
    const metadata = await sharp(data).metadata()
    if (
      metadata.width !== asset.output.width ||
      metadata.height !== asset.output.height
    ) {
      throw new Error(`${relativePath} dimensions do not match the manifest`)
    }
    const expectedFormat =
      asset.output.mimeType === "image/jpeg" ? "jpeg" : "png"
    if (metadata.format !== expectedFormat) {
      throw new Error(
        `${relativePath} MIME type does not match its image bytes`
      )
    }
  }
}

function verifyReceipt(manifest, receiptFile) {
  const receipt = readJsonFile(receiptFile, "Verification receipt")
  if (receipt.value?.schemaVersion !== 1) {
    throw new Error("Verification receipt must use schemaVersion 1")
  }
  if (receipt.value?.batchId !== manifest.batchId) {
    throw new Error("Verification receipt batchId does not match the manifest")
  }
  if (!Array.isArray(receipt.value.objects)) {
    throw new Error("Verification receipt objects must be an array")
  }
  const byKey = new Map()
  receipt.value.objects.forEach(object => {
    if (byKey.has(object?.objectKey)) {
      throw new Error(`Verification receipt duplicates "${object?.objectKey}"`)
    }
    byKey.set(object?.objectKey, object)
  })
  manifest.assets.forEach(asset => {
    const expected = asset.output
    const actual = byKey.get(expected.objectKey)
    if (!actual) {
      throw new Error(`Verification receipt is missing "${expected.objectKey}"`)
    }
    if (
      actual.byteSize !== expected.byteSize ||
      actual.sha256 !== expected.sha256
    ) {
      throw new Error(
        `Verification receipt does not match size/checksum for "${expected.objectKey}"`
      )
    }
  })
  if (byKey.size !== manifest.assets.length) {
    throw new Error(
      "Verification receipt contains objects outside this manifest"
    )
  }
  return { method: "receipt-sha256", receiptSha256: sha256(receipt.contents) }
}

function publicObjectUrl(baseUrl, objectKey) {
  const encoded = objectKey
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")
  return `${baseUrl.replace(/\/+$/, "")}/${encoded}`
}

async function verifyPublicObjects(manifest, baseUrl) {
  for (const asset of manifest.assets) {
    const url = publicObjectUrl(baseUrl, asset.output.objectKey)
    const response = await fetch(url, { method: "HEAD", redirect: "follow" })
    if (!response.ok) {
      throw new Error(
        `Public object verification failed for "${asset.output.objectKey}": HTTP ${response.status}`
      )
    }
    const contentLength = Number(response.headers.get("content-length"))
    if (contentLength !== asset.output.byteSize) {
      throw new Error(
        `Public object size mismatch for "${asset.output.objectKey}": ${contentLength}`
      )
    }
    const contentType = (response.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
    if (contentType && contentType !== asset.output.mimeType) {
      throw new Error(
        `Public object MIME mismatch for "${asset.output.objectKey}": ${contentType}`
      )
    }
    console.log(`VERIFIED HEAD ${asset.output.objectKey}`)
  }
  return { method: "public-head-size-and-mime", baseUrl }
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`)
  }
}

async function replaceRecordsAndValidate(serialized) {
  const suffix = `${process.pid}-${Date.now()}`
  const temporaryFile = `${recordsFile}.incoming-${suffix}`
  const backupFile = `${recordsFile}.backup-${suffix}`
  await fs.promises.writeFile(temporaryFile, serialized, { flag: "wx" })
  await fs.promises.rename(recordsFile, backupFile)

  try {
    await fs.promises.rename(temporaryFile, recordsFile)
    runCommand(process.execPath, ["scripts/validate-content.js"])
    await fs.promises.unlink(backupFile)
  } catch (error) {
    try {
      await fs.promises.unlink(recordsFile)
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") throw unlinkError
    }
    await fs.promises.rename(backupFile, recordsFile)
    try {
      await fs.promises.unlink(temporaryFile)
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") throw unlinkError
    }
    throw new Error(`Generated Media update was rolled back: ${error.message}`)
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const [journeyModule, mediaModule] = await Promise.all([
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/media/index.mjs"),
  ])
  if (options.journeys) {
    journeyModule.journeyRecords.forEach(journey =>
      console.log(`${journey.id}\t${journey.slug}\t${journey.title}`)
    )
    return
  }

  const manifestFile = path.resolve(process.cwd(), options.manifest)
  const manifestInput = readJsonFile(manifestFile, "Publication manifest")
  const manifestValidation = validateManifest(manifestInput.value, {
    journeys: journeyModule.journeyRecords,
  })
  if (manifestValidation.errors.length) {
    throw new Error(
      `Publication manifest rejected:\n- ${manifestValidation.errors.join("\n- ")}`
    )
  }
  await verifyLocalPackage(manifestInput.value, manifestFile)

  let verification = { method: "not-verified-dry-run" }
  if (options.receipt) {
    verification = verifyReceipt(
      manifestInput.value,
      path.resolve(process.cwd(), options.receipt)
    )
  } else if (options.verifyPublic) {
    verification = await verifyPublicObjects(
      manifestInput.value,
      options.baseUrl
    )
  }

  const currentInput = readJsonFile(recordsFile, "Generated Media records")
  const generatedIds = new Set(
    (currentInput.value.assets || []).map(asset => asset.id)
  )
  const staticMedia = mediaModule.mediaRecords.filter(
    asset => !generatedIds.has(asset.id)
  )
  const plan = planMediaIngestion(manifestInput.value, currentInput.value, {
    journeys: journeyModule.journeyRecords,
    allowUnverifiedPlan:
      options.dryRun && !options.receipt && !options.verifyPublic,
    manifestSha256: sha256(manifestInput.contents),
    staticMedia,
    verification,
  })
  if (plan.errors.length) {
    throw new Error(`Media ingestion rejected:\n- ${plan.errors.join("\n- ")}`)
  }

  console.log(plan.message)
  console.log(`Batch: ${manifestInput.value.batchId}`)
  console.log(`Journey: ${manifestInput.value.journeyId}`)
  console.log(`Assets: ${plan.assetIds.length}`)
  console.log(`Verification: ${verification.method}`)

  if (options.dryRun) {
    console.log("Dry run complete; generated content was not changed.")
    return
  }
  if (!plan.changed) {
    console.log("No generated content changes were necessary.")
    return
  }

  await replaceRecordsAndValidate(serializeMediaRecords(plan.records))
  console.log(`Updated ${path.relative(projectRoot, recordsFile)}.`)

  if (options.build) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
    runCommand(npmCommand, ["run", "build"])
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
