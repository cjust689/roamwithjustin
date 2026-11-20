import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

import sharp from "sharp"

import {
  downloadAuthorizedGearImage,
  validateAuthorizedImageUrl,
} from "./gear-remote-image.mjs"

const require = createRequire(import.meta.url)
const { gearWebpPipeline } = require("./image-normalization.js")

const gearIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ownerPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const maximumSourceBytes = 50 * 1024 * 1024
const maximumSourcePixels = 80_000_000
const preparationVersion = 1
const checksumPattern = /^[a-f0-9]{64}$/
const contentHashPattern = /^[a-f0-9]{24}$/

const sourceFormats = Object.freeze({
  ".jpeg": { format: "jpeg", mimeType: "image/jpeg" },
  ".jpg": { format: "jpeg", mimeType: "image/jpeg" },
  ".png": { format: "png", mimeType: "image/png" },
})

export const gearDerivativeSpecs = Object.freeze([
  Object.freeze({ role: "card-thumbnail", width: 320 }),
  Object.freeze({ role: "card-display", width: 640 }),
  Object.freeze({ role: "detail", width: 960 }),
])

export function gearImageUsage() {
  return [
    "Gear image preparation",
    "",
    "Usage:",
    "  npm run gear:prepare -- --gear-id <id> --source <file-or-https-url> [--source-host <host>] --output <directory> --rights-owner <id> --rights-status owned --rights-reviewed --alt <text> --dry-run",
    "  npm run gear:prepare -- --gear-id <id> --source <file-or-https-url> [--source-host <host>] --output <directory> --rights-owner <id> --rights-status owned --rights-reviewed --alt <text> --apply",
    "",
    "This trusted publisher accepts one local JPEG or PNG, or one explicitly approved",
    "HTTPS source, whose creator-owned rights have been reviewed. It creates",
    "deterministic 320, 640, and 960 pixel WebP",
    "derivatives plus a Gear-specific manifest. It never uploads, edits canonical",
    "Gear records, creates Journey associations, or overwrites a different package.",
    "",
    "Options:",
    "  --gear-id <id>          Stable lowercase ASCII kebab-case Gear ID",
    "  --source <value>        Local JPEG/PNG file or explicitly permitted HTTPS URL",
    "  --source-host <host>    Exact approved DNS host, required for an HTTPS source",
    "  --output <directory>    Parent directory for the prepared package",
    "  --rights-owner <id>     Reviewed creator rights owner identifier",
    "  --rights-status owned   Required creator-owned status for this slice",
    "  --rights-reviewed       Confirms the source rights were deliberately reviewed",
    "  --alt <text>            Neutral, reviewed product image alternative text",
    "  --dry-run               Validate and render derivatives in memory only",
    "  --apply                 Atomically write the deterministic package",
    "  --help, --h, -h         Show this help",
  ].join("\n")
}

function optionValue(args, index, option) {
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(option + " requires a value\n\n" + gearImageUsage())
  }
  return value
}

export function parseGearImageArguments(args) {
  const options = {
    alt: null,
    apply: false,
    dryRun: false,
    gearId: null,
    help: false,
    output: null,
    rightsOwner: null,
    rightsReviewed: false,
    rightsStatus: null,
    source: null,
    sourceHost: null,
  }
  const valueOptions = new Map([
    ["--alt", "alt"],
    ["--gear-id", "gearId"],
    ["--output", "output"],
    ["--rights-owner", "rightsOwner"],
    ["--rights-status", "rightsStatus"],
    ["--source", "source"],
    ["--source-host", "sourceHost"],
  ])

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") options.apply = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--rights-reviewed") options.rightsReviewed = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (valueOptions.has(argument)) {
      options[valueOptions.get(argument)] = optionValue(args, index, argument)
      index += 1
    } else {
      const equalsOption = [...valueOptions.keys()].find(option =>
        argument.startsWith(option + "=")
      )
      if (!equalsOption) {
        throw new Error(
          "Unknown argument: " + argument + "\n\n" + gearImageUsage()
        )
      }
      options[valueOptions.get(equalsOption)] = argument.slice(
        equalsOption.length + 1
      )
    }
  }

  if (options.help) return options
  validateGearImageOptions(options)
  return options
}

