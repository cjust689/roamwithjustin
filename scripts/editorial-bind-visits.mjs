import path from "node:path"
import { fileURLToPath } from "node:url"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  applyVisitBindingMigration,
  buildVisitBindingMigration,
} from "./lib/editorial-google-visits.mjs"
import {
  readPostsSheet,
  readSheetStructure,
} from "./lib/editorial-google-sheets.mjs"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function value(args, index, option) {
  const candidate = args[index + 1]
  if (!candidate || candidate.startsWith("--")) throw new Error(`${option} requires a value`)
  return candidate
}

function parseArgs(args) {
  const options = {
    apply: false,
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsSheetId: null,
    account: "Roam",
    reauthorize: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (["--oauth-client", "--token-path", "--spreadsheet-id", "--posts-gid", "--account"].includes(argument)) {
      const candidate = value(args, index, argument)
      index += 1
      if (argument === "--oauth-client") options.oauthClientPath = candidate
      else if (argument === "--token-path") options.tokenPath = candidate
      else if (argument === "--spreadsheet-id") options.spreadsheetId = candidate
      else if (argument === "--posts-gid") options.postsSheetId = candidate
      else options.account = candidate
    } else if (argument === "--apply") options.apply = true
    else if (argument === "--reauthorize") options.reauthorize = true
    else throw new Error(`Unknown option: ${argument}`)
  }
  return options
}

function stableSheet(sheet) {
  return JSON.stringify({ headers: sheet.headers, rows: sheet.rows })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.apply) throw new Error("Visit binding requires --apply")
  if (options.postsSheetId === null) throw new Error("Visit binding requires --posts-gid")
  const configuration = resolveGoogleConfiguration({
    options: { ...options, sheetsAccess: "write" },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration, {
    forceReauthorize: options.reauthorize,
  })
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
  const migration = buildVisitBindingMigration({
    sheetId: structure.sheetId,
    headers: before.headers,
    rows: before.rows,
    journeys: journeyRecords,
    account: options.account,
  })
  const confirmation = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  if (stableSheet(confirmation) !== stableSheet(before)) {
    throw new Error("Posts changed while Visit bindings were planned")
  }
  await applyVisitBindingMigration({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: migration.requests,
  })
  const after = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  const expectedByPost = new Map(
    migration.assignments.map(item => [item.postId, item.visitId])
  )
  const beforeByPost = new Map(
    before.rows
      .filter(row => String(row.post_id || "").trim())
      .map(row => [row.post_id, row])
  )
  for (const row of after.rows) {
    const expected = expectedByPost.get(row.post_id)
    if (expected && row.visit_id !== expected) {
      throw new Error(`Visit binding readback failed for ${row.post_id}`)
    }
    const beforeRow = beforeByPost.get(row.post_id)
    if (!beforeRow) continue
    for (const header of before.headers) {
      if (header !== "visit_id" && row[header] !== beforeRow[header]) {
        throw new Error(`Unexpected ${header} change for ${row.post_id}`)
      }
    }
  }
  console.log(
    `Visit bindings verified: ${migration.summary.assignments} written, ${migration.summary.alreadyApplied} retained, ${migration.summary.blocked} blocked.`
  )
  migration.blocked.forEach(item =>
    console.log(
      `BLOCKED row ${item.rowNumber}: ${item.postId || "missing post_id"} (${item.reason}${item.journeyId ? `, ${item.journeyId} / ${item.placeId}` : ""})`
    )
  )
}

main().catch(error => {
  console.error(`Editorial Visit binding failed: ${error.message}`)
  process.exitCode = 1
})
