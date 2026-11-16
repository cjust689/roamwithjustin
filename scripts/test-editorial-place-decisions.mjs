import assert from "node:assert/strict"
import {
  buildReviewedPlaceBindingMigration,
  buildReviewedPlaceDecisions,
} from "./lib/editorial-place-decisions.mjs"

const catalog = {
  records: [
    {
      entityType: "place",
      id: "cadiz-spain",
      label: "Cádiz",
      aliases: ["cadiz-spain", "Cádiz"],
    },
    {
      entityType: "place",
      id: "salt-lake-city-airport",
      label: "Salt Lake City Airport",
      aliases: ["salt-lake-city-airport", "Salt Lake City Airport"],
    },
  ],
}
const journeys = [
  {
    id: "europe-2026",
    visits: [{ id: "visit-cadiz", placeId: "cadiz-spain" }],
  },
  { id: "utah-2026", visits: [] },
]
const suggestionReport = {
  reportHash: "report-hash",
  rows: [
    {
      sheetRow: 2,
      postId: "post-cadiz",
      postLabel: "Beach",
      journeyId: "europe-2026",
      journeyLabel: "Europe (2026)",
      locationInput: "Spain",
      sourceHash: "hash-cadiz",
    },
    {
      sheetRow: 3,
      postId: "post-slc",
      postLabel: "SLC",
      journeyId: "utah-2026",
      journeyLabel: "Utah (2026)",
      locationInput: "Utah 26",
      sourceHash: "hash-slc",
    },
  ],
}
const csvRows = [
  {
    sheet_row: "2",
    post_id: "post-cadiz",
    series_post: "Beach",
    journey: "Europe (2026)",
    location: "Cadiz",
  },
  {
    sheet_row: "3",
    post_id: "post-slc",
    series_post: "SLC",
    journey: "Utah (2026)",
    location: "Salt Lake City Airport",
  },
]

assert.throws(
  () =>
    buildReviewedPlaceDecisions({
      csvRows,
      suggestionReport,
      catalog,
      journeys,
    }),
  /explicit missing-Visit approval/
)

const decisions = buildReviewedPlaceDecisions({
  csvRows,
  suggestionReport,
  catalog,
  journeys,
  approvedMissingVisits: [
    { postId: "post-slc", placeId: "salt-lake-city-airport" },
  ],
})
assert.deepEqual(decisions.summary, {
  decisions: 2,
  existingJourneyVisits: 1,
  approvedMissingVisits: 1,
})
assert.equal(decisions.decisions[0].selectedPlaceId, "cadiz-spain")
assert.equal(decisions.decisions[1].requiresVisit, true)

const headers = ["post_id", "journey_id", "place_id"]
const rows = [
  { post_id: "post-cadiz", journey_id: "europe-2026", place_id: "" },
  { post_id: "post-slc", journey_id: "utah-2026", place_id: "" },
]
const baselinePlan = {
  eligibleRows: [
    {
      diagnosticRow: 2,
      postId: "post-cadiz",
      sourceHash: "hash-cadiz",
      currentJourneyId: "europe-2026",
    },
    {
      diagnosticRow: 3,
      postId: "post-slc",
      sourceHash: "hash-slc",
      currentJourneyId: "utah-2026",
    },
  ],
}
const migration = buildReviewedPlaceBindingMigration({
  sheetId: 123,
  headers,
  rows,
  baselinePlan,
  decisionReport: decisions,
})
assert.deepEqual(migration.summary, {
  assignments: 2,
  alreadyApplied: 0,
  approvedMissingVisits: 1,
})
assert.equal(migration.requests.length, 2)

assert.throws(
  () =>
    buildReviewedPlaceBindingMigration({
      sheetId: 123,
      headers,
      rows,
      baselinePlan: {
        eligibleRows: [
          { ...baselinePlan.eligibleRows[0], sourceHash: "changed" },
          baselinePlan.eligibleRows[1],
        ],
      },
      decisionReport: decisions,
    }),
  /Source changed after Place review/
)

console.log("Editorial reviewed Place decision tests passed.")
