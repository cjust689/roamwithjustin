import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { experienceRecords } from "../src/content/experiences/index.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { mediaRecords } from "../src/content/media/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  buildCanonicalCatalog,
  postSourceHash,
} from "./lib/editorial-baseline.mjs"
import {
  planEditorialCompilation,
  serializeEditorialRecords,
} from "./lib/editorial-content-compiler.mjs"
import {
  createGitHubClient,
  loadGitHubCredential,
  parseGitHubRemote,
} from "./lib/editorial-github.mjs"
import {
  createCommandRunner,
  publishGeneratedPost,
} from "./lib/editorial-github-publisher.mjs"
import {
  authorizeGoogleReadOnly,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  driveInventoryFingerprint,
  inventoryDriveFolder,
  snapshotDriveFolder,
} from "./lib/editorial-google-drive.mjs"
import {
  applyAtlasCatalogMigration,
  buildAtlasCatalogMigration,
} from "./lib/editorial-google-catalog.mjs"
import {
  applyPublicationWriteback,
  buildPublicationWriteback,
} from "./lib/editorial-google-publication.mjs"
import {
  nextSourceRevision,
  publicationSourceHash,
  publicObjectUrl,
  resolvePublicationTarget,
  selectPublicationRow,
} from "./lib/editorial-publication-plan.mjs"
import {
  readPostsSheet,
  readSheetStructure,
  readSpreadsheetSheets,
} from "./lib/editorial-google-sheets.mjs"

const require = createRequire(import.meta.url)
const {
  planMediaIngestion,
  serializeMediaRecords,
  sha256,
} = require("./lib/media-ingestion.js")
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const mediaRecordsPath = path.join(
  projectRoot,
  "src/content/media/generated/records.json"
)
const editorialRecordsPath = path.join(
  projectRoot,
  "src/content/editorial/generated/records.json"
)

function usage() {
  return `Usage:
  npm run editorial:publish -- --preview --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--post-id <id>]
  npm run editorial:publish -- --apply --oauth-client <path> --spreadsheet-id <id> --posts-gid <gid> [--post-id <id>]

Preview downloads the selected row's approved Drive folder into private state,
prepares deterministic packages, and validates the combined Media, Experience,
and Moment plan. It makes no R2, GitHub, app-content, or Sheet writes.

Apply requires Atlas Mode Publish. It rechecks the Sheet and Drive, uploads with
real receipts, updates only generated content, validates and builds, promotes a
per-post merge commit through develop and main, verifies Pages and the rendered
public page, refreshes the protected catalog, and finally writes deployment
metadata back to the same unchanged Sheet row.`
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
    driveScope: "selected",
    allowRestrictedDriveScope: false,
    reauthorize: false,
    remote: "origin",
    develop: "develop",
    main: "main",
    timeoutMinutes: 30,
    help: false,
  }
  const valued = new Set([
    "--oauth-client",
    "--token-path",
    "--spreadsheet-id",
    "--posts-gid",
    "--post-id",
    "--account",
    "--drive-scope",
    "--remote",
    "--develop",
    "--main",
    "--timeout-minutes",
  ])
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (valued.has(argument)) {
      const candidate = value(args, index, argument)
      index += 1
      if (argument === "--oauth-client") options.oauthClientPath = candidate
      else if (argument === "--token-path") options.tokenPath = candidate
      else if (argument === "--spreadsheet-id")
        options.spreadsheetId = candidate
      else if (argument === "--posts-gid") options.postsSheetId = candidate
      else if (argument === "--post-id") options.postId = candidate
      else if (argument === "--account") options.account = candidate
      else if (argument === "--drive-scope") options.driveScope = candidate
      else if (argument === "--remote") options.remote = candidate
      else if (argument === "--develop") options.develop = candidate
      else if (argument === "--main") options.main = candidate
      else options.timeoutMinutes = Number(candidate)
    } else if (argument === "--preview") options.preview = true
    else if (argument === "--apply") options.apply = true
    else if (argument === "--allow-restricted-drive-scope") {
      options.allowRestrictedDriveScope = true
    } else if (argument === "--reauthorize") options.reauthorize = true
    else if (["--help", "-h"].includes(argument)) options.help = true
    else throw new Error(`Unknown option: ${argument}`)
  }
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

