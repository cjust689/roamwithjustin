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
import { buildExactPlaceBindingMigration } from "./lib/editorial-google-bindings.mjs"
import { buildBindingReport } from "./lib/editorial-google-catalog.mjs"
import {
  applyPostsMigration,
  originalFieldSnapshot,
} from "./lib/editorial-google-migration.mjs"
import {
  readPostsSheet,
  readSheetStructure,
} from "./lib/editorial-google-sheets.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const bindingReportPath = path.join(
  projectRoot,
  ".state",
  "editorial",
  "bindings.json"
)

function usage() {
  return `Usage:
  npm run editorial:bind:places -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> --mapping "Location=place-id" [--mapping "Location=place-id"]

This command writes only creator-approved exact place_id bindings. It requires
the private reviewed binding report, keys writes by stable post_id and source
hash, rejects conflicts, re-reads before one atomic batch, and verifies all
other rows and creator-owned fields remain unchanged.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseMapping(value) {
  const separator = value.indexOf("=")
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`Invalid mapping "${value}"; use Location=place-id`)
  }
  return {
    locationInput: value.slice(0, separator).trim(),
    placeId: value.slice(separator + 1).trim(),
  }
}

function parseArgs(args) {
  const options = {
    apply: false,
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsSheetId: null,
    account: "Roam",
    mappings: [],
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
    } else if (argument === "--mapping") {
      options.mappings.push(parseMapping(readValue(args, index, "--mapping")))
      index += 1
    } else if (argument.startsWith("--mapping=")) {
      options.mappings.push(parseMapping(argument.slice("--mapping=".length)))
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

async function writeBindingReport(report) {
  const temporary = `${bindingReportPath}.${process.pid}.tmp`
  await fs.promises.writeFile(
    temporary,
    `${JSON.stringify(report, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  )
  await fs.promises.rename(temporary, bindingReportPath)
}

function verifyBindings({ before, after, migration }) {
  if (
    JSON.stringify(originalFieldSnapshot(after.rows)) !==
    JSON.stringify(originalFieldSnapshot(before.rows))
  ) {
    throw new Error("An original creator-owned field changed during binding")
  }
  const expectedByPostId = new Map(
    migration.assignments.map(assignment => [
      assignment.postId,
      assignment.placeId,
    ])
  )
  const beforeByPostId = new Map(
    before.rows.map(row => [row.post_id, String(row.place_id || "")])
  )
  let verified = 0
  after.rows.forEach(row => {
    const expected = expectedByPostId.get(row.post_id)
    if (expected) {
      if (row.place_id !== expected) {
        throw new Error(`place_id verification failed for ${row.post_id}`)
      }
      verified += 1
    } else if (String(row.place_id || "") !== beforeByPostId.get(row.post_id)) {
      throw new Error(`Unapproved place_id changed for ${row.post_id}`)
    }
  })
  if (verified !== migration.assignments.length) {
    throw new Error("Not every approved place_id assignment was verified")
  }
  return verified
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.apply) {
    throw new Error("Place binding requires the explicit --apply flag")
  }
  if (options.postsSheetId === null) {
    throw new Error("Place binding requires --posts-gid")
  }
  if (!options.mappings.length) {
    throw new Error("Place binding requires at least one --mapping")
  }

  const bindingReport = JSON.parse(
    await fs.promises.readFile(bindingReportPath, "utf8")
  )
  const configuration = resolveGoogleConfiguration({
    options: { ...options, sheetsAccess: "write" },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration)
  const structure = await readSheetStructure({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    sheetId: options.postsSheetId,
  })
  const before = await readPostsSheet({
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
    headers: before.headers,
    rows: before.rows,
    catalog,
    eligibleAccount: options.account,
  })
  const currentReport = buildBindingReport({ catalog, baselinePlan })
  if (currentReport.catalogHash !== bindingReport.catalogHash) {
    throw new Error("Canonical catalog changed after binding review")
  }
  const migration = buildExactPlaceBindingMigration({
    sheetId: structure.sheetId,
    headers: before.headers,
    rows: before.rows,
    baselinePlan,
    bindingReport,
    approvedMappings: options.mappings,
  })
  console.log(
    `Approved Place binding plan: ${migration.summary.assignments} writes across ${migration.summary.approvedMappingGroups} mapping groups; ${migration.summary.alreadyApplied} already applied.`
  )
  if (!migration.requests.length) {
    console.log(
      "Approved Place bindings are already applied; remote changes: none"
    )
    return
  }

  const confirmation = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  if (normalizedSource(confirmation) !== normalizedSource(before)) {
    throw new Error(
      "Posts changed while bindings were being prepared; rerun from a fresh report"
    )
  }
  await applyPostsMigration({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: migration.requests,
  })
  const after = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  const verified = verifyBindings({ before, after, migration })
  const refreshedPlan = planBaseline({
    headers: after.headers,
    rows: after.rows,
    catalog,
    eligibleAccount: options.account,
  })
  await writeBindingReport(
    buildBindingReport({ catalog, baselinePlan: refreshedPlan })
  )
  console.log(
    `Place bindings verified: ${verified} approved rows; creator fields and all unapproved place_id values are unchanged.`
  )
}

main().catch(error => {
  console.error(`Editorial Place binding failed: ${error.message}`)
  process.exitCode = 1
})
