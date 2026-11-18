import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import { readNamedSheet } from "./lib/editorial-google-sheets.mjs"

const require = createRequire(import.meta.url)
const {
  planGearSheetIngestion,
} = require("./lib/gear-tracking-sheet.js")
const {
  serializeGearRecords,
  validateGearRecords,
} = require("./lib/gear-ingestion.js")

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const recordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "gear",
  "generated",
  "records.json"
)

function usage() {
  return `Google Sheet Gear ingestion

Usage:
  npm run gear:sheet -- --oauth-client <path> --spreadsheet-id <id> [--gear-range Gear]
  npm run gear:sheet -- --apply --oauth-client <path> --spreadsheet-id <id> [--gear-range Gear] [--build]

Default preview reads rows whose Workflow is Preview or Publish and never writes.
--apply reads only Publish rows, updates the canonical Gear registry, validates
content, and writes Published plus verification metadata back to the Sheet.

Options:
  --apply                 Apply Publish rows and write results back to the Sheet
  --build                 Run the production build after a successful apply
  --oauth-client <path>   Google desktop OAuth client JSON outside the repository
  --spreadsheet-id <id>   Google Sheet ID
  --gear-range <name>     Gear tab name (default: Gear)
  --token-path <path>     Optional OAuth token path outside the repository
  --reauthorize           Deliberately replace the saved Google authorization
  --help, --h, -h         Show this help`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseArguments(args) {
  const options = {
    apply: false,
    build: false,
    gearRange: "Gear",
    help: false,
    oauthClientPath: null,
    reauthorize: false,
    spreadsheetId: null,
    tokenPath: null,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") options.apply = true
    else if (argument === "--build") options.build = true
    else if (argument === "--reauthorize") options.reauthorize = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (argument === "--oauth-client") {
      options.oauthClientPath = readValue(args, index, argument)
      index += 1
    } else if (argument.startsWith("--oauth-client=")) {
      options.oauthClientPath = argument.slice("--oauth-client=".length)
    } else if (argument === "--spreadsheet-id") {
      options.spreadsheetId = readValue(args, index, argument)
      index += 1
    } else if (argument.startsWith("--spreadsheet-id=")) {
      options.spreadsheetId = argument.slice("--spreadsheet-id=".length)
    } else if (argument === "--gear-range") {
      options.gearRange = readValue(args, index, argument)
      index += 1
    } else if (argument.startsWith("--gear-range=")) {
      options.gearRange = argument.slice("--gear-range=".length)
    } else if (argument === "--token-path") {
      options.tokenPath = readValue(args, index, argument)
      index += 1
    } else if (argument.startsWith("--token-path=")) {
      options.tokenPath = argument.slice("--token-path=".length)
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }
  if (options.build && !options.apply) {
    throw new Error("--build requires --apply")
  }
  return options
}

async function importContent(relativePath) {
  return import(pathToFileURL(path.join(projectRoot, relativePath)).href)
}

async function loadContext() {
  const [journeyModule, mediaModule, partnerModule] = await Promise.all([
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/media/index.mjs"),
    importContent("src/content/partners/index.mjs"),
  ])
  return {
    approvedGearTrackingRulePartnerIds: [],
    journeys: journeyModule.journeyRecords,
    media: mediaModule.mediaRecords,
    partners: partnerModule.partnerRecords,
  }
}

async function loadRecords() {
  const contents = await fs.promises.readFile(recordsFile, "utf8")
  try {
    return { contents, records: JSON.parse(contents) }
  } catch (error) {
    throw new Error(`Generated Gear records are invalid JSON: ${error.message}`)
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

function columnLetter(index) {
  let value = index + 1
  let result = ""
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`
}

export function buildGearWriteback({ headers, rows, gearRange, updatedAt }) {
  const fields = {
    Workflow: "Published",
    "Automation Status": "Applied",
    "Last Error": "",
    "Processed Hash": entry => entry.hash,
    "Updated At": updatedAt,
  }
  return rows.flatMap(entry =>
    Object.entries(fields).map(([header, rawValue]) => {
      const index = headers.indexOf(header)
      if (index < 0) throw new Error(`Gear sheet is missing column: ${header}`)
      const value = typeof rawValue === "function" ? rawValue(entry) : rawValue
      return {
        range: `${quoteSheetName(gearRange)}!${columnLetter(index)}${entry.rowNumber}`,
        values: [[value]],
      }
    })
  )
}

async function applyGearWriteback({ auth, spreadsheetId, data }) {
  if (!data.length) return
  await auth.request({
    method: "POST",
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    data: {
      data,
      includeValuesInResponse: false,
      valueInputOption: "RAW",
    },
  })
}

function printMessages(label, messages) {
  if (!messages.length) return
  console.log(`\n${label}:`)
  messages.forEach(message => console.log(`- ${message}`))
}

function printPlan(plan, apply) {
  const prefix = apply ? "Will" : "Would"
  console.log("\nGear Sheet ingestion plan")
  console.log(`Selected rows: ${plan.selectedCount}`)
  console.log(`${prefix} create gear: ${plan.summary.created.length}`)
  console.log(`${prefix} update gear: ${plan.summary.updated.length}`)
  console.log(`${prefix} link usage: ${plan.summary.linked.length}`)
  console.log(`${prefix} update usage: ${plan.summary.usageUpdated.length}`)
  console.log(`Unchanged gear inputs: ${plan.summary.unchanged.length}`)
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  const configuration = resolveGoogleConfiguration({
    options: {
      driveScope: "selected",
      oauthClientPath: options.oauthClientPath,
      postsRange: options.gearRange,
      sheetsAccess: options.apply ? "write" : "readonly",
      spreadsheetId: options.spreadsheetId,
      tokenPath: options.tokenPath,
    },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration, {
    forceReauthorize: options.reauthorize,
  })
  const [{ contents: previousContents, records }, context, sheet] =
    await Promise.all([
      loadRecords(),
      loadContext(),
      readNamedSheet({
        auth,
        spreadsheetId: configuration.spreadsheetId,
        range: options.gearRange,
        sheetLabel: "Gear",
      }),
    ])
  const existingValidation = validateGearRecords(records, context)
  if (existingValidation.errors.length) {
    throw new Error(
      `Existing generated Gear data is invalid:\n- ${existingValidation.errors.join("\n- ")}`
    )
  }
  const plan = planGearSheetIngestion({
    context,
    mode: options.apply ? "apply" : "preview",
    records,
    sheet,
  })
  printMessages("Warnings", plan.warnings)
  printMessages("Errors", plan.errors)
  printPlan(plan, options.apply)
  if (plan.errors.length) {
    process.exitCode = 1
    return
  }
  if (!plan.selectedCount) {
    console.log(
      options.apply
        ? "\nNo Publish rows are selected."
        : "\nNo Preview or Publish rows are selected."
    )
    return
  }
  if (!options.apply) {
    console.log("\nPreview complete; no repository or Sheet values were changed.")
    return
  }

  let repositoryChanged = false
  try {
    if (plan.changed) {
      await replaceFileAtomically(recordsFile, serializeGearRecords(plan.records))
      repositoryChanged = true
      const validationPassed = runCommand(
        process.execPath,
        [path.join(projectRoot, "scripts", "validate-content.js")],
        "Validating canonical content"
      )
      if (!validationPassed) {
        throw new Error("Content validation failed")
      }
      if (options.build) {
        const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
        const buildPassed = runCommand(
          npmCommand,
          ["run", "build"],
          "Building site"
        )
        if (!buildPassed) throw new Error("Production build failed")
      }
    }

    const writeback = buildGearWriteback({
      gearRange: options.gearRange,
      headers: sheet.headers,
      rows: plan.successfulRows,
      updatedAt: new Date().toISOString(),
    })
    await applyGearWriteback({
      auth,
      data: writeback,
      spreadsheetId: configuration.spreadsheetId,
    })
  } catch (error) {
    if (repositoryChanged) {
      await replaceFileAtomically(recordsFile, previousContents)
    }
    throw new Error(
      `Gear Sheet publication failed and repository data was restored: ${error.message}`
    )
  }

  console.log("\nGear Sheet ingestion complete.")
  console.log(`Applied rows: ${plan.successfulRows.length}`)
  console.log(`Generated file: ${path.relative(projectRoot, recordsFile)}`)
  console.log("Sheet writeback: Published with processed hash and timestamp")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
