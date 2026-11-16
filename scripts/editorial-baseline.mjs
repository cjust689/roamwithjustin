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

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

function usage() {
  return `Usage:
  npm run editorial:baseline -- --dry-run [--posts-csv <path>] [--account <label>] [--json]
  npm run editorial:baseline -- --dry-run --live --oauth-client <path> --spreadsheet-id <id> [--posts-range Posts | --posts-gid <gid>] [--drive-folder <url>] [--reauthorize]

This command is read-only. It builds a deterministic catalog from current
canonical repository records, audits an offline Posts CSV, or reads the live
designated Posts tab. Live mode uses selected-file Drive access by default.
The restricted readonly Drive scope requires explicit approval.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function isInside(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

function parseArgs(args) {
  const options = {
    dryRun: false,
    postsCsv: null,
    account: "Roam",
    live: false,
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsRange: null,
    postsSheetId: null,
    driveFolder: null,
    driveScope: null,
    allowRestrictedDriveScope: false,
    reauthorize: false,
    json: false,
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--dry-run") {
      options.dryRun = true
    } else if (argument === "--live") {
      options.live = true
    } else if (argument === "--posts-csv") {
      options.postsCsv = readValue(args, index, "--posts-csv")
      index += 1
    } else if (argument.startsWith("--posts-csv=")) {
      options.postsCsv = argument.slice("--posts-csv=".length)
    } else if (argument === "--account") {
      options.account = readValue(args, index, "--account")
      index += 1
    } else if (argument.startsWith("--account=")) {
      options.account = argument.slice("--account=".length)
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
    } else if (argument === "--posts-range") {
      options.postsRange = readValue(args, index, "--posts-range")
      index += 1
    } else if (argument.startsWith("--posts-range=")) {
      options.postsRange = argument.slice("--posts-range=".length)
    } else if (argument === "--posts-gid") {
      options.postsSheetId = readValue(args, index, "--posts-gid")
      index += 1
    } else if (argument.startsWith("--posts-gid=")) {
      options.postsSheetId = argument.slice("--posts-gid=".length)
    } else if (argument === "--drive-folder") {
      options.driveFolder = readValue(args, index, "--drive-folder")
      index += 1
    } else if (argument.startsWith("--drive-folder=")) {
      options.driveFolder = argument.slice("--drive-folder=".length)
    } else if (argument === "--drive-scope") {
      options.driveScope = readValue(args, index, "--drive-scope")
      index += 1
    } else if (argument.startsWith("--drive-scope=")) {
      options.driveScope = argument.slice("--drive-scope=".length)
    } else if (argument === "--allow-restricted-drive-scope") {
      options.allowRestrictedDriveScope = true
    } else if (argument === "--reauthorize") {
      options.reauthorize = true
    } else if (argument === "--json") {
      options.json = true
    } else if (argument === "--help" || argument === "-h") {
      options.help = true
    } else {
      throw new Error(`Unknown option: ${argument}`)
    }
  }

  return options
}

function displayReport(report) {
  console.log("Editorial publishing baseline (read-only)")
  console.log(
    `Catalog: ${report.catalog.counts.journey || 0} Journeys, ${report.catalog.counts.place || 0} Places, ${report.catalog.counts.visit || 0} Visits, ${report.catalog.counts["atlas-node"] || 0} Atlas nodes`
  )

  if (!report.posts) {
    console.log("Posts input: not supplied")
    console.log("Remote changes: none")
    return
  }

  console.log(`Posts source: ${report.posts.source}`)
  console.log(`Eligible account: ${report.posts.plan.eligibleAccount}`)
  console.log(
    `Rows: ${report.posts.plan.summary.eligibleRows} eligible, ${report.posts.plan.summary.ignoredRows} ignored, ${report.posts.plan.summary.blockedRows} need review`
  )
  console.log(
    `Migration: ${report.posts.plan.summary.missingPostIds} stable Post IDs to seed, ${report.posts.plan.summary.exactPlaceMatches} exact Place matches`
  )
  console.log(
    `Header additions proposed: ${report.posts.plan.schema.missingAtlas.join(", ") || "none"}`
  )
  console.log(
    `Hidden automation columns proposed: ${report.posts.plan.schema.missingAutomation.length}`
  )
  if (report.drive) {
    console.log(
      `Drive inventory: ${report.drive.summary.total} files, ${report.drive.summary.supported} supported, ${report.drive.summary.unsupported} unsupported`
    )
  }
  console.log("Remote changes: none")
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.dryRun) {
    throw new Error(
      "Only --dry-run is implemented. Live Sheet writes and publication require later approved phases."
    )
  }
  if (options.live && options.postsCsv) {
    throw new Error("Use either --live or --posts-csv, not both")
  }
  if (options.driveFolder && !options.live) {
    throw new Error("--drive-folder requires --live")
  }
  if (options.reauthorize && !options.live) {
    throw new Error("--reauthorize requires --live")
  }
  if (options.postsRange && options.postsSheetId !== null) {
    throw new Error("Use either --posts-range or --posts-gid, not both")
  }

  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
  })
  const report = {
    mode: "dry-run",
    catalog,
    posts: null,
    drive: null,
  }

  if (options.live) {
    const [
      { authorizeGoogleReadOnly, resolveGoogleConfiguration },
      drive,
      sheets,
    ] = await Promise.all([
      import("./lib/editorial-google-auth.mjs"),
      import("./lib/editorial-google-drive.mjs"),
      import("./lib/editorial-google-sheets.mjs"),
    ])
    const configuration = resolveGoogleConfiguration({
      options,
      projectRoot,
    })
    const auth = await authorizeGoogleReadOnly(configuration, {
      forceReauthorize: options.reauthorize,
    })
    const postsRange =
      options.postsSheetId === null
        ? configuration.postsRange
        : await sheets.resolveSheetTitle({
            auth,
            spreadsheetId: configuration.spreadsheetId,
            sheetId: options.postsSheetId,
          })
    const parsed = await sheets.readPostsSheet({
      auth,
      spreadsheetId: configuration.spreadsheetId,
      postsRange,
    })
    const plan = planBaseline({
      headers: parsed.headers,
      rows: parsed.rows,
      catalog,
      eligibleAccount: options.account,
    })
    report.posts = {
      source: `Google Sheets tab "${postsRange}"`,
      plan,
    }
    if (options.driveFolder) {
      report.drive = await drive.inventoryDriveFolder({
        auth,
        folderUrl: options.driveFolder,
      })
    }
    if (plan.schema.missingExisting.length) {
      throw new Error(
        `Posts Sheet is missing existing header(s): ${plan.schema.missingExisting.join(", ")}`
      )
    }
  } else if (options.postsCsv) {
    const source = path.resolve(projectRoot, options.postsCsv)
    const privateCache = path.join(projectRoot, ".cache", "editorial")
    if (isInside(source, projectRoot) && !isInside(source, privateCache)) {
      throw new Error(
        "A private Posts CSV inside the repository must be stored under .cache/editorial/"
      )
    }
    const parsed = parseCsvRecords(await fs.promises.readFile(source, "utf8"))
    const plan = planBaseline({
      headers: parsed.headers,
      rows: parsed.rows,
      catalog,
      eligibleAccount: options.account,
    })
    report.posts = {
      source: path.relative(projectRoot, source).replace(/\\/g, "/"),
      plan,
    }

    if (plan.schema.missingExisting.length) {
      throw new Error(
        `Posts CSV is missing existing header(s): ${plan.schema.missingExisting.join(", ")}`
      )
    }
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    displayReport(report)
  }
}

main().catch(error => {
  console.error(`Editorial baseline failed: ${error.message}`)
  process.exitCode = 1
})
