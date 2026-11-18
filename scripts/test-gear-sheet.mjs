import assert from "node:assert/strict"
import { createRequire } from "node:module"
import {
  createGearWorkbookBuffer,
  listGearWorkbookEntries,
} from "./generate-gear-workbook.mjs"
import { buildGearWriteback } from "./ingest-gear-sheet.mjs"

const require = createRequire(import.meta.url)
const {
  GEAR_SHEET_HEADERS,
  planGearSheetIngestion,
  selectGearSheetRows,
} = require("./lib/gear-tracking-sheet.js")

const context = {
  journeys: [
    {
      id: "test-journey-2026",
      visits: [{ id: "test-journey-2026-stop", placeId: "test-stop" }],
    },
  ],
  media: [],
  partners: [
    {
      id: "test-affiliate",
      relationship: "affiliate-program",
      commercialHosts: ["example.com"],
    },
    {
      id: "amazon-associates",
      relationship: "affiliate-program",
      commercialHosts: ["amazon.com", "amzn.to", "a.co"],
    },
  ],
  approvedGearTrackingRulePartnerIds: [],
}
const records = { schemaVersion: 1, items: [], usage: [] }

function emptyRow() {
  return Object.fromEntries(GEAR_SHEET_HEADERS.map(header => [header, ""]))
}

const previewRow = {
  ...emptyRow(),
  Workflow: "Preview",
  "Gear ID": "test-camera",
  "Product Name": "Test Camera",
  Category: "camera",
  Brand: "Test Brand",
  Model: "T1",
  "Verification Status": "verified",
  "Journey ID": "test-journey-2026",
  "Visit ID": "test-journey-2026-stop",
  "Usage Type": "used",
  Evidence: "creator-confirmed",
  Visibility: "published",
  "Usage Notes": "Test fixture only.",
  "Would Bring Again": "TRUE",
  Featured: "FALSE",
  "Official URL": "https://example.com/test-camera",
  "Official URL Verified": "TRUE",
}
const sheet = { headers: [...GEAR_SHEET_HEADERS], rows: [previewRow] }
const preview = planGearSheetIngestion({
  context,
  mode: "preview",
  records,
  sheet,
})
assert.deepEqual(preview.errors, [])
assert.equal(preview.selectedCount, 1)
assert.deepEqual(preview.summary.created, ["test-camera"])
assert.equal(preview.records.items[0].links[0].trackingMode, "none")
assert.equal(preview.records.usage[0].wouldBringAgain, true)

const amazonUrl =
  "https://www.amazon.com/dp/B000000000?tag=owner-supplied-20"
const amazonPreview = planGearSheetIngestion({
  context,
  mode: "preview",
  records,
  sheet: {
    headers: [...GEAR_SHEET_HEADERS],
    rows: [
      {
        ...previewRow,
        "Gear ID": "amazon-test-camera",
        "Product Name": "Amazon test camera",
        "Affiliate URL": amazonUrl,
        "Affiliate Link Label": "View on Amazon",
        "Affiliate URL Verified": "TRUE",
        "Affiliate Partner ID": "amazon-associates",
        "Affiliate Tracking Mode": "custom",
      },
    ],
  },
})
assert.deepEqual(amazonPreview.errors, [])
assert.equal(amazonPreview.records.items[0].links[1].url, amazonUrl)
assert.equal(
  amazonPreview.records.items[0].links[1].partnerId,
  "amazon-associates"
)
assert.equal(amazonPreview.records.items[0].links[1].trackingMode, "custom")

const ignoredApply = planGearSheetIngestion({
  context,
  mode: "apply",
  records,
  sheet,
})
assert.equal(ignoredApply.selectedCount, 0)

const publishRow = { ...previewRow, Workflow: "Publish" }
const apply = planGearSheetIngestion({
  context,
  mode: "apply",
  records,
  sheet: { headers: [...GEAR_SHEET_HEADERS], rows: [publishRow] },
})
assert.deepEqual(apply.errors, [])
assert.equal(apply.successfulRows.length, 1)
assert.match(apply.successfulRows[0].hash, /^[a-f0-9]{64}$/)

const writeback = buildGearWriteback({
  gearRange: "Gear Tracker",
  headers: GEAR_SHEET_HEADERS,
  rows: apply.successfulRows,
  updatedAt: "2026-11-17T12:00:00.000Z",
})
assert.equal(writeback.length, 5)
assert.deepEqual(writeback[0], {
  range: "'Gear Tracker'!A2",
  values: [["Published"]],
})
assert.equal(writeback[3].values[0][0], apply.successfulRows[0].hash)

const invalidWorkflow = selectGearSheetRows(
  {
    headers: [...GEAR_SHEET_HEADERS],
    rows: [{ ...emptyRow(), Workflow: "Go" }],
  },
  "preview"
)
assert(invalidWorkflow.errors.some(error => error.includes("unsupported Workflow")))

const invalidBoolean = planGearSheetIngestion({
  context,
  mode: "preview",
  records,
  sheet: {
    headers: [...GEAR_SHEET_HEADERS],
    rows: [
      {
        ...previewRow,
        "Would Bring Again": "sometimes",
      },
    ],
  },
})
assert(
  invalidBoolean.errors.some(error => error.includes("Would Bring Again"))
)

const workbook = createGearWorkbookBuffer()
assert.equal(workbook.readUInt32LE(0), 0x04034b50)
assert.match(workbook.toString("utf8"), /amazon-associates/)
const entries = listGearWorkbookEntries(workbook)
;[
  "[Content_Types].xml",
  "xl/workbook.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
  "xl/worksheets/sheet4.xml",
  "xl/tables/table1.xml",
  "xl/tables/table2.xml",
].forEach(entry => assert(entries.includes(entry), `Missing workbook entry ${entry}`))

console.log("Gear Sheet and workbook tests passed.")
