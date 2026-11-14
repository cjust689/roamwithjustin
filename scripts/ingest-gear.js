const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { pathToFileURL } = require("url")
const {
  parseGearSource,
  planGearIngestion,
  serializeGearRecords,
  validateGearRecords,
} = require("./lib/gear-ingestion.js")

const projectRoot = path.resolve(__dirname, "..")
const recordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "gear",
  "generated",
  "records.json"
)

function usage() {
  return `Gear ingestion

Usage:
  npm run gear:ingest -- --journey <journey-id> --source <file> [--dry-run] [--build]
  npm run gear:list -- [--query <text>]
  npm run gear:journeys
  npm run gear:validate

Direct usage:
  node scripts/ingest-gear.js --journey <journey-id> --source <file> [--dry-run] [--build]
  node scripts/ingest-gear.js --list [--query <text>]
  node scripts/ingest-gear.js --journeys

Options:
  --journey <id>   Explicit canonical Journey scope and source-file guard
  --source <file>  Constrained Markdown or strict JSON gear input
  --dry-run        Validate and print the upsert plan without writing
  --build          Run the production build after applying and validating
  --list           List canonical Gear IDs and usage counts
  --journeys       List canonical Journey IDs accepted by --journey
  --query <text>   Filter --list by ID, name, brand, model, or alias
  --help, --h, -h  Show this help

Safety:
  The command only writes src/content/gear/generated/records.json. It never
  uploads media, edits Journey narratives, invents IDs, or deletes omitted
  records. Repeating identical input is a no-op.`
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
    build: false,
    dryRun: false,
    help: false,
    journey: null,
    journeys: false,
    list: false,
    query: "",
    source: null,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === "--build") options.build = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--list") options.list = true
    else if (argument === "--journeys") options.journeys = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (argument === "--journey") {
      options.journey = readValue(args, index, "--journey")
      index += 1
    } else if (argument.startsWith("--journey=")) {
      options.journey = argument.slice("--journey=".length)
    } else if (argument === "--source") {
      options.source = readValue(args, index, "--source")
      index += 1
    } else if (argument.startsWith("--source=")) {
      options.source = argument.slice("--source=".length)
    } else if (argument === "--query") {
      options.query = readValue(args, index, "--query")
      index += 1
    } else if (argument.startsWith("--query=")) {
      options.query = argument.slice("--query=".length)
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }

  if (options.help) return options
  if (options.list || options.journeys) {
    if (options.list && options.journeys) {
      throw new Error("Choose either --list or --journeys")
    }
    if (options.journey || options.source || options.dryRun || options.build) {
      throw new Error("Listing cannot be combined with ingestion options")
    }
    if (options.journeys && options.query) {
      throw new Error("--query can only be used with --list")
    }
    return options
  }
  if (!options.journey || !options.source) {
    throw new Error(`Ingestion requires --journey and --source\n\n${usage()}`)
  }

  return options
}

async function importContent(relativePath) {
  return import(pathToFileURL(path.join(projectRoot, relativePath)).href)
}

async function loadContext() {
  const [journeyModule, mediaModule] = await Promise.all([
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/media/index.mjs"),
  ])

  return {
    journeys: journeyModule.journeyRecords,
    media: mediaModule.mediaRecords,
  }
}

async function loadRecords() {
  const contents = await fs.promises.readFile(recordsFile, "utf8")
  try {
    return { contents, records: JSON.parse(contents) }
  } catch (error) {
    throw new Error(`Generated gear records are invalid JSON: ${error.message}`)
  }
}

