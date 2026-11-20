#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { prepareGearImage } from "./lib/gear-image-preparation.mjs"
import { publishGearImage } from "./publish-gear-image.mjs"

const require = createRequire(import.meta.url)
const { parseGearSource } = require("./lib/gear-ingestion.js")
const { uploadMediaPackage } = require("./upload-media.js")

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const defaultRecordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "gear",
  "generated",
  "records.json"
)
const gearIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const workflowFields = new Set([
  "schemaVersion",
  "gearId",
  "journeyId",
  "recordSource",
  "image",
])
const imageFields = new Set([
  "source",
  "sourceHost",
  "output",
  "rightsOwner",
  "rightsStatus",
  "rightsReviewed",
  "alt",
])

export function usage() {
  return `Gear authoring workflow

Usage:
  npm run gear:workflow -- --source <workflow.json> --dry-run [--through prepare|publish]
  npm run gear:workflow -- --source <workflow.json> --apply --through prepare
  npm run gear:workflow -- --source <workflow.json> --apply --through publish --approve-card [--replace-image] [--build]

The prepare checkpoint writes the canonical Gear record and deterministic local
image package. An authorized remote source performs a bounded HTTPS read. Review
those derivatives and the card context before running the publish checkpoint.
Publish requires that exact package to exist already, then reuses authenticated
immutable upload, checksum receipt, and canonical image publication.

Options:
  --source <file>    Versioned Gear workflow JSON
  --dry-run          Validate without writes; remote sources use bounded HTTPS
  --apply            Run the selected checkpoint after repeating its preview
  --through <stage>  Stop after prepare, or continue through publish
  --approve-card     Required for publish after reviewing the prepared image
  --replace-image    Explicitly approve an existing image revision replacement
  --build            Run the production build inside canonical publication
  --help, --h, -h    Show this help`
}

function readOptionValue(args, index, option) {
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(option + " requires a value\n\n" + usage())
  }
  return value
}

export function parseArguments(args) {
  const options = {
    apply: false,
    approveCard: false,
    build: false,
    dryRun: false,
    help: false,
    replaceImage: false,
    source: null,
    through: "prepare",
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") options.apply = true
    else if (argument === "--approve-card") options.approveCard = true
    else if (argument === "--build") options.build = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--replace-image") options.replaceImage = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (["--source", "--through"].includes(argument)) {
      const field = argument === "--source" ? "source" : "through"
      options[field] = readOptionValue(args, index, argument)
      index += 1
    } else {
      const match = argument.match(/^--(source|through)=(.+)$/)
      if (!match)
        throw new Error("Unknown argument: " + argument + "\n\n" + usage())
      options[match[1]] = match[2]
    }
  }
  if (options.help) return options
  if (options.apply === options.dryRun) {
    throw new Error("Choose exactly one of --dry-run or --apply")
  }
  if (!options.source) throw new Error("--source is required\n\n" + usage())
  if (!["prepare", "publish"].includes(options.through)) {
    throw new Error("--through must be prepare or publish")
  }
  if (options.apply && options.through === "publish" && !options.approveCard) {
    throw new Error(
      "Publishing requires --approve-card after prepared image review"
    )
  }
  if (
    options.approveCard &&
    (!options.apply || options.through !== "publish")
  ) {
    throw new Error(
      "--approve-card is valid only with --apply --through publish"
    )
  }
  if (options.replaceImage && options.through !== "publish") {
    throw new Error("--replace-image requires --through publish")
  }
  if (options.build && (!options.apply || options.through !== "publish")) {
    throw new Error("--build requires --apply --through publish")
  }
  return options
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(
      label + " must be nonempty text without surrounding whitespace"
    )
  }
  return value
}

function assertKnownFields(value, allowed, label) {
  Object.keys(value).forEach(field => {
    if (!allowed.has(field))
      throw new Error(label + ' has unknown field "' + field + '"')
  })
}

export async function loadWorkflow(sourceFile) {
  const workflowFile = path.resolve(process.cwd(), sourceFile)
  let workflow
  try {
    workflow = JSON.parse(await fs.promises.readFile(workflowFile, "utf8"))
  } catch (error) {
    throw new Error("Gear workflow cannot be read as JSON: " + error.message)
  }
  if (!workflow || Array.isArray(workflow) || typeof workflow !== "object") {
    throw new Error("Gear workflow must be a JSON object")
  }
  assertKnownFields(workflow, workflowFields, "Gear workflow")
  if (workflow.schemaVersion !== 1) {
    throw new Error("Gear workflow schemaVersion must be 1")
  }
  const gearId = requireText(workflow.gearId, "gearId")
  if (!gearIdPattern.test(gearId)) {
    throw new Error("gearId must be lowercase ASCII kebab-case")
  }
  const journeyId = requireText(workflow.journeyId, "journeyId")
  const baseDirectory = path.dirname(workflowFile)
  const recordSource = path.resolve(
    baseDirectory,
    requireText(workflow.recordSource, "recordSource")
  )
  const recordContents = await fs.promises
    .readFile(recordSource, "utf8")
    .catch(error => {
      throw new Error("recordSource cannot be read: " + error.message)
    })
  const recordDocument = parseGearSource(recordContents, recordSource)
  if (
    !Array.isArray(recordDocument.items) ||
    recordDocument.items.length !== 1
  ) {
    throw new Error(
      "recordSource must contain exactly one Gear item for this workflow"
    )
  }
  if (recordDocument.items[0]?.gearId !== gearId) {
    throw new Error("recordSource gearId must match the workflow gearId")
  }
  if (recordDocument.journeyId && recordDocument.journeyId !== journeyId) {
    throw new Error("recordSource journeyId must match the workflow journeyId")
  }
  if (
    !workflow.image ||
    Array.isArray(workflow.image) ||
    typeof workflow.image !== "object"
  ) {
    throw new Error("image must be a Gear image workflow object")
  }
  assertKnownFields(workflow.image, imageFields, "image")
  const imageSource = requireText(workflow.image.source, "image.source")
  const remoteImageSource = /^[a-z][a-z0-9+.-]*:\/\//i.test(imageSource)
  const image = {
    alt: requireText(workflow.image.alt, "image.alt"),
    output: path.resolve(
      baseDirectory,
      requireText(workflow.image.output, "image.output")
    ),
    rightsOwner: requireText(workflow.image.rightsOwner, "image.rightsOwner"),
    rightsReviewed: workflow.image.rightsReviewed,
    rightsStatus: requireText(
      workflow.image.rightsStatus,
      "image.rightsStatus"
    ),
    source: remoteImageSource
      ? imageSource
      : path.resolve(baseDirectory, imageSource),
    sourceHost: remoteImageSource
      ? requireText(workflow.image.sourceHost, "image.sourceHost")
      : null,
  }
  if (image.rightsReviewed !== true) {
    throw new Error("image.rightsReviewed must be true")
  }
  if (image.rightsStatus !== "owned") {
    throw new Error(
      "image.rightsStatus must be owned for the creator-owned image workflow"
    )
  }
  if (!remoteImageSource && workflow.image.sourceHost !== undefined) {
    throw new Error("image.sourceHost is valid only with a remote HTTPS source")
  }
  return {
    gearId,
    image,
    journeyId,
    recordSource,
    workflowFile,
  }
}

