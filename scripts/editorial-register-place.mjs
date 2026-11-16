import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { generatedGeography } from "../src/content/geography/index.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  buildCanonicalCatalog,
  postSourceHash,
} from "./lib/editorial-baseline.mjs"
import {
  createGitHubClient,
  loadGitHubCredential,
  parseGitHubRemote,
} from "./lib/editorial-github.mjs"
import {
  createCommandRunner,
  publishGeneratedPost,
  verifyPublicPublication,
} from "./lib/editorial-github-publisher.mjs"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  applyPublicationWriteback,
  buildPlaceRegistrationWriteback,
} from "./lib/editorial-google-publication.mjs"
import {
  readPostsSheet,
  readSheetStructure,
} from "./lib/editorial-google-sheets.mjs"
import {
  planPlaceRegistration,
  selectPlaceRegistrationRow,
  serializeGeographyRecords,
} from "./lib/editorial-place-registration.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const geographyPath = path.join(
  projectRoot,
  "src/content/geography/generated/records.json"
)
const geographyRelativePath = "src/content/geography/generated/records.json"

function usage() {
  return `Usage:
  npm run editorial:register:place -- --preview --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> --post-id <id> [Place options]
  npm run editorial:register:place -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> --post-id <id> [Place options]

The selected row must use the Atlas Place choice "New Place", put the requested
name in Location, use Publish To Atlas or Both, and keep Atlas Mode Off. Preview
is read-only. Apply explicitly registers the
Place when needed, adds its Visit and Atlas pin, promotes the generated shard
through protected GitHub branches, refreshes the Sheet catalog, and replaces
the request with the registered Atlas Place.

New Place options:
  --parent-place <Place ID or label | none>  Required for a new Place
  --longitude <number> --latitude <number>  Required Atlas coordinates
  --summary <public Place summary>           Required public copy
  --place-id <id>                            Optional stable ID override
  --category <value>                         Defaults to destination
  --coordinate-precision <value>             Defaults to approximate
  --country-code <code> --region-code <code>
  --maps-url <https URL> --official-url <https URL>

Visit and map options:
  --after-place <Place ID, Visit ID, or label | end>
  --atlas-node-id <id>
  --zoom <number> --pitch <number> --bearing <number>

If the requested name resolves to an existing Place, the command creates only
the missing Visit and Atlas pin; new Place metadata is not required.`
}

