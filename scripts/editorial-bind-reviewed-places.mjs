import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  buildCanonicalCatalog,
  parseCsvRecords,
  planBaseline,
} from "./lib/editorial-baseline.mjs"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import { buildBindingReport } from "./lib/editorial-google-catalog.mjs"
import { applyPostsMigration } from "./lib/editorial-google-migration.mjs"
import {
  buildReviewedPlaceBindingMigration,
  buildReviewedPlaceDecisions,
} from "./lib/editorial-place-decisions.mjs"
import {
  readPostsSheet,
  readSheetStructure,
} from "./lib/editorial-google-sheets.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const stateDirectory = path.join(projectRoot, ".state", "editorial")
const reviewCsvPath = path.join(stateDirectory, "place-suggestions.csv")
const suggestionReportPath = path.join(stateDirectory, "place-suggestions.json")
const decisionReportPath = path.join(stateDirectory, "place-decisions.json")
const bindingReportPath = path.join(stateDirectory, "bindings.json")

function usage() {
  return `Usage:
  npm run editorial:bind:reviewed-places -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--allow-missing-visit "post-id=place-id"]

This one-time reconciliation command reads the creator-edited private review
CSV and its immutable suggestion report. It writes only reviewed place_id
values, keyed by stable post_id and source hash. A Place outside the bound
Journey's Visits requires an explicit per-Post missing-Visit approval.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseMissingVisitApproval(value) {
  const separator = value.indexOf("=")
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(
      `Invalid missing-Visit approval "${value}"; use post-id=place-id`
    )
  }
  return {
    postId: value.slice(0, separator).trim(),
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
    approvedMissingVisits: [],
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
    } else if (argument === "--allow-missing-visit") {
      options.approvedMissingVisits.push(
        parseMissingVisitApproval(
          readValue(args, index, "--allow-missing-visit")
        )
      )
      index += 1
    } else if (argument.startsWith("--allow-missing-visit=")) {
      options.approvedMissingVisits.push(
        parseMissingVisitApproval(
          argument.slice("--allow-missing-visit=".length)
        )
      )
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

function withoutPlaceId(row) {
  return Object.fromEntries(
    Object.entries(row).filter(([header]) => header !== "place_id")
  )
}

function verifyBindings({ before, after, migration }) {
  if (
    JSON.stringify(before.headers) !== JSON.stringify(after.headers) ||
    before.rows.length !== after.rows.length
  ) {
    throw new Error("Posts structure changed during reviewed Place binding")
  }
  const expectedByPostId = new Map(
    migration.assignments.map(assignment => [assignment.postId, assignment])
  )
  let verified = 0
  after.rows.forEach((row, index) => {
    const beforeRow = before.rows[index]
    if (
      JSON.stringify(withoutPlaceId(row)) !==
      JSON.stringify(withoutPlaceId(beforeRow))
    ) {
      throw new Error(`Unexpected non-place_id change on row ${index + 2}`)
    }
    const expected = expectedByPostId.get(row.post_id)
    if (expected) {
      if (row.place_id !== expected.placeId) {
        throw new Error(`place_id verification failed for ${row.post_id}`)
      }
      verified += 1
    } else if (row.place_id !== beforeRow?.place_id) {
      throw new Error(`Unapproved place_id changed on row ${index + 2}`)
    }
  })
  if (verified !== migration.assignments.length) {
    throw new Error("Not every reviewed Place assignment was verified")
  }
  return verified
}

async function writePrivateJson(target, value) {
  const temporary = `${target}.${process.pid}.tmp`
  await fs.promises.writeFile(
    temporary,
    `${JSON.stringify(value, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  )
  await fs.promises.rename(temporary, target)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.apply) {
    throw new Error("Reviewed Place binding requires the explicit --apply flag")
  }
  if (options.postsSheetId === null) {
    throw new Error("Reviewed Place binding requires --posts-gid")
  }

  const suggestionReport = JSON.parse(
    await fs.promises.readFile(suggestionReportPath, "utf8")
  )
  const reviewCsv = parseCsvRecords(
    await fs.promises.readFile(reviewCsvPath, "utf8")
  )
  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
  })
  const decisionReport = buildReviewedPlaceDecisions({
    csvRows: reviewCsv.rows,
    suggestionReport,
    catalog,
    journeys: journeyRecords,
    approvedMissingVisits: options.approvedMissingVisits,
  })
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
  const baselinePlan = planBaseline({
    headers: before.headers,
    rows: before.rows,
    catalog,
    eligibleAccount: options.account,
  })
  const migration = buildReviewedPlaceBindingMigration({
    sheetId: structure.sheetId,
    headers: before.headers,
    rows: before.rows,
    baselinePlan,
    decisionReport,
  })
  console.log(
    `Reviewed Place plan: ${migration.summary.assignments} writes, ${migration.summary.alreadyApplied} already applied, ${migration.summary.approvedMissingVisits} approved missing Visit.`
  )
  if (!migration.requests.length) {
    console.log(
      "Reviewed Place bindings are already applied; remote changes: none"
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
      "Posts changed while reviewed Place bindings were being prepared"
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
  await writePrivateJson(decisionReportPath, decisionReport)
  await writePrivateJson(
    bindingReportPath,
    buildBindingReport({ catalog, baselinePlan: refreshedPlan })
  )
  console.log(
    `Reviewed Place bindings verified: ${verified}; every other cell is unchanged.`
  )
}

main().catch(error => {
  console.error(`Reviewed Place binding failed: ${error.message}`)
  process.exitCode = 1
})