function runNode(script, args) {
  run(process.execPath, [script, ...args])
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8").replace(/^\uFEFF/, ""))
}

function writePrivateJson(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  })
  fs.renameSync(temporary, target)
}

function verifyExistingSnapshot(snapshotDirectory, fingerprint) {
  const manifestPath = path.join(snapshotDirectory, "drive-snapshot.json")
  if (!fs.existsSync(manifestPath)) return null
  const snapshot = readJson(manifestPath)
  if (snapshot.inventoryFingerprint !== fingerprint) {
    throw new Error(
      "Existing private Drive snapshot belongs to another inventory"
    )
  }
  for (const file of snapshot.files || []) {
    const target = path.resolve(snapshotDirectory, file.relativePath)
    const relative = path.relative(snapshotDirectory, target)
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Unsafe Drive snapshot path: ${file.relativePath}`)
    }
    const bytes = fs.readFileSync(target)
    const checksum = crypto.createHash("sha256").update(bytes).digest("hex")
    if (bytes.length !== file.byteSize || checksum !== file.sha256) {
      throw new Error(`Private Drive snapshot changed: ${file.relativePath}`)
    }
  }
  return snapshot
}

function packageDescriptor({ journey, row, runDirectory, kind }) {
  const placeId = String(row.visit_id || "").trim()
    ? String(row.place_id || "").trim()
    : ""
  const scopeLabel = placeId ? `${journey.slug}-${placeId}` : journey.slug
  const packageLabel = kind === "video" ? `${scopeLabel}-videos` : scopeLabel
  return {
    kind,
    source: path.join(
      runDirectory,
      "drive",
      kind === "video" ? "videos" : "images"
    ),
    manifest: path.join(
      runDirectory,
      "packages",
      packageLabel,
      "publication-manifest.json"
    ),
    receipt: path.join(
      runDirectory,
      "packages",
      packageLabel,
      "r2-verification.json"
    ),
  }
}

function preparePackages({ snapshot, journey, row, runDirectory }) {
  const packages = []
  for (const kind of ["image", "video"]) {
    const count =
      kind === "image" ? snapshot.counts.images : snapshot.counts.videos
    if (!count) continue
    const descriptor = packageDescriptor({ journey, row, runDirectory, kind })
    if (!fs.existsSync(descriptor.manifest)) {
      const args = [
        "scripts/optimize-images.js",
        "--package",
        "--source",
        descriptor.source,
        "--output",
        path.join(runDirectory, "packages"),
        "--tag",
        String(row["Series/Post"] || row.Location || row.post_id),
        "--journey",
        journey.id,
        "--rights-owner",
        "roam-with-justin",
        "--rights-status",
        "owned",
      ]
      const placeId = String(row.visit_id || "").trim()
        ? String(row.place_id || "").trim()
        : ""
      if (placeId) args.push("--place", placeId)
      runNode(args.shift(), args)
    }
    runNode("scripts/ingest-media.js", [
      "--manifest",
      descriptor.manifest,
      "--dry-run",
    ])
    descriptor.value = readJson(descriptor.manifest)
    packages.push(descriptor)
  }
  if (!packages.length)
    throw new Error("Drive snapshot contains no supported media")
  return packages
}

function staticMediaRecords(currentGenerated) {
  const generatedIds = new Set(
    (currentGenerated.assets || []).map(asset => asset.id)
  )
  return mediaRecords.filter(asset => !generatedIds.has(asset.id))
}

function planCombinedContent({ packages, row, processedHash, mode }) {
  let currentMedia = readJson(mediaRecordsPath)
  const currentEditorial = readJson(editorialRecordsPath)
  const staticMedia = staticMediaRecords(currentMedia)
  const mediaBatchIds = []
  for (const descriptor of packages) {
    const contents = fs.readFileSync(descriptor.manifest, "utf8")
    const plan = planMediaIngestion(descriptor.value, currentMedia, {
      journeys: journeyRecords,
      allowUnverifiedPlan: true,
      manifestSha256: sha256(contents),
      staticMedia,
      verification: { method: "not-verified-dry-run" },
      experiences: currentEditorial.experiences,
    })
    if (plan.errors.length) {
      throw new Error(`Media planning rejected:\n- ${plan.errors.join("\n- ")}`)
    }
    currentMedia = plan.records
    mediaBatchIds.push(descriptor.value.batchId)
  }
  return planEditorialCompilation({
    currentEditorial,
    currentMedia,
    row,
    processedHash,
    mediaBatchIds,
    journeys: journeyRecords,
    mode,
  })
}

function replaceGeneratedPair({ media, editorial }) {
  const inputs = [
    { target: mediaRecordsPath, serialized: serializeMediaRecords(media) },
    {
      target: editorialRecordsPath,
      serialized: serializeEditorialRecords(editorial),
    },
  ]
  const suffix = `${process.pid}-${Date.now()}`
  try {
    for (const input of inputs) {
      input.incoming = `${input.target}.incoming-${suffix}`
      input.backup = `${input.target}.backup-${suffix}`
      fs.writeFileSync(input.incoming, input.serialized, { flag: "wx" })
      fs.renameSync(input.target, input.backup)
      fs.renameSync(input.incoming, input.target)
    }
    runNode("scripts/validate-content.js", [])
    inputs.forEach(input => fs.unlinkSync(input.backup))
  } catch (error) {
    for (const input of [...inputs].reverse()) {
      if (input.backup && fs.existsSync(input.backup)) {
        if (fs.existsSync(input.target)) fs.unlinkSync(input.target)
        fs.renameSync(input.backup, input.target)
      }
      if (input.incoming && fs.existsSync(input.incoming))
        fs.unlinkSync(input.incoming)
    }
    throw new Error(
      `Generated publication update was rolled back: ${error.message}`
    )
  }
}

async function assertFreshSources({
  auth,
  configuration,
  postsTitle,
  original,
  fingerprint,
}) {
  const currentSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsTitle,
  })
  const selected = selectPublicationRow({
    rows: currentSheet.rows,
    account: original.row.Account,
    postId: original.row.post_id,
    apply: true,
  })
  if (postSourceHash(selected.row) !== postSourceHash(original.row)) {
    throw new Error("Selected Sheet row changed after publication planning")
  }
  const inventory = await inventoryDriveFolder({
    auth,
    folderUrl: selected.row["Drive Folder"],
  })
  if (driveInventoryFingerprint(inventory) !== fingerprint) {
    throw new Error("Drive folder changed after publication planning")
  }
  return { currentSheet, selected, inventory }
}

function publicDestination({ plan, journey, row }) {
  if (plan.experienceId) {
    const experience = plan.editorial.experiences.find(
      item => item.id === plan.experienceId
    )
    return {
      url: `https://roamwithjustin.com/trips/${journey.slug}#experience-${experience.slug}`,
      level: "experience",
    }
  }
  const visitId = String(row.visit_id || "").trim()
  const node = atlasPresentation.find(
    item => item.journeyId === journey.id && item.visitId === visitId
  )
  return node
    ? { url: `https://roamwithjustin.com/atlas/${node.id}`, level: "visit" }
    : {
        url: `https://roamwithjustin.com/trips/${journey.slug}`,
        level: "journey",
      }
}