function cleanText(value, label) {
  const text = String(value || "").trim()
  if (!text) throw new Error(label + " is required")
  if (text !== value) {
    throw new Error(label + " cannot start or end with whitespace")
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(label + " cannot contain control characters")
  }
  return text
}

export function validateGearImageOptions(options) {
  if (options.apply === options.dryRun) {
    throw new Error("Choose exactly one of --dry-run or --apply")
  }

  options.gearId = cleanText(options.gearId, "--gear-id")
  if (!gearIdPattern.test(options.gearId)) {
    throw new Error("--gear-id must be lowercase ASCII kebab-case")
  }
  options.source = cleanText(options.source, "--source")
  const isRemote = /^[a-z][a-z0-9+.-]*:\/\//i.test(options.source)
  if (isRemote) {
    options.sourceHost = cleanText(options.sourceHost, "--source-host")
    options.sourceHost = validateAuthorizedImageUrl(
      options.source,
      options.sourceHost
    ).approvedHost
  } else if (options.sourceHost !== null && options.sourceHost !== undefined) {
    throw new Error("--source-host is valid only with a remote HTTPS source")
  }
  options.output = cleanText(options.output, "--output")
  options.rightsOwner = cleanText(options.rightsOwner, "--rights-owner")
  if (!ownerPattern.test(options.rightsOwner)) {
    throw new Error("--rights-owner must be lowercase ASCII kebab-case")
  }
  if (options.rightsStatus !== "owned") {
    throw new Error(
      "--rights-status must be owned for the creator-owned image slice"
    )
  }
  if (!options.rightsReviewed) {
    throw new Error(
      "--rights-reviewed is required; image rights are never inferred"
    )
  }
  options.alt = cleanText(options.alt, "--alt")
  if (options.alt.length > 240) {
    throw new Error("--alt cannot exceed 240 characters")
  }
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex")
}

