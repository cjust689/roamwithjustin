import assert from "node:assert/strict"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
} from "./lib/editorial-baseline.mjs"
import {
  buildExactPlaceBindingMigration,
  buildJourneyBindingMigration,
} from "./lib/editorial-google-bindings.mjs"

const headers = [
  ...EXISTING_POST_HEADERS,
  ...ATLAS_POST_HEADERS,
  ...AUTOMATION_POST_HEADERS,
]
const rows = [
  { Account: "Roam", post_id: "post-a", place_id: "" },
  { Account: "Roam", post_id: "post-b", place_id: "" },
  { Account: "Roam", post_id: "post-c", place_id: "" },
]
const eligibleRows = [
  {
    diagnosticRow: 2,
    postId: "post-a",
    sourceHash: "hash-a",
    place: {
      input: "Amsterdam",
      status: "matched",
      matches: [{ id: "amsterdam-netherlands" }],
    },
  },
  {
    diagnosticRow: 3,
    postId: "post-b",
    sourceHash: "hash-b",
    place: {
      input: "Utah",
      status: "matched",
      matches: [{ id: "utah" }],
    },
  },
  {
    diagnosticRow: 4,
    postId: "post-c",
    sourceHash: "hash-c",
    place: { input: "Unknown", status: "unmatched", matches: [] },
  },
]
const bindingReport = {
  records: eligibleRows.map(row => ({
    postId: row.postId,
    sourceHash: row.sourceHash,
  })),
}
const migration = buildExactPlaceBindingMigration({
  sheetId: 87724606,
  headers,
  rows,
  baselinePlan: { eligibleRows },
  bindingReport,
  approvedMappings: [
    { locationInput: "Amsterdam", placeId: "amsterdam-netherlands" },
    { locationInput: "Utah", placeId: "utah" },
  ],
})
assert.deepEqual(migration.summary, {
  assignments: 2,
  alreadyApplied: 0,
  approvedMappingGroups: 2,
})
assert.deepEqual(
  migration.assignments.map(assignment => assignment.postId),
  ["post-a", "post-b"]
)
assert.equal(migration.requests.length, 2)

const noOp = buildExactPlaceBindingMigration({
  sheetId: 87724606,
  headers,
  rows: [
    { ...rows[0], place_id: "amsterdam-netherlands" },
    { ...rows[1], place_id: "utah" },
    rows[2],
  ],
  baselinePlan: { eligibleRows },
  bindingReport,
  approvedMappings: [
    { locationInput: "Amsterdam", placeId: "amsterdam-netherlands" },
    { locationInput: "Utah", placeId: "utah" },
  ],
})
assert.equal(noOp.requests.length, 0)
assert.equal(noOp.summary.alreadyApplied, 2)

assert.throws(
  () =>
    buildExactPlaceBindingMigration({
      sheetId: 87724606,
      headers,
      rows: [{ ...rows[0], place_id: "different-place" }, ...rows.slice(1)],
      baselinePlan: { eligibleRows },
      bindingReport,
      approvedMappings: [
        { locationInput: "Amsterdam", placeId: "amsterdam-netherlands" },
      ],
    }),
  /Conflicting place_id/
)

assert.throws(
  () =>
    buildExactPlaceBindingMigration({
      sheetId: 87724606,
      headers,
      rows,
      baselinePlan: { eligibleRows },
      bindingReport: {
        records: [
          { postId: "post-a", sourceHash: "changed" },
          ...bindingReport.records.slice(1),
        ],
      },
      approvedMappings: [
        { locationInput: "Amsterdam", placeId: "amsterdam-netherlands" },
      ],
    }),
  /Source changed after binding review/
)

console.log("Editorial exact Place binding tests passed.")