async function refreshCatalog({
  auth,
  configuration,
  postsStructure,
  postsSheet,
  experiences,
}) {
  const catalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
    experiences,
  })
  const existingSheets = await readSpreadsheetSheets({
    auth,
    spreadsheetId: configuration.spreadsheetId,
  })
  const migration = buildAtlasCatalogMigration({
    catalog,
    existingSheets,
    postsSheetId: postsStructure.sheetId,
    postsHeaders: postsSheet.headers,
    postsGridRowCount: postsStructure.gridProperties.rowCount,
  })
  await applyAtlasCatalogMigration({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    requests: migration.requests,
  })
  return migration.summary
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
  let postsSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  if (options.apply) {
    await refreshCatalog({
      auth,
      configuration,
      postsStructure,
      postsSheet,
      experiences: experienceRecords,
    })
    postsSheet = await readPostsSheet({
      auth,
      spreadsheetId: configuration.spreadsheetId,
      postsRange: postsStructure.title,
    })
  }
  const selectedSource = selectPublicationRow({
    rows: postsSheet.rows,
    account: options.account,
    postId: options.postId,
    apply: options.apply,
  })
  const authoringCatalog = buildCanonicalCatalog({
    journeys: journeyRecords,
    places: placeRecords,
    atlasNodes: atlasPresentation,
    experiences: experienceRecords,
  })
  const target = resolvePublicationTarget({
    row: selectedSource.row,
    catalog: authoringCatalog,
  })
  const selected = { ...selectedSource, row: target.row, target }
  const sheetSourceHash = postSourceHash(selected.row)
  const inventory = await inventoryDriveFolder({
    auth,
    folderUrl: selected.row["Drive Folder"],
  })
  const fingerprint = driveInventoryFingerprint(inventory)
  const processedHash = publicationSourceHash({
    sheetSourceHash,
    driveFingerprint: fingerprint,
  })
  if (
    String(selected.row.atlas_status || "") === "Published" &&
    String(selected.row.last_processed_hash || "") === processedHash
  ) {
    console.log(
      `Post ${selected.row.post_id} already matches the deployed source hash.`
    )
    return
  }
  const journey = journeyRecords.find(
    item => item.id === selected.row.journey_id
  )
  if (!journey) throw new Error(`Unknown Journey ${selected.row.journey_id}`)
  const runDirectory = path.join(
    projectRoot,
    ".state/editorial/runs",
    selected.row.post_id,
    processedHash.slice(0, 12)
  )
  const snapshotDirectory = path.join(runDirectory, "drive")
  const snapshot =
    verifyExistingSnapshot(snapshotDirectory, fingerprint) ||
    (await snapshotDriveFolder({
      auth,
      inventory,
      outputDirectory: snapshotDirectory,
    }))
  const packages = preparePackages({
    snapshot,
    journey,
    row: selected.row,
    runDirectory,
  })
  const previewPlan = planCombinedContent({
    packages,
    row: selected.row,
    processedHash,
    mode: options.apply ? "Publish" : selected.mode,
  })
  const preview = {
    schemaVersion: 1,
    mode: options.apply ? "apply" : "preview",
    postId: selected.row.post_id,
    rowNumber: selected.rowNumber,
    target: {
      scope: target.scope,
      journeyId: selected.row.journey_id,
      placeId: selected.row.place_id || null,
      visitId: selected.row.visit_id || null,
    },
    sheetSourceHash,
    driveFingerprint: fingerprint,
    processedHash,
    packages: packages.map(item => ({
      kind: item.kind,
      batchId: item.value.batchId,
      assets: item.value.assets.length,
      manifest: path.relative(projectRoot, item.manifest).replace(/\\/g, "/"),
    })),
    experienceId: previewPlan.experienceId,
    momentId: previewPlan.momentId,
    mediaAssetIds: previewPlan.mediaAssetIds,
    message: previewPlan.message,
    remoteChanges: options.apply ? "pending approval checks" : "none",
  }
  writePrivateJson(path.join(runDirectory, "publication-plan.json"), preview)
  if (options.preview) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  await assertFreshSources({
    auth,
    configuration,
    postsTitle: postsStructure.title,
    original: selected,
    fingerprint,
  })
  const originalMedia = fs.readFileSync(mediaRecordsPath, "utf8")
  const originalEditorial = fs.readFileSync(editorialRecordsPath, "utf8")
  let appliedPlan
  try {
    for (const descriptor of packages) {
      runNode("scripts/upload-media.js", [
        "--manifest",
        descriptor.manifest,
        "--receipt",
        descriptor.receipt,
        "--resume",
      ])
      runNode("scripts/ingest-media.js", [
        "--manifest",
        descriptor.manifest,
        "--verification-receipt",
        descriptor.receipt,
      ])
    }
    appliedPlan = planEditorialCompilation({
      currentEditorial: readJson(editorialRecordsPath),
      currentMedia: readJson(mediaRecordsPath),
      row: selected.row,
      processedHash,
      mediaBatchIds: packages.map(item => item.value.batchId),
      journeys: journeyRecords,
      mode: "Publish",
    })
    replaceGeneratedPair({
      media: appliedPlan.media,
      editorial: appliedPlan.editorial,
    })
    const npm = process.platform === "win32" ? "npm.cmd" : "npm"
    run(npm, ["run", "build"])
  } catch (error) {
    fs.writeFileSync(mediaRecordsPath, originalMedia)
    fs.writeFileSync(editorialRecordsPath, originalEditorial)
    throw error
  }

  await assertFreshSources({
    auth,
    configuration,
    postsTitle: postsStructure.title,
    original: selected,
    fingerprint,
  })
  const firstObjectKey = packages[0].value.assets[0].output.objectKey
  const mediaMarker = publicObjectUrl(firstObjectKey)
  const destination = publicDestination({
    plan: appliedPlan,
    journey,
    row: selected.row,
  })
  const command = createCommandRunner()
  const remoteUrl = command("git", ["remote", "get-url", options.remote], {
    cwd: projectRoot,
  })
  const repository = parseGitHubRemote(remoteUrl)
  const credential = loadGitHubCredential()
  const client = createGitHubClient({ ...repository, token: credential.token })
  const deployment = await publishGeneratedPost({
    sourceRoot: projectRoot,
    stateRoot: path.join(projectRoot, ".state/editorial/github"),
    postId: selected.row.post_id,
    label: selected.row["Series/Post"] || selected.row.Location,
    paths: [
      "src/content/media/generated/records.json",
      "src/content/editorial/generated/records.json",
    ],
    client,
    owner: repository.owner,
    remote: options.remote,
    develop: options.develop,
    main: options.main,
    command,
    timeoutMs: options.timeoutMinutes * 60 * 1000,
    publicVerification: {
      url: destination.url,
      expectedMarkers: [mediaMarker],
    },
  })
  if (deployment.state !== "deployed") {
    throw new Error(
      `GitHub publication ended in unexpected state ${deployment.state}`
    )
  }

  const latestSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const catalogSummary = await refreshCatalog({
    auth,
    configuration,
    postsStructure,
    postsSheet: latestSheet,
    experiences: appliedPlan.editorial.experiences,
  })
  const guardedSheet = await readPostsSheet({
    auth,
    spreadsheetId: configuration.spreadsheetId,
    postsRange: postsStructure.title,
  })
  const verifiedAt = new Date().toISOString()
  const currentTarget = guardedSheet.rows.find(
    row => String(row.post_id || "").trim() === selected.row.post_id
  )
  const sourceRevision =
    currentTarget?.last_processed_hash === processedHash
      ? String(currentTarget.source_revision || "1")
      : nextSourceRevision(currentTarget || selected.row)
  const writeback = buildPublicationWriteback({
    sheetId: postsStructure.sheetId,
    headers: guardedSheet.headers,
    rows: guardedSheet.rows,
    postId: selected.row.post_id,
    expectedSheetSourceHash: sheetSourceHash,
    processedHash,
    deploymentSha: deployment.mainMergeSha,
    atlasUrl: destination.url,
    atlasUrlLevel: destination.level,
    verifiedAt,
    experienceId: appliedPlan.experienceId,
    momentId: appliedPlan.momentId,
    sourceRevision,
    journeyId: selected.row.journey_id,
    placeId: selected.row.place_id,
    visitId: selected.row.visit_id,
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
      throw new Error(`Sheet write-back verification failed for ${header}`)
    }
  }
  const result = {
    ...preview,
    remoteChanges: "verified",
    destination,
    deployment: {
      branch: deployment.branch,
      developPull: deployment.developPull,
      developMergeSha: deployment.developMergeSha,
      mainPull: deployment.mainPull,
      mainMergeSha: deployment.mainMergeSha,
      workflowRun: deployment.deployment.runId,
    },
    catalog: catalogSummary,
    sheetWriteback: { rowNumber: writeback.rowNumber, verifiedAt },
  }
  writePrivateJson(path.join(runDirectory, "publication-result.json"), result)
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(`Editorial publication failed: ${error.message}`)
  process.exitCode = 1
})