function value(args, index, option) {
  const candidate = args[index + 1]
  if (!candidate || candidate.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return candidate
}

function parseArgs(args) {
  const options = {
    preview: false,
    apply: false,
    oauthClientPath: null,
    tokenPath: null,
    spreadsheetId: null,
    postsSheetId: null,
    postId: null,
    account: "Roam",
    reauthorize: false,
    remote: "origin",
    develop: "develop",
    main: "main",
    timeoutMinutes: 30,
    help: false,
  }
  const optionMap = new Map([
    ["--oauth-client", "oauthClientPath"],
    ["--token-path", "tokenPath"],
    ["--spreadsheet-id", "spreadsheetId"],
    ["--posts-gid", "postsSheetId"],
    ["--post-id", "postId"],
    ["--account", "account"],
    ["--parent-place", "parentPlace"],
    ["--longitude", "longitude"],
    ["--latitude", "latitude"],
    ["--summary", "summary"],
    ["--place-id", "placeId"],
    ["--category", "category"],
    ["--coordinate-precision", "coordinatePrecision"],
    ["--country-code", "countryCode"],
    ["--region-code", "regionCode"],
    ["--maps-url", "mapsUrl"],
    ["--official-url", "officialUrl"],
    ["--after-place", "afterPlace"],
    ["--atlas-node-id", "atlasNodeId"],
    ["--zoom", "zoom"],
    ["--pitch", "pitch"],
    ["--bearing", "bearing"],
    ["--remote", "remote"],
    ["--develop", "develop"],
    ["--main", "main"],
    ["--timeout-minutes", "timeoutMinutes"],
  ])
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (optionMap.has(argument)) {
      const key = optionMap.get(argument)
      options[key] = value(args, index, argument)
      index += 1
    } else if (argument === "--preview") options.preview = true
    else if (argument === "--apply") options.apply = true
    else if (argument === "--reauthorize") options.reauthorize = true
    else if (["--help", "-h"].includes(argument)) options.help = true
    else throw new Error(`Unknown option: ${argument}`)
  }
  options.timeoutMinutes = Number(options.timeoutMinutes)
  return options
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = capture
      ? String(result.stderr || result.stdout || "").trim()
      : ""
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}${detail ? `: ${detail}` : ""}`
    )
  }
  return capture ? String(result.stdout || "").trim() : ""
}

function runNode(script, args = []) {
  run(process.execPath, [script, ...args])
}

function replaceGeography(records) {
  const incoming = `${geographyPath}.incoming-${process.pid}`
  fs.writeFileSync(incoming, serializeGeographyRecords(records), { flag: "wx" })
  fs.renameSync(incoming, geographyPath)
}

function catalogArgs(options, configuration) {
  const args = [
    "--apply",
    "--oauth-client",
    configuration.oauthClientPath,
    "--spreadsheet-id",
    configuration.spreadsheetId,
    "--posts-gid",
    options.postsSheetId,
    "--account",
    options.account,
  ]
  if (configuration.tokenPath) {
    args.push("--token-path", configuration.tokenPath)
  }
  return args
}

function publicPlan(plan, selected, mode) {
  return {
    mode,
    postId: selected.row.post_id,
    rowNumber: selected.rowNumber,
    sourceHash: plan.sourceHash,
    requestedName: plan.requestedName,
    createdPlace: plan.createdPlace,
    createdAtlasNode: plan.createdAtlasNode,
    resumed: plan.resumed,
    summary: plan.summary,
    place: plan.place,
    visit: plan.visit,
    atlasNode: plan.atlasNode,
    remoteChanges: mode === "preview" ? "none" : "pending",
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (options.preview === options.apply) {
    throw new Error("Choose exactly one of --preview or --apply")
  }
  if (options.postsSheetId === null) throw new Error("--posts-gid is required")
  if (!options.postId) throw new Error("--post-id is required")
  if (!Number.isFinite(options.timeoutMinutes) || options.timeoutMinutes <= 0) {
    throw new Error("--timeout-minutes must be positive")
  }

  const configuration = resolveGoogleConfiguration({
    options: {
      ...options,
      sheetsAccess: options.apply ? "write" : "readonly",
    },
    projectRoot,
  })
  const auth = await authorizeGoogleReadOnly(configuration, {
    forceReauthorize: options.reauthorize,
  })
  const postsStructure = await readSheetStructure({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    sheetId: options.postsSheetId,
  })
  const postsSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const selected = selectPlaceRegistrationRow({
    rows: postsSheet.rows,
    account: options.account,
    postId: options.postId,
  })
  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
  })
  const plan = planPlaceRegistration({
    current: generatedGeography,
    row: selected.row,
    catalog,
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
    options,
  })
  const preview = publicPlan(
    plan,
    selected,
    options.preview ? "preview" : "apply"
  )
  if (options.preview) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  const confirmationSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const confirmation = selectPlaceRegistrationRow({
    rows: confirmationSheet.rows,
    account: options.account,
    postId: options.postId,
  })
  if (postSourceHash(confirmation.row) !== plan.sourceHash) {
    throw new Error("The Sheet row changed after Place registration planning")
  }

  const original = fs.readFileSync(geographyPath, "utf8")
  try {
    replaceGeography(plan.records)
    runNode("scripts/validate-content.js")
    const npm = process.platform === "win32" ? "npm.cmd" : "npm"
    run(npm, ["run", "build"])
  } catch (error) {
    fs.writeFileSync(geographyPath, original)
    throw new Error(
      `Generated Place registration was rolled back: ${error.message}`
    )
  }

  const command = createCommandRunner()
  const remoteUrl = command("git", ["remote", "get-url", options.remote], {
    cwd: projectRoot,
  })
  const repository = parseGitHubRemote(remoteUrl)
  const credential = loadGitHubCredential()
  const client = createGitHubClient({ ...repository, token: credential.token })
  const verification = {
    url: `https://roamwithjustin.com${plan.summary.atlasUrl}`,
    expectedMarkers: [plan.place.name],
  }
  const deployment = await publishGeneratedPost({
    sourceRoot: projectRoot,
    stateRoot: path.join(projectRoot, ".state/editorial/github"),
    postId: selected.row.post_id,
    label: `Register ${plan.place.name}`,
    paths: [geographyRelativePath],
    client,
    owner: repository.owner,
    remote: options.remote,
    develop: options.develop,
    main: options.main,
    command,
    timeoutMs: options.timeoutMinutes * 60 * 1000,
    publicVerification: verification,
  })
  if (deployment.state === "unchanged") {
    await verifyPublicPublication({
      ...verification,
      timeoutMs: Math.min(options.timeoutMinutes * 60 * 1000, 10 * 60 * 1000),
    })
  } else if (deployment.state !== "deployed") {
    throw new Error(
      `GitHub Place registration ended in unexpected state ${deployment.state}`
    )
  }

  runNode(
    "scripts/editorial-build-catalog.mjs",
    catalogArgs(options, configuration)
  )
  const guardedSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const requestedPlace = String(selected.row["Atlas Place"] || "").trim()
  const writeback = buildPlaceRegistrationWriteback({
    sheetId: postsStructure.sheetId,
    headers: guardedSheet.headers,
    rows: guardedSheet.rows,
    postId: selected.row.post_id,
    expectedSheetSourceHash: plan.sourceHash,
    requestedPlace,
    placeLabel: plan.place.name,
    journeyId: plan.registration.journeyId,
    placeId: plan.registration.placeId,
    visitId: plan.registration.visitId,
  })
  await applyPublicationWriteback({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: writeback.requests,
  })
  const readback = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const actual = readback.rows.find(row => row.post_id === selected.row.post_id)
  for (const [header, expected] of Object.entries(writeback.values)) {
    if (String(actual?.[header] || "") !== String(expected)) {
      throw new Error(`Place registration Sheet readback failed for ${header}`)
    }
  }

  console.log(
    JSON.stringify(
      {
        ...preview,
        remoteChanges: "verified",
        deployment: {
          state: deployment.state,
          branch: deployment.branch,
          developPull: deployment.developPull || null,
          developMergeSha: deployment.developMergeSha || null,
          mainPull: deployment.mainPull || null,
          mainMergeSha: deployment.mainMergeSha || null,
          workflowRun: deployment.deployment?.runId || null,
        },
        sheetWriteback: {
          rowNumber: writeback.rowNumber,
          atlasPlace: plan.place.name,
        },
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(`Editorial Place registration failed: ${error.message}`)
  process.exitCode = 1
})
