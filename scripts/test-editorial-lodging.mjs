import assert from "node:assert/strict"
import fs from "node:fs/promises"
import commercialLinks from "../src/content/commercial-links.js"
import {
  planLodgingImport,
  lodgingSourceHash,
  selectLodgingRow,
  lodgingWriteback,
  LODGING_RECORDS_PATH,
} from "./lib/editorial-lodging.mjs"
import { normalizePublicationPaths } from "./lib/editorial-github.mjs"
import { composeJourneyLodging } from "../src/content/lodging/index.mjs"

const current = { schemaVersion: 1, partners: [], stays: [] }
const journey = {
  id: "test-journey-2026",
  title: "Test journey (2026)",
  slug: "test-journey-2026",
  visits: [{ id: "town-visit", placeId: "town" }],
  lodging: [],
}
const row = {
  "Property Name": "Test lodging",
  "Atlas Journey": journey.title,
  "Atlas Mode": "Preview",
  "Review Status": "Ready for preview",
  "Property Type": "Hotel",
  "Property URL": "https://example.com/lodging?ref=original",
  "Public Location": "Town",
  "Public Coordinates": "9.25, -83.12",
  "Location Precision": "Town / area",
  "Show on Map": "No",
  "Check-in Date": "2026-06-10",
  "Check-out Date": "2026-06-13",
  Nights: "3",
  "Stay Notes": "PRIVATE SOURCE EVIDENCE",
  "Atlas Story": "A useful base for our trip.",
  Relationship: "Independent",
  "Private Notes": "PRIVATE FOLLOW-UP",
  "Drive Folder": "PRIVATE DRIVE URL",
  "Cover Asset ID": "test-cover",
}
const context = {
  sourceKey: "workbook:2",
  current,
  journeys: [journey],
  partners: [],
  media: [{ id: "test-cover", kind: "image", rights: { status: "owned" } }],
  places: [{ id: "town", name: "Town", coordinates: [-83.12, 9.25] }],
}
const first = planLodgingImport({ row, ...context })
assert.equal(first.stay.nights, 3)
assert.deepEqual(first.stay.publicCoordinates, [-83.12, 9.25])
assert.equal(first.stay.image.assetId, "test-cover")
assert.equal(first.records.partners.length, 1)
assert.deepEqual(current.stays, [])
assert.equal(JSON.stringify(first.records).includes("PRIVATE"), false)
assert.equal(JSON.stringify(first.records).includes("Drive Folder"), false)
assert.equal(first.summary.map, null)
assert.equal(first.partner.externalLinks.official, row["Property URL"])
const other = planLodgingImport({
  row: {
    ...row,
    "Check-in Date": "2026-07-10",
    "Check-out Date": "2026-07-13",
  },
  ...context,
  current: first.records,
  sourceKey: "workbook:3",
})
assert.equal(other.records.partners.length, 1)
assert.equal(other.records.stays.length, 2)
assert.equal(other.stay.partnerId, first.stay.partnerId)
const identicalOccurrence = planLodgingImport({
  row,
  ...context,
  current: first.records,
  sourceKey: "workbook:4",
})
assert.equal(
  identicalOccurrence.records.stays.length,
  2,
  "Identical rows are separate occurrences, not content-deduplicated stays"
)
assert.notEqual(identicalOccurrence.stay.id, first.stay.id)
const reusedRow = planLodgingImport({
  row: {
    ...row,
    "Check-in Date": "2026-08-10",
    "Check-out Date": "2026-08-13",
  },
  ...context,
  current: first.records,
})
assert.equal(
  reusedRow.records.stays.length,
  2,
  "Reusing an unbound source row does not silently replace a published occurrence"
)
const update = planLodgingImport({
  row: {
    ...row,
    stay_id: first.stay.id,
    partner_id: first.partner.id,
    "Atlas Story": "A revised account of our stay.",
  },
  ...context,
  current: other.records,
})
assert.equal(update.stay.id, first.stay.id)
assert.equal(update.records.stays.length, 2)
assert.deepEqual(
  update.records.stays.find(stay => stay.id === other.stay.id),
  other.stay
)
assert.deepEqual(
  planLodgingImport({ row, ...context, current: first.records }).records,
  first.records
)
assert.equal(
  lodgingSourceHash({
    ...row,
    "Atlas Mode": "Publish",
    stay_id: first.stay.id,
  }),
  first.sourceHash
)
assert.notEqual(
  lodgingSourceHash({ ...row, "Atlas Story": "Changed public copy." }),
  first.sourceHash
)
const privateProperty = planLodgingImport({
  row: { ...row, "Property URL": "" },
  ...context,
})
assert.equal(privateProperty.partner.linkPolicy, "omitted-for-privacy")
assert.deepEqual(privateProperty.partner.externalLinks, {})
const otherTown = planLodgingImport({
  row: { ...row, "Property URL": "", "Public Location": "Another town" },
  ...context,
  current: privateProperty.records,
  sourceKey: "workbook:5",
})
assert.notEqual(
  otherTown.partner.id,
  privateProperty.partner.id,
  "Broad private labels in different towns do not identify one property"
)
for (const patch of [
  { "Atlas Journey": "Unknown" },
  { "Property URL": "javascript:alert(1)" },
  { "Check-out Date": "2026-06-09" },
  { Nights: "4" },
  { "Public Coordinates": "181, 95" },
  { "Public Coordinates": "unknown, 2" },
  { "Cover Asset ID": "missing" },
  { Relationship: "Needs review" },
  { Relationship: "Sponsored", Disclosure: "" },
  { "Show on Map": "Yes" },
  { "Atlas Story": "Story — invention" },
  { "Atlas Story": "Placeholder" },
])
  assert.throws(() =>
    planLodgingImport({ row: { ...row, ...patch }, ...context })
  )