function runProcess(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  return { passed: result.status === 0 }
}

function ingestArguments(workflow, dryRun) {
  return [
    path.join(projectRoot, "scripts", "ingest-gear.js"),
    "--journey",
    workflow.journeyId,
    "--source",
    workflow.recordSource,
    ...(dryRun ? ["--dry-run"] : []),
  ]
}

export async function runGearWorkflow(options, dependencies = {}) {
  const workflow = await (dependencies.loadWorkflow || loadWorkflow)(
    options.source
  )
  const recordsFile = dependencies.recordsFile || defaultRecordsFile
  const runCommand = dependencies.runCommand || runProcess
  const prepareImage = dependencies.prepareImage || prepareGearImage
  const uploadPackage = dependencies.uploadPackage || uploadMediaPackage
  const publishImage = dependencies.publishImage || publishGearImage
  const log = dependencies.log || console.log
  const imageOptions = {
    ...workflow.image,
    apply: false,
    dryRun: true,
    gearId: workflow.gearId,
  }

  log("Previewing canonical Gear record")
  const recordPreview = await runCommand(
    process.execPath,
    ingestArguments(workflow, true)
  )
  if (!recordPreview.passed) throw new Error("Gear record preview failed")
  log("Previewing deterministic Gear image package")
  const imagePreview = await prepareImage(imageOptions)
  const manifestFile = path.join(
    imagePreview.packageDirectory,
    "gear-image-manifest.json"
  )
  const receiptFile = path.join(
    imagePreview.packageDirectory,
    "gear-r2-verification.json"
  )

  if (options.dryRun) {
    log(
      "Dry run complete. No files were written and no network request was made."
    )
    if (options.through === "publish") {
      log(
        "Publish remains gated on an applied package, local review, upload credentials, and --approve-card."
      )
    }
    return {
      imagePreview,
      manifestFile,
      receiptFile,
      stage: "preview",
      workflow,
    }
  }

  const packageExisted = fs.existsSync(manifestFile)
  if (options.through === "publish" && !packageExisted) {
    throw new Error(
      "Publish requires the already prepared package at " +
        manifestFile +
        ". Run --apply --through prepare, review it, then publish."
    )
  }
  const previousRecords = await fs.promises.readFile(recordsFile, "utf8")
  let uploadCompleted = false
  try {
    log("Applying canonical Gear record")
    const recordApply = await runCommand(
      process.execPath,
      ingestArguments(workflow, false)
    )
    if (!recordApply.passed) throw new Error("Gear record apply failed")
    log("Applying deterministic Gear image package")
    const prepared = await prepareImage({
      ...imageOptions,
      apply: true,
      dryRun: false,
    })
    if (options.through === "prepare") {
      log(
        "Prepare checkpoint complete. Review the local derivatives before publication."
      )
      return { manifestFile, prepared, receiptFile, stage: "prepare", workflow }
    }

    log("Uploading reviewed immutable Gear image objects")
    await uploadPackage({
      dryRun: false,
      endpoint: process.env.MEDIA_UPLOAD_WORKER_URL || "",
      gear: true,
      manifestFile,
      receiptFile,
      token: process.env.MEDIA_UPLOAD_TOKEN || "",
    })
    uploadCompleted = true
    log("Publishing the checksum-verified canonical Gear image")
    const publication = await publishImage({
      apply: true,
      approveCard: true,
      build: options.build,
      dryRun: false,
      gearId: workflow.gearId,
      manifest: manifestFile,
      receipt: receiptFile,
      replaceImage: options.replaceImage,
    })
    log("Gear publish checkpoint complete.")
    return {
      manifestFile,
      publication,
      receiptFile,
      stage: "publish",
      workflow,
    }
  } catch (error) {
    await fs.promises.writeFile(recordsFile, previousRecords, "utf8")
    const remoteNote = uploadCompleted
      ? " Uploaded objects are immutable and were not deleted; rerun after correcting the canonical publication issue."
      : ""
    throw new Error(
      error.message + "; canonical Gear records were restored." + remoteNote
    )
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  await runGearWorkflow(options)
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
