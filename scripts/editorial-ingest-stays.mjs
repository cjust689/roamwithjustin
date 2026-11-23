import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { parseArgs } from "node:util"
import { fileURLToPath } from "node:url"
import {
  authorizeGoogleReadOnly,
  SHEETS_SCOPE,
  SHEETS_READONLY_SCOPE,
} from "./lib/editorial-google-auth.mjs"
import {
  readNamedSheet,
  readSpreadsheetSheets,
} from "./lib/editorial-google-sheets.mjs"
import {
  planLodgingImport,
  selectLodgingRow,
  lodgingWriteback,
  LODGING_RECORDS_PATH,
} from "./lib/editorial-lodging.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { partnerRecords } from "../src/content/partners/index.mjs"
import { mediaRecords } from "../src/content/media/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  createCommandRunner,
  publishGeneratedPost,
  verifyPublicPublication,
} from "./lib/editorial-github-publisher.mjs"
import {
  createGitHubClient,
  loadGitHubCredential,
  parseGitHubRemote,
} from "./lib/editorial-github.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const target = path.join(root, LODGING_RECORDS_PATH)
const digest = value =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")
const json = filename =>
  JSON.parse(fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, ""))
const { values } = parseArgs({
  options: {
    preview: { type: "boolean" },
    apply: { type: "boolean" },
    deploy: { type: "boolean" },
    help: { type: "boolean" },
    file: { type: "string" },
    "spreadsheet-id": { type: "string" },
    "token-path": { type: "string" },
    row: { type: "string" },
    "stay-id": { type: "string" },
    "place-id": { type: "string" },
    "visit-id": { type: "string" },
  },
})
function privateJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  })
}
async function main() {
  if (values.help) {
    console.log(
      "npm run editorial:stays -- --spreadsheet-id ID --row 2 --preview\nnpm run editorial:stays -- --spreadsheet-id ID --row 2 --apply [--deploy]\nAlternative source: --file rows.json (array or {rows:[]}). Preview is the default. Apply requires Publish, Ready for preview and an unchanged saved preview. It compiles locally and writes Compiled locally, not Published. Optional --deploy uses the existing protected GitHub/Pages publisher and writes Published only after rendered verification. No media upload, automatic geocoding or My Atlas account access. Show on Map Yes requires --place-id/--visit-id referencing already reviewed geography."
    )
    return
  }
  if ((values.apply && values.preview) || (values.deploy && !values.apply))
    throw Error("Choose preview or apply; --deploy requires --apply")
  const spreadsheetId =
    values["spreadsheet-id"] || process.env.EDITORIAL_GOOGLE_SPREADSHEET_ID
  if (Boolean(values.file) === Boolean(spreadsheetId))
    throw Error("Supply exactly one --file or --spreadsheet-id")
  if (spreadsheetId && !/^[\w-]+$/.test(spreadsheetId))
    throw Error("Invalid spreadsheet ID")
  const rowNumber = values.row ? Number(values.row) : undefined
  if (
    rowNumber !== undefined &&
    (!Number.isSafeInteger(rowNumber) || rowNumber < 2)
  )
    throw Error("--row must be a sheet row number of at least 2")
  if (rowNumber && values["stay-id"]) throw Error("Choose --row or --stay-id")
  let auth, sheetId
  if (spreadsheetId) {
    auth = await authorizeGoogleReadOnly(
      {
        tokenPath: path.resolve(
          values["token-path"] ||
            process.env.EDITORIAL_GOOGLE_TOKEN_PATH ||
            path.join(
              os.homedir(),
              ".roam-with-justin",
              "editorial-google-token.json"
            )
        ),
        scopes: [values.apply ? SHEETS_SCOPE : SHEETS_READONLY_SCOPE],
      },
      {
        interactiveAuthorize: async () => {
          throw Error(
            "Use existing editorial Google authorization before running Stays ingestion"
          )
        },
      }
    )
    sheetId = (await readSpreadsheetSheets({ auth, spreadsheetId })).find(
      sheet => sheet.title === "Stays"
    )?.sheetId
    if (sheetId === undefined)
      throw Error("Stays tab is missing; run editorial:stays:setup first")
  }
  const read = async () => {
    if (auth) return readNamedSheet({ auth, spreadsheetId, range: "Stays" })
    const source = json(path.resolve(values.file))
    const rows = Array.isArray(source) ? source : source.rows
    if (!Array.isArray(rows)) throw Error("Source must contain a rows array")
    return {
      headers: [...new Set(rows.flatMap(row => Object.keys(row)))],
      rows,
    }
  }
  let source = await read()
  if (
    !values.apply &&
    !rowNumber &&
    !values["stay-id"] &&
    !source.rows.some(row => ["Preview", "Publish"].includes(row["Atlas Mode"]))
  ) {
    console.log(
      JSON.stringify(
        {
          eligibleRows: 0,
          changed: false,
          next: "Fill a stay, set Review Status to Ready for preview and Atlas Mode to Preview, then rerun with --row.",
        },
        null,
        2
      )
    )
    return
  }
  let selected = selectLodgingRow(source.rows, {
    rowNumber,
    stayId: values["stay-id"],
    apply: values.apply,
  })
  const sourceKey = `${spreadsheetId || path.resolve(values.file)}:${selected.rowNumber}`
  const current = json(target)
  const plan = planLodgingImport({
    row: selected.row,
    sourceKey,
    current,
    journeys: journeyRecords,
    partners: partnerRecords,
    media: mediaRecords,
    places: placeRecords,
    placeId: values["place-id"],
    visitId: values["visit-id"],
  })
  const receiptFile = path.join(
    root,
    ".state/editorial/stays",
    digest(sourceKey) + ".preview.json"
  )
  const receipt = {
    sourceHash: plan.sourceHash,
    beforeHash: digest(current),
    afterHash: digest(plan.records),
    summary: plan.summary,
    stay: plan.stay,
    partner: plan.partner,
  }
  if (!values.apply) {
    privateJson(receiptFile, receipt)
    console.log(
      JSON.stringify(
        {
          mode: "preview",
          ...receipt,
          receipt: receiptFile,
          changed: false,
          next: "Review the stay and property diff, change Atlas Mode to Publish, then run --apply. --deploy additionally promotes through protected develop/main.",
        },
        null,
        2
      )
    )
    return
  }
  if (!fs.existsSync(receiptFile))
    throw Error("Run --preview and review its output before applying")
  const approved = json(receiptFile)
  if (
    approved.sourceHash !== plan.sourceHash ||
    approved.afterHash !== digest(plan.records) ||
    ![approved.beforeHash, approved.afterHash].includes(digest(current))
  )
    throw Error(
      "Source or generated content changed since preview. Run --preview again before applying."
    )
  source = await read()
  const confirmed = selectLodgingRow(source.rows, {
    rowNumber: selected.rowNumber,
    apply: true,
  })
  const recheck = planLodgingImport({
    row: confirmed.row,
    sourceKey,
    current,
    journeys: journeyRecords,
    partners: partnerRecords,
    media: mediaRecords,
    places: placeRecords,
    placeId: values["place-id"],
    visitId: values["visit-id"],
  })
  if (
    digest(recheck.records) !== approved.afterHash ||
    digest(json(target)) !== digest(current)
  )
    throw Error(
      "Stay source changed before apply; no generated files were written"
    )
  const command = createCommandRunner()
  const original = fs.readFileSync(target, "utf8")
  const temporary = target + `.${process.pid}.tmp`
  try {
    fs.writeFileSync(temporary, JSON.stringify(plan.records, null, 2) + "\n", {
      flag: "wx",
    })
    fs.renameSync(temporary, target)
    command(process.execPath, ["scripts/validate-content.js"], { cwd: root })
    command(process.execPath, ["scripts/audit-lodging-links.mjs", "--check"], {
      cwd: root,
    })
  } catch (error) {
    fs.writeFileSync(target, original)
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    throw Error(`Lodging apply rolled back: ${error.message}`)
  }
  let deployment = null
  const publicUrl = `https://roamwithjustin.com${plan.summary.url}`
  if (values.deploy) {
    const repository = parseGitHubRemote(
      command("git", ["remote", "get-url", "origin"], { cwd: root })
    )
    const client = createGitHubClient({
      ...repository,
      token: loadGitHubCredential().token,
    })
    const verification = {
      url: publicUrl,
      expectedMarkers: [`data-stay-id="${plan.stay.id}"`, plan.stay.name],
    }
    deployment = await publishGeneratedPost({
      sourceRoot: root,
      stateRoot: path.join(root, ".state/editorial/github"),
      postId: plan.stay.id,
      label: `Stay ${plan.stay.name}`,
      paths: [LODGING_RECORDS_PATH],
      client,
      owner: repository.owner,
      command,
      publicVerification: verification,
    })
    if (deployment.state === "unchanged")
      await verifyPublicPublication(verification)
    else if (deployment.state !== "deployed")
      throw Error(
        "Lodging deployment was not verified; no Published receipt written"
      )
  }
  if (auth) {
    const latest = await read()
    const writeValues = {
      stay_id: plan.stay.id,
      partner_id: plan.partner.id,
      journey_id: plan.stay.journeyId,
      place_id: plan.stay.placeId || "",
      visit_id: plan.stay.visitId || "",
      source_hash: plan.sourceHash,
      atlas_status: deployment ? "Published" : "Compiled locally",
      atlas_url: deployment ? publicUrl : "",
      last_verified_at: deployment ? new Date().toISOString() : "",
      sync_error: "",
    }
    const requests = lodgingWriteback({
      sheetId,
      ...latest,
      selected,
      expectedHash: plan.sourceHash,
      values: writeValues,
    })
    await auth.request({
      method: "POST",
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      data: { requests },
    })
    const actual = (await read()).rows[selected.rowNumber - 2]
    if (
      Object.entries(writeValues).some(([key, value]) => actual[key] !== value)
    )
      throw Error(
        "Stay write-back readback failed; inspect the saved records before retrying"
      )
  }
  privateJson(
    path.join(path.dirname(receiptFile), digest(sourceKey) + ".result.json"),
    {
      sourceHash: plan.sourceHash,
      summary: plan.summary,
      state: deployment ? "Published" : "Compiled locally",
      deployment,
    }
  )
  console.log(
    JSON.stringify(
      {
        ...plan.summary,
        state: deployment ? "Published" : "Compiled locally",
        deployment,
        sheetWriteback: Boolean(auth),
      },
      null,
      2
    )
  )
}
main().catch(error => {
  console.error(error.response?.data?.error?.message || error.message)
  process.exitCode = 1
})