const map = planLodgingImport({
  row: { ...row, "Show on Map": "Yes" },
  ...context,
  placeId: "town",
  visitId: "town-visit",
})
assert.deepEqual(map.summary.map, { placeId: "town", visitId: "town-visit" })
assert.equal(context.places.length, 1)
assert.equal(journey.visits.length, 1)
assert.equal(composeJourneyLodging(journey), journey)
assert.throws(() => selectLodgingRow([row, row]))
assert.throws(() =>
  selectLodgingRow([{ ...row, "Atlas Mode": "Off" }], { rowNumber: 2 })
)
assert.throws(() => selectLodgingRow([row], { apply: true }))
assert.equal(selectLodgingRow([row]).rowNumber, 2)
const approved = { ...row, "Atlas Mode": "Publish" }
const values = {
  stay_id: first.stay.id,
  partner_id: first.partner.id,
  atlas_status: "Compiled locally",
}
const headers = [...Object.keys(row), ...Object.keys(values)]
const writeback = lodgingWriteback({
  sheetId: 1000,
  headers,
  rows: [approved],
  selected: { rowNumber: 2 },
  expectedHash: first.sourceHash,
  values,
})
assert.equal(writeback.length, 3)
assert.ok(
  writeback.every(
    request =>
      request.updateCells.start.sheetId === 1000 &&
      request.updateCells.start.rowIndex === 1
  )
)
assert.throws(() =>
  lodgingWriteback({
    sheetId: 1000,
    headers,
    rows: [{ ...approved, "Public Location": "Changed" }],
    selected: { rowNumber: 2 },
    expectedHash: first.sourceHash,
    values,
  })
)
assert.deepEqual(normalizePublicationPaths([LODGING_RECORDS_PATH]), [
  LODGING_RECORDS_PATH,
])
// Exercise the actual component handler with a stay occurrence ID distinct from
// its reusable Partner ID; analytics must continue grouping by the property.
const viewSource = await fs.readFile(
  "src/views/roam/RoamTripOverview.vue",
  "utf8"
)
const handler = viewSource.match(
  /    trackLodgingClick\(stay\) \{([\s\S]*?)\n    \},/
)[1]
let clicked
const track = new Function(
  "commercialLinks",
  "trackAnalyticsEvent",
  "stay",
  handler
)
track.call(
  { trip: { journeyId: journey.id } },
  commercialLinks,
  (name, parameters) => {
    clicked = { name, parameters }
  },
  { ...first.stay, linkType: "website" }
)
assert.equal(clicked.parameters.partner_id, first.partner.id)
assert.notEqual(clicked.parameters.partner_id, first.stay.id)
console.log(
  "Editorial lodging: explicit approval, Partner reuse, repeated stays, updates, privacy, dates/media/maps and guarded write-back passed"
)