async function removeIfPresent(file) {
  try {
    await fs.promises.unlink(file)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}

async function replaceFileAtomically(file, contents) {
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`
  const backup = `${file}.backup-${process.pid}-${Date.now()}`
  try {
    await fs.promises.writeFile(temporary, contents, "utf8")
    await fs.promises.rename(file, backup)
    await fs.promises.rename(temporary, file)
  } catch (error) {
    try {
      await fs.promises.rename(backup, file)
    } catch (restoreError) {
      if (restoreError.code !== "ENOENT") throw restoreError
    }
    await removeIfPresent(temporary)
    throw error
  }

  await removeIfPresent(temporary)
  await fs.promises.unlink(backup)
}

function runCommand(command, args, label) {
  console.log(`\n${label}...`)
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  return result.status === 0
}

function printMessages(label, messages) {
  if (!messages.length) return
  console.log(`\n${label}:`)
  messages.forEach(message => console.log(`- ${message}`))
}

function printPlan(plan, dryRun) {
  const prefix = dryRun ? "Would" : "Will"
  console.log("\nGear ingestion plan")
  console.log(`${prefix} create gear: ${plan.summary.created.length}`)
  console.log(`${prefix} update gear: ${plan.summary.updated.length}`)
  console.log(`${prefix} link usage: ${plan.summary.linked.length}`)
  console.log(`${prefix} update usage: ${plan.summary.usageUpdated.length}`)
  console.log(`Unchanged gear inputs: ${plan.summary.unchanged.length}`)
  console.log(`Skipped inputs: ${plan.summary.skipped.length}`)
  ;[
    ["Create", plan.summary.created],
    ["Update", plan.summary.updated],
    ["Link", plan.summary.linked],
    ["Update usage", plan.summary.usageUpdated],
  ].forEach(([label, values]) => {
    if (values.length) console.log(`${label}: ${values.join(", ")}`)
  })
}

function listGear(records, query) {
  const normalizedQuery = query.trim().toLowerCase()
  const usageCounts = new Map()
  records.usage.forEach(usage => {
    usageCounts.set(usage.gearId, (usageCounts.get(usage.gearId) || 0) + 1)
  })
  const items = records.items.filter(item => {
    if (!normalizedQuery) return true
    return [item.id, item.name, item.brand, item.model, ...(item.aliases || [])]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(normalizedQuery))
  })

  if (!items.length) {
    console.log(
      normalizedQuery
        ? `No canonical gear matches "${query}".`
        : "The canonical Gear registry is empty."
    )
    return
  }

  items.forEach(item => {
    console.log(
      `${item.id}\t${item.name}\t${item.category}\t${item.verificationStatus}\t${usageCounts.get(item.id) || 0} usage record(s)`
    )
  })
}

function listJourneys(journeys) {
  journeys.forEach(journey => {
    console.log(`${journey.id}\t${journey.title}\t/trips/${journey.slug}`)
  })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const [{ contents: previousContents, records }, context] = await Promise.all([
    loadRecords(),
    loadContext(),
  ])
  const existingValidation = validateGearRecords(records, context)
  if (existingValidation.errors.length) {
    throw new Error(
      `Existing generated gear data is invalid:\n- ${existingValidation.errors.join("\n- ")}`
    )
  }

  if (options.list) {
    listGear(records, options.query)
    return
  }
  if (options.journeys) {
    listJourneys(context.journeys)
    return
  }

  const sourceFile = path.resolve(process.cwd(), options.source)
  const sourceContents = await fs.promises.readFile(sourceFile, "utf8")
  const document = parseGearSource(sourceContents, sourceFile)
  const plan = planGearIngestion({
    document,
    journeyId: options.journey,
    records,
    context,
  })

  printMessages("Warnings", plan.warnings)
  printMessages("Errors", plan.errors)
  printPlan(plan, options.dryRun)

  if (plan.errors.length) {
    process.exitCode = 1
    return
  }
  if (options.dryRun) {
    console.log("\nDry run complete; no files were written.")
    return
  }
  if (!plan.changed) {
    console.log("\nNo changes; generated Gear data is already current.")
    return
  }

  await replaceFileAtomically(recordsFile, serializeGearRecords(plan.records))
  const validationPassed = runCommand(
    process.execPath,
    [path.join(projectRoot, "scripts", "validate-content.js")],
    "Validating canonical content"
  )

  if (!validationPassed) {
    await replaceFileAtomically(recordsFile, previousContents)
    throw new Error(
      "Content validation failed; generated Gear data was restored"
    )
  }

  if (options.build) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
    const buildPassed = runCommand(
      npmCommand,
      ["run", "build"],
      "Building site"
    )
    if (!buildPassed) {
      await replaceFileAtomically(recordsFile, previousContents)
      throw new Error("Build failed; generated Gear data was restored")
    }
  }

  console.log("\nGear ingestion complete.")
  console.log(`Created: ${plan.summary.created.length}`)
  console.log(`Updated: ${plan.summary.updated.length}`)
  console.log(`Linked: ${plan.summary.linked.length}`)
  console.log(`Usage updated: ${plan.summary.usageUpdated.length}`)
  console.log(`Unchanged: ${plan.summary.unchanged.length}`)
  console.log(`Generated file: ${path.relative(projectRoot, recordsFile)}`)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
