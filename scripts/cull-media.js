const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { pathToFileURL } = require("url")
const {
  serializeMediaRecords,
  validateGeneratedRecords,
} = require("./lib/media-ingestion.js")
const {
  planMediaCull,
  replaceFileAtomically,
} = require("./lib/media-culling.js")

const projectRoot = path.resolve(__dirname, "..")
const defaultRecordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "media",
  "generated",
  "records.json"
)
const testRecordsFile = process.env.MEDIA_CULL_RECORDS_FILE
const recordsFile = testRecordsFile
  ? path.resolve(testRecordsFile)
  : defaultRecordsFile

if (testRecordsFile && process.env.NODE_ENV !== "test") {
  throw new Error("MEDIA_CULL_RECORDS_FILE is available only during tests")
}

function usage() {
  return `Journey media culling

Usage:
  npm run media:cull -- --asset-id <id> --dry-run
  npm run media:cull -- --asset-id <id> --apply

Direct usage:
  node scripts/cull-media.js --asset-id <id> --dry-run
  node scripts/cull-media.js --asset-id <id> --apply

Options:
  --asset-id <id>   Generated Media asset ID to remove from public placements
  --dry-run         Report affected placements without writing
  --apply           Atomically change published placements to draft
  --help, --h, -h   Show this help

Behavior:
  The Media asset, publication batch, and R2 object are preserved. Every
  generated published placement for the asset becomes draft. Already drafted
  assets are a successful no-op. Applying validates canonical content and
  rolls back the generated registry if validation fails. Curated Journey or
  Visit hero/gallery references are not changed by this command.`
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
    apply: false,
    assetId: "",
    dryRun: false,
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") options.apply = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (argument === "--asset-id") {
      options.assetId = readValue(args, index, "--asset-id")
      index += 1
    } else if (argument.startsWith("--asset-id=")) {
      options.assetId = argument.slice("--asset-id=".length)
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }

  if (options.help) return options
  if (!options.assetId) {
    throw new Error(`--asset-id is required\n\n${usage()}`)
  }
  if (options.apply === options.dryRun) {
    throw new Error("Choose exactly one of --dry-run or --apply")
  }

  return options
}

function readRecords() {
  let contents
  try {
    contents = fs.readFileSync(recordsFile, "utf8")
  } catch (error) {
    throw new Error(
      `Generated Media records cannot be read at ${recordsFile}: ${error.message}`
    )
  }

  try {
    return JSON.parse(contents.replace(/^\uFEFF/, ""))
  } catch (error) {
    throw new Error(`Generated Media records are not valid JSON: ${error.message}`)
  }
}

function runContentValidation() {
  const result = spawnSync(process.execPath, ["scripts/validate-content.js"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`Content validation exited with ${result.status}`)
  }
}

async function importContent(relativePath) {
  return import(pathToFileURL(path.join(projectRoot, relativePath)).href)
}

function placementScope(placement) {
  if (placement.placeId && placement.visitId) {
    return `${placement.placeId} / ${placement.visitId}`
  }
  return "Journey gallery"
}

function printPlan(plan) {
  console.log(`Asset: ${plan.asset.id}`)
  console.log(`Kind: ${plan.asset.kind}`)
  console.log(`Object: ${plan.asset.source?.objectKey || "(unknown)"}`)
  console.log(`Placements: ${plan.placements.length}`)
  plan.placements.forEach(placement => {
    const nextVisibility =
      placement.visibility === "published" ? "draft" : placement.visibility
    console.log(
      `- ${placement.id}\n  ${placement.visibility} -> ${nextVisibility}\n  ${placement.journeyId} / ${placementScope(placement)}`
    )
  })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const currentRecords = readRecords()
  const [journeyModule, mediaModule] = await Promise.all([
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/media/index.mjs"),
  ])
  const generatedIds = new Set(
    (currentRecords.assets || []).map(asset => asset.id)
  )
  const context = {
    journeys: journeyModule.journeyRecords,
    staticMedia: mediaModule.mediaRecords.filter(
      asset => !generatedIds.has(asset.id)
    ),
  }
  const currentValidation = validateGeneratedRecords(currentRecords, context)
  if (currentValidation.errors.length) {
    throw new Error(
      `Generated Media records are invalid:\n- ${currentValidation.errors.join("\n- ")}`
    )
  }

  const plan = planMediaCull(currentRecords, options.assetId)
  if (plan.errors.length) {
    throw new Error(`Media cull rejected:\n- ${plan.errors.join("\n- ")}`)
  }
  const nextValidation = validateGeneratedRecords(plan.records, context)
  if (nextValidation.errors.length) {
    throw new Error(
      `Media cull rejected:\n- ${nextValidation.errors.join("\n- ")}`
    )
  }

  printPlan(plan)
  if (options.dryRun) {
    console.log("Dry run complete; generated content was not changed.")
    return
  }
  if (!plan.changed) {
    console.log("No changes were necessary; every placement is already draft.")
    return
  }

  await replaceFileAtomically(
    recordsFile,
    serializeMediaRecords(plan.records),
    async () => {
      if (process.env.NODE_ENV !== "test") runContentValidation()
    }
  )
  console.log(
    `Culled ${plan.changedPlacements.length} placement(s) for ${plan.asset.id}.`
  )
  console.log(`Updated ${path.relative(projectRoot, recordsFile)}.`)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
