import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  applyPostsMigration,
  buildPostsMigration,
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

function usage() {
  return `Usage:
  npm run editorial:migrate -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--account Roam] [--reauthorize]

This command performs only the creator-authorized Phase 1 Posts migration. It
re-reads the source before one atomic Sheets batch, appends managed columns,
defaults eligible historical rows to Off, seeds stable Post IDs, hides and
warning-protects automation columns, and verifies the result. It does not
publish content, change existing creator fields, or touch Drive.`
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
    reauthorize: false,
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
    } else if (argument === "--reauthorize") {
      options.reauthorize = true
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

function normalizeAccount(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function verifyMigration({ before, after, plan, eligibleAccount }) {
  if (JSON.stringify(after.headers) !== JSON.stringify(plan.finalHeaders)) {
    throw new Error("Post-write headers do not match the approved migration")
  }
  if (
    JSON.stringify(originalFieldSnapshot(after.rows)) !==
    JSON.stringify(originalFieldSnapshot(before.rows))
  ) {
    throw new Error("An original creator-owned field changed during migration")
  }

  const eligible = normalizeAccount(eligibleAccount)
  const ids = new Set()
  after.rows.forEach((row, index) => {
    const isEligible = normalizeAccount(row.Account) === eligible
    if (isEligible) {
      const postId = String(row.post_id || "").trim()
      if (!postId) {
        throw new Error(
          `Eligible row ${index + 2} has no post_id after migration`
        )
      }
      if (ids.has(postId)) {
        throw new Error(`Duplicate post_id detected after migration: ${postId}`)
      }
      ids.add(postId)
      if (!String(row["Atlas Mode"] || "").trim()) {
        throw new Error(
          `Eligible row ${index + 2} has no Atlas Mode after migration`
        )
      }
    } else if (row.post_id || row["Atlas Mode"]) {
      throw new Error(
        `Unrelated row ${index + 2} received managed values unexpectedly`
      )
    }
  })
  return { verifiedEligibleRows: ids.size }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.apply) {
    throw new Error("Migration requires the explicit --apply flag")
  }
  if (options.postsSheetId === null) {
    throw new Error("Migration requires --posts-gid for the approved tab")
  }

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
  const plan = buildPostsMigration({
    sheetId: structure.sheetId,
    gridColumnCount: structure.gridProperties.columnCount,
    gridRowCount: structure.gridProperties.rowCount,
    headers: before.headers,
    rows: before.rows,
    eligibleAccount: options.account,
  })

  console.log(
    `Approved migration plan: ${plan.summary.visibleHeadersAdded} visible headers, ${plan.summary.automationHeadersAdded} hidden headers, ${plan.summary.postIdsAssigned} Post IDs, ${plan.summary.atlasModesDefaultedOff} Off defaults.`
  )
  if (!plan.requests.length) {
    console.log("Migration is already applied; remote changes: none")
    return
  }

  const confirmation = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  if (normalizedSource(confirmation) !== normalizedSource(before)) {
    throw new Error(
      "Sheet changed while the migration was being prepared; rerun from a fresh baseline"
    )
  }

  await applyPostsMigration({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: plan.requests,
  })
  const after = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: structure.title,
  })
  const verification = verifyMigration({
    before,
    after,
    plan,
    eligibleAccount: options.account,
  })
  console.log(
    `Migration verified: ${verification.verifiedEligibleRows} eligible rows have unique Post IDs; original creator fields and unrelated rows are unchanged.`
  )
}

main().catch(error => {
  console.error(`Editorial migration failed: ${error.message}`)
  process.exitCode = 1
})
