import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  buildCanonicalCatalog,
  planBaseline,
} from "./lib/editorial-baseline.mjs"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  readPostsSheet,
  readSheetStructure,
} from "./lib/editorial-google-sheets.mjs"
import {
  buildPlaceSuggestionReport,
  formatPlaceSuggestionCsv,
} from "./lib/editorial-place-suggestions.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const reportPath = path.join(
  projectRoot,
  ".state",
  "editorial",
  "place-suggestions.json"
)
const reviewPath = path.join(
  projectRoot,
  ".state",
  "editorial",
  "place-suggestions.csv"
)

function usage() {
  return `Usage:
  npm run editorial:suggest:places -- --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--account Roam]

This command reads the designated Posts tab and writes one private local Place
suggestion report. It constrains candidates by the approved Journey, geography,
and explicit Place names already present in row text. Every result remains a
review suggestion. It never writes the Sheet or publishes content.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseArgs(args) {
  const options = {
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsSheetId: null,
    account: "Roam",
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--oauth-client") {
      options.oauthClientPath = readValue(args, index, "--oauth-client")
      index += 1
    } else if (argument.startsWith("--oauth-client=")) {
      options.oauthClientPath = argument.slice("--oauth-client=".length)
    } else if (argument === "--token-path") {
      options.tokenPath = readValue(args, index, "--token-path")
      index += 1
    } else if (argument.startsWith("--token-path=")) {
      options.tokenPath = argument.slice("--token-path=".length)
    } else if (argument === "--spreadsheet-id") {
      options.spreadsheetId = readValue(args, index, "--spreadsheet-id")
      index += 1
    } else if (argument.startsWith("--spreadsheet-id=")) {
      options.spreadsheetId = argument.slice("--spreadsheet-id=".length)
    } else if (argument === "--posts-gid") {
      options.postsSheetId = readValue(args, index, "--posts-gid")
      index += 1
    } else if (argument.startsWith("--posts-gid=")) {
      options.postsSheetId = argument.slice("--posts-gid=".length)
    } else if (argument === "--account") {
      options.account = readValue(args, index, "--account")
      index += 1
    } else if (argument.startsWith("--account=")) {
      options.account = argument.slice("--account=".length)
    } else if (argument === "--help" || argument === "-h") {
      options.help = true
    } else {
      throw new Error(`Unknown option: ${argument}`)
    }
  }
  return options
}

async function writePrivateFile(target, contents) {
  const temporary = `${target}.${process.pid}.tmp`
  await fs.promises.writeFile(temporary, contents, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })
  await fs.promises.rename(temporary, target)
}

async function writeReport(report) {
  const stateDirectory = path.dirname(reportPath)
  await fs.promises.mkdir(stateDirectory, { recursive: true })
  await writePrivateFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  await writePrivateFile(reviewPath, formatPlaceSuggestionCsv(report))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (options.postsSheetId === null) {
    throw new Error("Place suggestions require --posts-gid")
  }

  const configuration = resolveGoogleConfiguration({
    options: { ...options, sheetsAccess: "readonly" },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration)
  const structure = await readSheetStructure({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    sheetId: options.postsSheetId,
  })
  const sheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
  })
  const baselinePlan = planBaseline({
    headers: sheet.headers,
    rows: sheet.rows,
    catalog,
    eligibleAccount: options.account,
  })
  if (baselinePlan.summary.missingPostIds) {
    throw new Error("All eligible rows require stable Post IDs first")
  }
  const report = buildPlaceSuggestionReport({
    rows: sheet.rows,
    baselinePlan,
    journeys: journeyRecords,
    places: placeRecords,
  })
  await writeReport(report)

  console.log("Editorial Place suggestions (read-only)")
  console.log(
    `Rows: ${report.summary.unresolvedRows} unresolved, ${report.summary.alreadyBound} already bound, ${report.summary.reviewRequiredRows} still require review`
  )
  console.log(
    `Signals: ${report.summary.strongTextSuggestions} rows have a unique explicit Place-name match; ${report.summary.rowsWithoutCandidates} have no Journey candidates`
  )
  report.groups.forEach(group => {
    console.log(
      `${group.locationInput} / ${group.journeyLabel}: ${group.rowCount} rows, ${group.candidatePlaceIds.length} candidates, ${group.strongTextSuggestions} strong text suggestions`
    )
  })
  console.log(`Private report: ${reportPath}`)
  console.log(`Review CSV: ${reviewPath}`)
  console.log("Remote changes: none")
}

main().catch(error => {
  console.error(`Editorial Place suggestions failed: ${error.message}`)
  process.exitCode = 1
})
