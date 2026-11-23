import assert from "node:assert/strict"
import {
  buildStaysSheetSetup,
  STAYS_HEADERS,
  STAYS_MANAGED_HEADERS,
  STAYS_GUIDE_ROWS,
  STAYS_ROW_COUNT,
} from "./lib/editorial-stays-sheet.mjs"

const sheets = [
  { title: "Sheet1", sheetId: 1000 },
  { title: "Atlas Reference", sheetId: 1002 },
]
const original = JSON.stringify(sheets)
const plan = buildStaysSheetSetup({
  sheets,
  journeyLabels: [
    "Puerto Rico (2024)",
    "Costa Rica (2025)",
    "Costa Rica (2025)",
  ],
})
assert.equal(JSON.stringify(sheets), original)
assert.deepEqual(plan.created, [
  { title: "Stays", sheetId: 1001 },
  { title: "Stays Instructions", sheetId: 1003 },
])
assert.equal(new Set(STAYS_HEADERS).size, STAYS_HEADERS.length)
// Every mutation targets only a newly allocated tab, including nested ranges.
function inspect(value) {
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    if (key === "sheetId") assert.ok([1001, 1003].includes(item))
    else inspect(item)
  }
}
plan.requests.forEach(inspect)
const intake = plan.requests.find(
  r => r.updateCells?.start.sheetId === 1001
).updateCells
assert.equal(intake.rows.length, STAYS_ROW_COUNT)
for (const row of intake.rows.slice(1)) {
  for (const [name, expected] of [
    ["Atlas Mode", "Off"],
    ["Review Status", "Draft"],
    ["Location Precision", "Town / area"],
    ["Show on Map", "No"],
  ]) {
    assert.equal(
      row.values[STAYS_HEADERS.indexOf(name)].userEnteredValue.stringValue,
      expected
    )
  }
  for (const name of [
    "Property Name",
    "Public Coordinates",
    "Property URL",
    ...STAYS_MANAGED_HEADERS,
  ]) {
    assert.equal(
      row.values[STAYS_HEADERS.indexOf(name)].userEnteredValue.stringValue,
      ""
    )
  }
}
const dropdown = name =>
  plan.requests.find(
    r =>
      r.setDataValidation?.range.startColumnIndex ===
      STAYS_HEADERS.indexOf(name)
  ).setDataValidation.rule
assert.deepEqual(
  dropdown("Atlas Mode").condition.values.map(v => v.userEnteredValue),
  ["Off", "Preview", "Publish"]
)
assert.deepEqual(
  dropdown("Atlas Journey").condition.values.map(v => v.userEnteredValue),
  ["Costa Rica (2025)", "Puerto Rico (2024)"]
)
assert.equal(dropdown("Atlas Mode").strict, true)
assert.match(STAYS_GUIDE_ROWS[1][1], /unchanged saved preview/)
assert.match(
  STAYS_GUIDE_ROWS.find(row => row[0] === "Coordinate format")[1],
  /does not blur/
)
assert.throws(
  () =>
    buildStaysSheetSetup({
      sheets: [...sheets, { title: "Stays", sheetId: 42 }],
      journeyLabels: ["Trip"],
    }),
  /left untouched/
)
assert.throws(
  () => buildStaysSheetSetup({ sheets, journeyLabels: [] }),
  /No canonical/
)
const repeat = buildStaysSheetSetup({
  sheets: [...sheets, ...plan.created],
  journeyLabels: ["Trip"],
})
assert.deepEqual(repeat.requests, [])
assert.equal(repeat.alreadyExists, true)
console.log(
  "Stays setup: safe defaults, isolated atomic requests, privacy guidance, dropdowns and repeat protection passed"
)
