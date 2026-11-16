import assert from "node:assert/strict"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
} from "./lib/editorial-baseline.mjs"
import {
  applyPostsMigration,
  buildPostsMigration,
  originalFieldSnapshot,
} from "./lib/editorial-google-migration.mjs"

const rows = [
  {
    Location: "Miami",
    "Series/Post": "First post",
    Status: "Ready",
    Account: "Roam",
    Type: "Carousel",
    Caption: "Caption one",
    "Drive Folder": "",
    Posted: "",
  },
  {
    Location: "Atlanta",
    "Series/Post": "Business post",
    Status: "Ready",
    Account: "WebWorks",
    Type: "Reel",
    Caption: "Caption two",
    "Drive Folder": "",
    Posted: "",
  },
  {
    Location: "Utah",
    "Series/Post": "Second post",
    Status: "Idea",
    Account: "Roam",
    Type: "Reel",
    Caption: "Caption three",
    "Drive Folder": "",
    Posted: "",
  },
]
let idCounter = 0
const plan = buildPostsMigration({
  sheetId: 87724606,
  gridColumnCount: 26,
  gridRowCount: 1000,
  headers: EXISTING_POST_HEADERS,
  rows,
  createPostId: () =>
    `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`,
})

assert.deepEqual(plan.summary, {
  eligibleRows: 2,
  ignoredRows: 1,
  visibleHeadersAdded: 8,
  automationHeadersAdded: 16,
  postIdsAssigned: 2,
  atlasModesDefaultedOff: 2,
  publishTargetsDefaultedSocial: 2,
  atlasPlacesBackfilled: 0,
  requestCount: plan.requests.length,
})
assert.equal(plan.finalHeaders.length, 32)
assert.deepEqual(plan.finalHeaders, [
  ...EXISTING_POST_HEADERS,
  ...ATLAS_POST_HEADERS,
  ...AUTOMATION_POST_HEADERS,
])
assert.deepEqual(
  plan.requests.find(request => request.appendDimension)?.appendDimension,
  { sheetId: 87724606, dimension: "COLUMNS", length: 6 }
)
assert.equal(
  plan.requests.filter(request => request.addProtectedRange).length,
  1
)
assert.equal(
  plan.requests.filter(request => request.updateDimensionProperties).length,
  1
)
assert.equal(
  plan.requests.filter(request => request.setDataValidation).length,
  2
)
assert.deepEqual(originalFieldSnapshot(rows)[0], rows[0])

const requestCalls = []
await applyPostsMigration({
  auth: null,
  spreadsheetId: "sheet/id",
  requests: plan.requests,
  request: async options => {
    requestCalls.push(options)
    return { data: { replies: [] } }
  },
})
assert.equal(requestCalls.length, 1)
assert.equal(
  requestCalls[0].url,
  "https://sheets.googleapis.com/v4/spreadsheets/sheet%2Fid:batchUpdate"
)
assert.equal(requestCalls[0].data.requests.length, plan.requests.length)

const migratedHeaders = [
  ...EXISTING_POST_HEADERS,
  ...ATLAS_POST_HEADERS,
  ...AUTOMATION_POST_HEADERS,
]
const migratedRows = rows.map((row, index) => ({
  ...row,
  "Atlas Mode": row.Account === "Roam" ? "Off" : "",
  "Publish To": row.Account === "Roam" ? "Social" : "",
  post_id: row.Account === "Roam" ? `post-${index}` : "",
}))
const noOp = buildPostsMigration({
  sheetId: 87724606,
  gridColumnCount: 32,
  gridRowCount: 1000,
  headers: migratedHeaders,
  rows: migratedRows,
})
assert.equal(noOp.requests.length, 0)
assert.equal(noOp.summary.postIdsAssigned, 0)

assert.throws(
  () =>
    buildPostsMigration({
      sheetId: 87724606,
      gridColumnCount: 32,
      gridRowCount: 1000,
      headers: migratedHeaders,
      rows: [
        { ...migratedRows[0], post_id: "duplicate-id" },
        { ...migratedRows[1], post_id: "duplicate-id" },
      ],
    }),
  /Duplicate post_id/
)

const previousAtlasHeaders = ATLAS_POST_HEADERS.filter(
  header => !["Publish To", "Atlas Place"].includes(header)
)
const upgradedHeaders = [
  ...EXISTING_POST_HEADERS,
  ...previousAtlasHeaders,
  ...AUTOMATION_POST_HEADERS,
]
const upgraded = buildPostsMigration({
  sheetId: 87724606,
  gridColumnCount: 30,
  gridRowCount: 1000,
  headers: upgradedHeaders,
  rows: [
    {
      ...rows[0],
      "Atlas Mode": "Off",
      post_id: "post-existing",
      place_id: "uvita-costa-rica",
      visit_id: "costa-rica-2025-uvita-costa-rica",
    },
  ],
  placeLabelById: new Map([["uvita-costa-rica", "Uvita"]]),
})
assert.deepEqual(upgraded.finalHeaders, [
  ...EXISTING_POST_HEADERS,
  ...previousAtlasHeaders,
  "Publish To",
  "Atlas Place",
  ...AUTOMATION_POST_HEADERS,
])
assert.equal(
  upgraded.requests.filter(request => request.insertDimension).length,
  1
)
assert.equal(upgraded.summary.publishTargetsDefaultedSocial, 1)
assert.equal(upgraded.summary.atlasPlacesBackfilled, 1)
assert.equal(
  upgraded.requests.filter(request => request.addProtectedRange).length,
  0
)

const liveHeaders = [
  ...EXISTING_POST_HEADERS,
  "Publish To:",
  ...previousAtlasHeaders,
  ...AUTOMATION_POST_HEADERS,
]
const liveUpgrade = buildPostsMigration({
  sheetId: 87724606,
  gridColumnCount: 31,
  gridRowCount: 1000,
  headers: liveHeaders,
  rows: [
    {
      ...rows[0],
      "Publish To:": "",
      "Atlas Mode": "Off",
      post_id: "post-live",
    },
  ],
  tables: [
    {
      tableId: "table-1",
      range: {
        sheetId: 87724606,
        startRowIndex: 0,
        endRowIndex: 10,
        startColumnIndex: 0,
        endColumnIndex: 31,
      },
      columnProperties: liveHeaders.map((columnName, columnIndex) => ({
        columnIndex,
        columnName,
      })),
    },
  ],
})
assert.deepEqual(liveUpgrade.finalHeaders, [
  ...EXISTING_POST_HEADERS,
  "Publish To",
  ...previousAtlasHeaders,
  "Atlas Place",
  ...AUTOMATION_POST_HEADERS,
])
assert.equal(liveUpgrade.summary.visibleHeadersAdded, 1)
assert.equal(
  liveUpgrade.requests.filter(request => request.insertDimension).length,
  1
)
assert.equal(
  liveUpgrade.requests.filter(request => request.setDataValidation).length,
  0
)
const tableUpdate = liveUpgrade.requests.find(request => request.updateTable)
assert.equal(tableUpdate.updateTable.table.range.endColumnIndex, 32)
assert.deepEqual(
  tableUpdate.updateTable.table.columnProperties
    .find(property => property.columnName === "Publish To")
    .dataValidationRule.condition.values.map(value => value.userEnteredValue),
  ["Social", "Atlas", "Both"]
)
assert.equal(
  liveUpgrade.requests.filter(
    request =>
      request.updateCells?.range.startRowIndex === 0 &&
      request.updateCells?.range.startColumnIndex === 8
  ).length,
  1
)

console.log("Editorial Sheet migration tests passed.")
