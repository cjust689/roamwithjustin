import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { parseArgs } from "node:util"
import {
  authorizeGoogleReadOnly,
  SHEETS_READONLY_SCOPE,
  SHEETS_SCOPE,
} from "./lib/editorial-google-auth.mjs"
import {
  buildStaysSheetSetup,
  STAYS_HEADERS,
  STAYS_MANAGED_HEADERS,
  STAYS_GUIDE_ROWS,
  STAYS_ROW_COUNT,
} from "./lib/editorial-stays-sheet.mjs"

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
    "spreadsheet-id": { type: "string" },
    "token-path": { type: "string" },
  },
})

async function main() {
  if (values.help) {
    console.log(
      "npm run editorial:stays:setup -- --spreadsheet-id ID [--apply] [--token-path PATH]\nDefault: inspect and preview only. Apply atomically adds Stays and Stays Instructions, never changes existing tabs. Requires saved Google Sheets authorization; no interactive consent or credential output. This sets up intake, not a stay publisher."
    )
    return
  }
  const spreadsheetId =
    values["spreadsheet-id"] || process.env.EDITORIAL_GOOGLE_SPREADSHEET_ID
  if (!spreadsheetId || !/^[\w-]+$/.test(spreadsheetId))
    throw new Error("A valid --spreadsheet-id is required")
  const auth = await authorizeGoogleReadOnly(
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
        throw new Error(
          "Existing Google authorization is required. Use the established editorial authorization workflow before running setup."
        )
      },
    }
  )
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
  const readMetadata = async () =>
    (
      await auth.request({
        method: "GET",
        url: root,
        params: {
          fields:
            "properties(title),sheets(properties,protectedRanges,tables,basicFilter)",
        },
      })
    ).data
  const readValues = async titles => {
    const url = new URL(`${root}/values:batchGet`)
    for (const title of titles)
      url.searchParams.append("ranges", `'${title.replace(/'/g, "''")}'!A:ZZ`)
    url.searchParams.set("valueRenderOption", "FORMULA")
    return (await auth.request({ method: "GET", url: url.toString() })).data
      .valueRanges
  }
  const before = await readMetadata()
  const sheets = before.sheets.map(sheet => sheet.properties)
  if (!sheets.some(sheet => sheet.title === "Atlas Reference"))
    throw new Error(
      "Expected Atlas Reference is missing. Check that this is the trips/journeys ingestion workbook."
    )
  const existingValues = await readValues(sheets.map(sheet => sheet.title))
  const reference = existingValues.find(sheet =>
    sheet.range.startsWith("'Atlas Reference'!")
  )
  const referenceRows = reference?.values || []
  const typeIndex = referenceRows[0]?.indexOf("Type")
  const journeyIndex = referenceRows[0]?.indexOf("Journey")
  if (
    !Number.isInteger(typeIndex) ||
    !Number.isInteger(journeyIndex) ||
    typeIndex < 0 ||
    journeyIndex < 0
  )
    throw new Error(
      "Atlas Reference schema does not match the editorial workbook"
    )
  const plan = buildStaysSheetSetup({
    sheets,
    journeyLabels: referenceRows
      .slice(1)
      .filter(row => row[typeIndex] === "Journey")
      .map(row => row[journeyIndex]),
  })
  const summary = {
    workbook: before.properties.title,
    apply: values.apply,
    created: plan.created,
    alreadyExists: plan.alreadyExists,
    publishingConnected: true,
  }
  if (!values.apply || !plan.requests.length) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const hash = data =>
    createHash("sha256").update(JSON.stringify(data)).digest("hex")
  const beforeHash = hash({ metadata: before, values: existingValues })
  const backupDirectory = path.resolve(".state/editorial")
  await fs.mkdir(backupDirectory, { recursive: true })
  const backup = path.join(
    backupDirectory,
    `stays-setup-${new Date().toISOString().replace(/[:.]/g, "-")}-before.json`
  )
  await fs.writeFile(
    backup,
    JSON.stringify(
      { spreadsheetId, metadata: before, values: existingValues },
      null,
      2
    ),
    { flag: "wx" }
  )
  // Recheck after preparing the plan; stale snapshots must not trigger a write.
  if (
    hash({
      metadata: await readMetadata(),
      values: await readValues(sheets.map(sheet => sheet.title)),
    }) !== beforeHash
  )
    throw new Error(
      "Workbook changed during setup. No changes applied; rerun after review."
    )
  await auth.request({
    method: "POST",
    url: `${root}:batchUpdate`,
    data: { requests: plan.requests },
  })
  const after = await readMetadata()
  const existingIds = new Set(sheets.map(sheet => sheet.sheetId))
  const existingAfter = {
    ...after,
    sheets: after.sheets.filter(sheet =>
      existingIds.has(sheet.properties.sheetId)
    ),
  }
  const valuesAfter = await readValues(sheets.map(sheet => sheet.title))
  if (hash({ metadata: existingAfter, values: valuesAfter }) !== beforeHash)
    throw new Error(
      `Stays tabs were added, but existing workbook data changed during verification. Review backup ${backup}; no automatic rollback attempted.`
    )
  const addedValues = await readValues(plan.created.map(sheet => sheet.title))
  const intake = addedValues[0].values
  if (JSON.stringify(intake[0]) !== JSON.stringify(STAYS_HEADERS))
    throw new Error("Stays header readback failed")
  for (const [name, expected] of [
    ["Atlas Mode", "Off"],
    ["Review Status", "Draft"],
    ["Location Precision", "Town / area"],
    ["Show on Map", "No"],
  ]) {
    const column = STAYS_HEADERS.indexOf(name)
    if (
      intake.length !== STAYS_ROW_COUNT ||
      intake.slice(1).some(row => row[column] !== expected)
    )
      throw new Error(`Stays safe default readback failed: ${name}`)
  }
  if (
    JSON.stringify(addedValues[1].values) !== JSON.stringify(STAYS_GUIDE_ROWS)
  )
    throw new Error("Stays instructions readback failed")
  const grid = (
    await auth.request({
      method: "GET",
      url: root,
      params: {
        ranges: "'Stays'!A1:AE201",
        fields:
          "sheets(properties,data(rowData(values(dataValidation,note)),columnMetadata(hiddenByUser)))",
      },
    })
  ).data.sheets[0]
  if (
    grid.properties.gridProperties.frozenRowCount !== 1 ||
    grid.properties.gridProperties.frozenColumnCount !== 2
  )
    throw new Error("Stays frozen header readback failed")
  const rowData = grid.data[0].rowData
  for (const request of plan.requests.filter(
    request => request.setDataValidation
  )) {
    const { range, rule } = request.setDataValidation
    for (
      let index = range.startRowIndex;
      index < range.endRowIndex;
      index += 1
    ) {
      const actual =
        rowData[index]?.values?.[range.startColumnIndex]?.dataValidation
      if (
        JSON.stringify(actual?.condition) !== JSON.stringify(rule.condition) ||
        actual.strict !== true
      )
        throw new Error("Stays validation rule readback failed")
    }
  }
  for (const name of STAYS_MANAGED_HEADERS) {
    if (!grid.data[0].columnMetadata[STAYS_HEADERS.indexOf(name)]?.hiddenByUser)
      throw new Error("Stays managed column visibility readback failed")
  }
  if (
    !rowData[0].values[STAYS_HEADERS.indexOf("Atlas Mode")].note.includes(
      "Flags alone do not run"
    )
  )
    throw new Error("Stays publishing boundary note missing")
  console.log(
    JSON.stringify(
      {
        ...summary,
        existingTabsUnchanged: true,
        preparedRows: STAYS_ROW_COUNT - 1,
        headersVerified: STAYS_HEADERS.length,
        dropdownsAndHiddenColumnsVerified: true,
        backup,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${plan.created[0].sheetId}`,
      },
      null,
      2
    )
  )
}

main().catch(error => {
  // Never print OAuth request objects, headers or tokens on API failures.
  console.error(error.response?.data?.error?.message || error.message)
  process.exitCode = 1
})
