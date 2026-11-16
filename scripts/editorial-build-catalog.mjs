import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { experienceRecords } from "../src/content/experiences/index.mjs"
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
  ATLAS_CATALOG_HEADERS,
  ATLAS_CATALOG_TITLE,
  applyAtlasCatalogMigration,
  buildAtlasCatalogMigration,
  buildBindingReport,
} from "./lib/editorial-google-catalog.mjs"
import {
  readPostsSheet,
  readSheetStructure,
  readSpreadsheetSheets,
} from "./lib/editorial-google-sheets.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

function usage() {
  return `Usage:
  npm run editorial:catalog -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--account Roam]

This command rebuilds one hidden, warning-protected Atlas Catalog from current
canonical references, adds a Journey dropdown that still permits New: values,
and writes a private Git-ignored binding report. It never writes canonical IDs
into Posts and does not publish content.`
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
    apply: false,
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsSheetId: null,
    account: "Roam",
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") {
      options.apply = true
    } else if (argument === "--oauth-client") {
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

function normalizedSource(sheet) {
  return JSON.stringify({ headers: sheet.headers, rows: sheet.rows })
}

function normalizedCatalogValues(sheet) {
  return [
    sheet.headers,
    ...sheet.rows.map(row =>
      ATLAS_CATALOG_HEADERS.map(header => String(row[header] || ""))
    ),
  ]
}

async function writeBindingReport(report) {
  const stateDirectory = path.join(projectRoot, ".state", "editorial")
  const target = path.join(stateDirectory, "bindings.json")
  const temporary = `${target}.${process.pid}.tmp`
  await fs.promises.mkdir(stateDirectory, { recursive: true })
  await fs.promises.writeFile(
    temporary,
    `${JSON.stringify(report, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  )
  await fs.promises.rename(temporary, target)
  return target
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.apply) {
    throw new Error("Catalog migration requires the explicit --apply flag")
  }
  if (options.postsSheetId === null) {
    throw new Error("Catalog migration requires --posts-gid")
  }

  const configuration = resolveGoogleConfiguration({
    options: { ...options, sheetsAccess: "write" },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration)
  const postsStructure = await readSheetStructure({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    sheetId: options.postsSheetId,
  })
  const before = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
    experiences: experienceRecords,
  })
  const baselinePlan = planBaseline({
    headers: before.headers,
    rows: before.rows,
    catalog,
    eligibleAccount: options.account,
  })
  if (baselinePlan.summary.missingPostIds) {
    throw new Error("All eligible rows require stable Post IDs first")
  }
  const existingSheets = await readSpreadsheetSheets({
    auth,
    spreadsheetId: configuration.spreadsheetId,
  })
  const migration = buildAtlasCatalogMigration({
    catalog,
    existingSheets,
    postsSheetId: postsStructure.sheetId,
    postsHeaders: before.headers,
    postsGridRowCount: postsStructure.gridProperties.rowCount,
  })
  const confirmation = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  if (normalizedSource(confirmation) !== normalizedSource(before)) {
    throw new Error(
      "Posts changed while the catalog was being prepared; rerun from a fresh baseline"
    )
  }

  await applyAtlasCatalogMigration({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: migration.requests,
  })
  const afterPosts = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  if (normalizedSource(afterPosts) !== normalizedSource(before)) {
    throw new Error("Posts values changed while writing the Atlas Catalog")
  }
  const actualCatalog = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: ATLAS_CATALOG_TITLE,
  })
  const expectedValues = migration.values.map(row =>
    row.map(value => String(value || ""))
  )
  if (
    JSON.stringify(normalizedCatalogValues(actualCatalog)) !==
    JSON.stringify(expectedValues)
  ) {
    throw new Error("Atlas Catalog readback does not match canonical records")
  }
  const sheetsAfter = await readSpreadsheetSheets({
    auth,
    spreadsheetId: configuration.spreadsheetId,
  })
  const catalogSheet = sheetsAfter.find(
    sheet => sheet.title === ATLAS_CATALOG_TITLE
  )
  if (!catalogSheet?.hidden || !catalogSheet.protectedRanges.length) {
    throw new Error("Atlas Catalog is not hidden and protected after write")
  }

  const report = buildBindingReport({ catalog, baselinePlan })
  const reportPath = await writeBindingReport(report)
  console.log(
    `Atlas Catalog verified: ${migration.summary.catalogRecords} canonical references and ${migration.summary.journeyChoices} Journey choices.`
  )
  console.log(
    `Binding report: ${report.summary.exact} exact, ${report.summary.ambiguous} ambiguous, ${report.summary.unmatched} unmatched, ${report.summary.blank} blank.`
  )
  console.log(
    `Posts canonical ID writes: none; private report: ${path.relative(projectRoot, reportPath).replace(/\\/g, "/")}`
  )
}

main().catch(error => {
  console.error(`Editorial catalog failed: ${error.message}`)
  process.exitCode = 1
})