const journeyCatalog = {
  records: [
    {
      entityType: "journey",
      id: "europe-summer-2026",
      label: "Europe (2026)",
    },
    {
      entityType: "journey",
      id: "utah-2026",
      label: "Utah (2026)",
    },
  ],
}
const journeyRows = [
  {
    Account: "Roam",
    post_id: "post-a",
    Location: "Amsterdam",
    "Atlas Journey": "",
    journey_id: "",
  },
  {
    Account: "Roam",
    post_id: "post-b",
    Location: "Utah 26",
    "Atlas Journey": "",
    journey_id: "",
  },
  {
    Account: "Roam",
    post_id: "post-c",
    Location: "Unknown",
    "Atlas Journey": "",
    journey_id: "",
  },
]
const journeyEligibleRows = eligibleRows.map((row, index) => ({
  ...row,
  place: {
    ...row.place,
    input: journeyRows[index].Location,
  },
}))
const journeyMappings = [
  { locationInput: "Amsterdam", journeyId: "europe-summer-2026" },
  { locationInput: "Utah 26", journeyId: "utah-2026" },
]
const journeyMigration = buildJourneyBindingMigration({
  sheetId: 87724606,
  headers,
  rows: journeyRows,
  catalog: journeyCatalog,
  baselinePlan: { eligibleRows: journeyEligibleRows },
  bindingReport,
  approvedMappings: journeyMappings,
})
assert.deepEqual(journeyMigration.summary, {
  assignments: 2,
  alreadyApplied: 0,
  approvedMappingGroups: 2,
  cellWrites: 4,
})
assert.deepEqual(
  journeyMigration.assignments.map(assignment => ({
    postId: assignment.postId,
    journeyId: assignment.journeyId,
    journeyLabel: assignment.journeyLabel,
  })),
  [
    {
      postId: "post-a",
      journeyId: "europe-summer-2026",
      journeyLabel: "Europe (2026)",
    },
    {
      postId: "post-b",
      journeyId: "utah-2026",
      journeyLabel: "Utah (2026)",
    },
  ]
)

const journeyNoOp = buildJourneyBindingMigration({
  sheetId: 87724606,
  headers,
  rows: [
    {
      ...journeyRows[0],
      "Atlas Journey": "Europe (2026)",
      journey_id: "europe-summer-2026",
    },
    {
      ...journeyRows[1],
      "Atlas Journey": "Utah (2026)",
      journey_id: "utah-2026",
    },
    journeyRows[2],
  ],
  catalog: journeyCatalog,
  baselinePlan: { eligibleRows: journeyEligibleRows },
  bindingReport,
  approvedMappings: journeyMappings,
})
assert.equal(journeyNoOp.requests.length, 0)
assert.equal(journeyNoOp.summary.alreadyApplied, 2)

assert.throws(
  () =>
    buildJourneyBindingMigration({
      sheetId: 87724606,
      headers,
      rows: [
        {
          ...journeyRows[0],
          "Atlas Journey": "Utah (2026)",
        },
        ...journeyRows.slice(1),
      ],
      catalog: journeyCatalog,
      baselinePlan: { eligibleRows: journeyEligibleRows },
      bindingReport,
      approvedMappings: [journeyMappings[0]],
    }),
  /Conflicting Atlas Journey/
)

assert.throws(
  () =>
    buildJourneyBindingMigration({
      sheetId: 87724606,
      headers,
      rows: journeyRows,
      catalog: journeyCatalog,
      baselinePlan: { eligibleRows: journeyEligibleRows },
      bindingReport: {
        records: [
          { postId: "post-a", sourceHash: "changed" },
          ...bindingReport.records.slice(1),
        ],
      },
      approvedMappings: [journeyMappings[0]],
    }),
  /Source changed after binding review/
)

assert.throws(
  () =>
    buildJourneyBindingMigration({
      sheetId: 87724606,
      headers,
      rows: journeyRows,
      catalog: journeyCatalog,
      baselinePlan: { eligibleRows: journeyEligibleRows },
      bindingReport,
      approvedMappings: [
        { locationInput: "Amsterdam", journeyId: "missing-journey" },
      ],
    }),
  /Approved Journey does not exist/
)

console.log("Editorial Journey binding tests passed.")