async function pathExists(target) {
  try {
    await fs.promises.access(target)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

async function validateDecodedSource(data, contract, stats, label) {
  let metadata
  try {
    metadata = await sharp(data, {
      limitInputPixels: maximumSourcePixels,
    }).metadata()
  } catch (error) {
    throw new Error("Gear image source could not be decoded: " + error.message)
  }
  if (metadata.format !== contract.format) {
    throw new Error(
      "Gear image " +
        label +
        " does not match decoded " +
        (metadata.format || "unknown") +
        " bytes"
    )
  }
  if (!metadata.width || !metadata.height) {
    throw new Error("Gear image source has no measurable dimensions")
  }
  if (metadata.width * metadata.height > maximumSourcePixels) {
    throw new Error(
      "Gear image source exceeds the 80 megapixel preparation limit"
    )
  }
  if ((metadata.pages || 1) !== 1) {
    throw new Error("Animated or multi-page images are not supported")
  }
  return { contract, data, metadata, stats }
}

async function readAndValidateLocalSource(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase()
  const contract = sourceFormats[extension]
  if (!contract) throw new Error("Gear image source must be a JPEG or PNG file")

  let stats
  try {
    stats = await fs.promises.stat(sourcePath)
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Gear image source does not exist: " + sourcePath)
    }
    throw error
  }
  if (!stats.isFile()) {
    throw new Error("Gear image source is not a file: " + sourcePath)
  }
  if (!stats.size) throw new Error("Gear image source is empty")
  if (stats.size > maximumSourceBytes) {
    throw new Error(
      "Gear image source exceeds the 50 MiB local preparation limit"
    )
  }

  const data = await fs.promises.readFile(sourcePath)
  return {
    ...(await validateDecodedSource(
      data,
      contract,
      stats,
      "extension " + extension
    )),
    originalFilename: path.basename(sourcePath),
  }
}

async function createDerivatives(sourceData) {
  const derivatives = []
  for (const spec of gearDerivativeSpecs) {
    const { data, info } = await gearWebpPipeline(
      sourceData,
      spec.width
    ).toBuffer({ resolveWithObject: true })
    const metadata = await sharp(data).metadata()
    const retainedPrivateMetadata = ["exif", "iptc", "xmp"].filter(
      field => metadata[field]
    )
    if (retainedPrivateMetadata.length) {
      throw new Error(
        "Prepared " +
          spec.role +
          " retained forbidden metadata: " +
          retainedPrivateMetadata.join(", ")
      )
    }
    derivatives.push({
      role: spec.role,
      targetWidth: spec.width,
      width: info.width,
      height: info.height,
      relativePath: spec.width + ".webp",
      mimeType: "image/webp",
      byteSize: data.length,
      sha256: sha256(data),
      data,
    })
  }
  return derivatives
}

function createManifest(options, source, derivatives) {
  const sourceSha256 = sha256(source.data)
  const contentHash = sha256(
    JSON.stringify({
      preparationVersion,
      sourceSha256,
      derivatives: derivatives.map(derivative => ({
        role: derivative.role,
        targetWidth: derivative.targetWidth,
        sha256: derivative.sha256,
      })),
    })
  ).slice(0, 24)
  const r2Prefix = "images/gear/" + options.gearId + "/" + contentHash + "/"

  return {
    schemaVersion: 1,
    manifestType: "gear-image-publication",
    batchId: "gear-image-" + options.gearId + "-" + contentHash,
    uploadBatchId: contentHash,
    gearId: options.gearId,
    contentHash,
    source: {
      originalFilename: source.originalFilename,
      mimeType: source.contract.mimeType,
      width: source.metadata.width,
      height: source.metadata.height,
      byteSize: source.stats.size,
      sha256: sourceSha256,
      ...(source.approvedHost
        ? {
            intake: {
              type: "https",
              approvedHost: source.approvedHost,
            },
          }
        : {}),
    },
    rights: {
      owner: options.rightsOwner,
      status: options.rightsStatus,
      reviewed: true,
    },
    alt: options.alt,
    processing: {
      version: preparationVersion,
      format: "webp",
      fit: "inside",
      colourspace: "srgb",
      metadata: "stripped",
      withoutEnlargement: true,
    },
    r2Prefix,
    derivatives: derivatives.map(derivative => ({
      role: derivative.role,
      targetWidth: derivative.targetWidth,
      width: derivative.width,
      height: derivative.height,
      relativePath: derivative.relativePath,
      objectKey: r2Prefix + derivative.relativePath,
      mimeType: derivative.mimeType,
      byteSize: derivative.byteSize,
      sha256: derivative.sha256,
    })),
  }
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function addManifestError(errors, condition, message) {
  if (!condition) errors.push(message)
}

export function validateGearImageManifest(manifest) {
  const errors = []
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { errors: ["Gear image manifest must be an object"] }
  }

  addManifestError(
    errors,
    manifest.schemaVersion === 1,
    "schemaVersion must be 1"
  )
  addManifestError(
    errors,
    manifest.manifestType === "gear-image-publication",
    "manifestType must be gear-image-publication"
  )
  addManifestError(
    errors,
    typeof manifest.gearId === "string" && gearIdPattern.test(manifest.gearId),
    "gearId must be lowercase ASCII kebab-case"
  )
  addManifestError(
    errors,
    typeof manifest.contentHash === "string" &&
      contentHashPattern.test(manifest.contentHash),
    "contentHash must be 24 lowercase hexadecimal characters"
  )

  const expectedBatchId =
    typeof manifest.gearId === "string" &&
    typeof manifest.contentHash === "string"
      ? "gear-image-" + manifest.gearId + "-" + manifest.contentHash
      : null
  const expectedPrefix =
    typeof manifest.gearId === "string" &&
    typeof manifest.contentHash === "string"
      ? "images/gear/" + manifest.gearId + "/" + manifest.contentHash + "/"
      : null
  addManifestError(
    errors,
    expectedBatchId !== null && manifest.batchId === expectedBatchId,
    "batchId does not match gearId and contentHash"
  )
  addManifestError(
    errors,
    manifest.uploadBatchId === manifest.contentHash,
    "uploadBatchId must equal contentHash"
  )
  addManifestError(
    errors,
    expectedPrefix !== null && manifest.r2Prefix === expectedPrefix,
    "r2Prefix does not match the immutable Gear image prefix"
  )

  const source = manifest.source
  addManifestError(
    errors,
    source && typeof source === "object" && !Array.isArray(source),
    "source must be an object"
  )
  if (source && typeof source === "object" && !Array.isArray(source)) {
    addManifestError(
      errors,
      typeof source.originalFilename === "string" &&
        source.originalFilename.length > 0 &&
        path.basename(source.originalFilename) === source.originalFilename &&
        !/[\u0000-\u001f\u007f]/.test(source.originalFilename),
      "source.originalFilename must be a plain filename"
    )
    addManifestError(
      errors,
      ["image/jpeg", "image/png"].includes(source.mimeType),
      "source.mimeType must be image/jpeg or image/png"
    )
    addManifestError(
      errors,
      isPositiveInteger(source.width),
      "source.width must be a positive integer"
    )
    addManifestError(
      errors,
      isPositiveInteger(source.height),
      "source.height must be a positive integer"
    )
    addManifestError(
      errors,
      isPositiveInteger(source.byteSize),
      "source.byteSize must be a positive integer"
    )
    addManifestError(
      errors,
      typeof source.sha256 === "string" && checksumPattern.test(source.sha256),
      "source.sha256 must be a lowercase hexadecimal SHA-256 digest"
    )
    if (source.intake !== undefined) {
      addManifestError(
        errors,
        source.intake &&
          typeof source.intake === "object" &&
          !Array.isArray(source.intake) &&
          source.intake.type === "https" &&
          typeof source.intake.approvedHost === "string",
        "source.intake must identify an approved HTTPS host"
      )
      if (source.intake?.type === "https") {
        try {
          validateAuthorizedImageUrl(
            "https://" + source.intake.approvedHost + "/source",
            source.intake.approvedHost
          )
        } catch {
          errors.push(
            "source.intake.approvedHost must be one exact public DNS hostname"
          )
        }
      }
    }
  }

  const rights = manifest.rights
  addManifestError(
    errors,
    rights && typeof rights === "object" && !Array.isArray(rights),
    "rights must be an object"
  )
  if (rights && typeof rights === "object" && !Array.isArray(rights)) {
    addManifestError(
      errors,
      typeof rights.owner === "string" && ownerPattern.test(rights.owner),
      "rights.owner must be lowercase ASCII kebab-case"
    )
    addManifestError(
      errors,
      rights.status === "owned",
      "rights.status must be owned"
    )
    addManifestError(
      errors,
      rights.reviewed === true,
      "rights.reviewed must be true"
    )
  }

  addManifestError(
    errors,
    typeof manifest.alt === "string" &&
      manifest.alt.length > 0 &&
      manifest.alt.length <= 240 &&
      manifest.alt.trim() === manifest.alt &&
      !/[\u0000-\u001f\u007f]/.test(manifest.alt),
    "alt must be reviewed text between 1 and 240 characters"
  )

  const processing = manifest.processing
  const expectedProcessing = {
    version: preparationVersion,
    format: "webp",
    fit: "inside",
    colourspace: "srgb",
    metadata: "stripped",
    withoutEnlargement: true,
  }
  addManifestError(
    errors,
    processing &&
      typeof processing === "object" &&
      !Array.isArray(processing) &&
      Object.entries(expectedProcessing).every(
        ([key, value]) => processing[key] === value
      ),
    "processing does not match the supported Gear image policy"
  )

  addManifestError(
    errors,
    Array.isArray(manifest.derivatives) &&
      manifest.derivatives.length === gearDerivativeSpecs.length,
    "derivatives must contain the three supported Gear image outputs"
  )
  if (Array.isArray(manifest.derivatives)) {
    const relativePaths = new Set()
    const objectKeys = new Set()
    manifest.derivatives.forEach((derivative, index) => {
      const spec = gearDerivativeSpecs[index]
      const label = "derivatives[" + index + "]"
      if (
        !derivative ||
        typeof derivative !== "object" ||
        Array.isArray(derivative)
      ) {
        errors.push(label + " must be an object")
        return
      }
      if (!spec) {
        errors.push(label + " is not a supported Gear image derivative")
        return
      }
      const expectedRelativePath = spec.width + ".webp"
      addManifestError(
        errors,
        derivative.role === spec.role,
        label + ".role is invalid"
      )
      addManifestError(
        errors,
        derivative.targetWidth === spec.width,
        label + ".targetWidth is invalid"
      )
      addManifestError(
        errors,
        isPositiveInteger(derivative.width) && derivative.width <= spec.width,
        label + ".width is invalid"
      )
      addManifestError(
        errors,
        isPositiveInteger(derivative.height) && derivative.height <= spec.width,
        label + ".height is invalid"
      )
      addManifestError(
        errors,
        derivative.relativePath === expectedRelativePath,
        label + ".relativePath is invalid"
      )
      addManifestError(
        errors,
        expectedPrefix !== null &&
          derivative.objectKey === expectedPrefix + expectedRelativePath,
        label + ".objectKey is invalid"
      )
      addManifestError(
        errors,
        derivative.mimeType === "image/webp",
        label + ".mimeType must be image/webp"
      )
      addManifestError(
        errors,
        isPositiveInteger(derivative.byteSize),
        label + ".byteSize must be a positive integer"
      )
      addManifestError(
        errors,
        typeof derivative.sha256 === "string" &&
          checksumPattern.test(derivative.sha256),
        label + ".sha256 must be a lowercase hexadecimal SHA-256 digest"
      )
      if (relativePaths.has(derivative.relativePath)) {
        errors.push(label + ".relativePath is duplicated")
      }
      if (objectKeys.has(derivative.objectKey)) {
        errors.push(label + ".objectKey is duplicated")
      }
      relativePaths.add(derivative.relativePath)
      objectKeys.add(derivative.objectKey)
    })
  }

  if (
    source &&
    typeof source.sha256 === "string" &&
    checksumPattern.test(source.sha256) &&
    Array.isArray(manifest.derivatives) &&
    manifest.derivatives.length === gearDerivativeSpecs.length &&
    manifest.derivatives.every(
      derivative =>
        derivative &&
        typeof derivative.sha256 === "string" &&
        checksumPattern.test(derivative.sha256)
    )
  ) {
    const expectedContentHash = sha256(
      JSON.stringify({
        preparationVersion,
        sourceSha256: source.sha256,
        derivatives: manifest.derivatives.map(derivative => ({
          role: derivative.role,
          targetWidth: derivative.targetWidth,
          sha256: derivative.sha256,
        })),
      })
    ).slice(0, 24)
    addManifestError(
      errors,
      manifest.contentHash === expectedContentHash,
      "contentHash does not match the prepared source and derivative checksums"
    )
  }

  return { errors }
}

function serializeManifest(manifest) {
  return JSON.stringify(manifest, null, 2) + "\n"
}

async function validateExistingPackage(
  packageDirectory,
  manifest,
  derivatives
) {
  const requiredNames = new Set([
    "gear-image-manifest.json",
    ...derivatives.map(derivative => derivative.relativePath),
  ])
  const allowedNames = new Set([...requiredNames, "gear-r2-verification.json"])
  const entries = await fs.promises.readdir(packageDirectory, {
    withFileTypes: true,
  })
  const entryNames = new Set(entries.map(entry => entry.name))
  if (
    entries.some(entry => !entry.isFile() || !allowedNames.has(entry.name)) ||
    [...requiredNames].some(name => !entryNames.has(name))
  ) {
    throw new Error(
      "Existing Gear image package differs from the deterministic file set: " +
        packageDirectory
    )
  }

  const existingManifest = await fs.promises.readFile(
    path.join(packageDirectory, "gear-image-manifest.json"),
    "utf8"
  )
  if (existingManifest !== serializeManifest(manifest)) {
    throw new Error(
      "Existing Gear image package has different manifest content: " +
        packageDirectory
    )
  }
  for (const derivative of derivatives) {
    const data = await fs.promises.readFile(
      path.join(packageDirectory, derivative.relativePath)
    )
    if (sha256(data) !== derivative.sha256) {
      throw new Error(
        "Existing Gear image derivative failed checksum verification: " +
          derivative.relativePath
      )
    }
  }
}

async function writePackage(packageDirectory, manifest, derivatives) {
  const parentDirectory = path.dirname(packageDirectory)
  await fs.promises.mkdir(parentDirectory, { recursive: true })
  if (await pathExists(packageDirectory)) {
    await validateExistingPackage(packageDirectory, manifest, derivatives)
    return "unchanged"
  }

  const stagingDirectory = path.join(
    parentDirectory,
    "." +
      path.basename(packageDirectory) +
      "-prepare-" +
      process.pid +
      "-" +
      Date.now()
  )
  await fs.promises.mkdir(stagingDirectory, { recursive: false })
  try {
    for (const derivative of derivatives) {
      await fs.promises.writeFile(
        path.join(stagingDirectory, derivative.relativePath),
        derivative.data,
        { flag: "wx" }
      )
    }
    await fs.promises.writeFile(
      path.join(stagingDirectory, "gear-image-manifest.json"),
      serializeManifest(manifest),
      { flag: "wx" }
    )
    await fs.promises.rename(stagingDirectory, packageDirectory)
    return "created"
  } catch (error) {
    await fs.promises.rm(stagingDirectory, { recursive: true, force: true })
    throw error
  }
}

export async function prepareGearImage(
  options,
  { log = console.log, remoteDownload = downloadAuthorizedGearImage } = {}
) {
  validateGearImageOptions(options)
  const outputDirectory = path.resolve(process.cwd(), options.output)
  const isRemote = /^[a-z][a-z0-9+.-]*:\/\//i.test(options.source)
  let source
  if (isRemote) {
    const downloaded = await remoteDownload(
      options.source,
      options.sourceHost,
      maximumSourceBytes
    )
    source = {
      ...(await validateDecodedSource(
        downloaded.data,
        downloaded.contract,
        { size: downloaded.data.length },
        "declared type " + downloaded.contract.mimeType
      )),
      approvedHost: downloaded.approvedHost,
      originalFilename: downloaded.originalFilename,
    }
  } else {
    const sourcePath = path.resolve(process.cwd(), options.source)
    source = await readAndValidateLocalSource(sourcePath)
  }
  const derivatives = await createDerivatives(source.data)
  const manifest = createManifest(options, source, derivatives)
  const manifestValidation = validateGearImageManifest(manifest)
  if (manifestValidation.errors.length) {
    throw new Error(
      "Generated Gear image manifest is invalid:\n- " +
        manifestValidation.errors.join("\n- ")
    )
  }
  const packageDirectory = path.join(
    outputDirectory,
    options.gearId + "-" + manifest.contentHash
  )
  const status = options.dryRun
    ? "dry-run"
    : await writePackage(packageDirectory, manifest, derivatives)

  log(
    (options.dryRun
      ? "Would prepare"
      : status === "unchanged"
        ? "Already prepared"
        : "Prepared") +
      " Gear image package for " +
      options.gearId +
      "."
  )
  for (const derivative of manifest.derivatives) {
    log(
      derivative.role +
        ": " +
        derivative.width +
        "x" +
        derivative.height +
        ", " +
        derivative.byteSize +
        " bytes, " +
        derivative.relativePath
    )
  }
  log("R2 prefix reserved for later upload: " + manifest.r2Prefix)
  log("Manifest: " + path.join(packageDirectory, "gear-image-manifest.json"))
  if (!options.dryRun) {
    log(
      "No upload or canonical Gear update was performed. Receipt-backed publication remains a separate step."
    )
  }
  return { manifest, packageDirectory, status }
}
