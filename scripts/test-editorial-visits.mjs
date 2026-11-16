import assert from "node:assert/strict"
import { buildVisitBindingMigration } from "./lib/editorial-google-visits.mjs"

const headers = ["Account", "post_id", "journey_id", "place_id", "visit_id"]
const plan = buildVisitBindingMigration({
  sheetId: 123,
  headers,
  rows: [
    { Account: "Roam", post_id: "post-1", journey_id: "journey-1", place_id: "place-1", visit_id: "" },
    { Account: "Roam", post_id: "post-2", journey_id: "journey-1", place_id: "place-2", visit_id: "" },
    { Account: "Other", post_id: "post-3", journey_id: "journey-1", place_id: "place-1", visit_id: "" },
  ],
  journeys: [
    { id: "journey-1", visits: [{ id: "visit-1", placeId: "place-1" }] },
  ],
})
assert.equal(plan.summary.assignments, 1)
assert.equal(plan.summary.blocked, 1)
assert.equal(plan.assignments[0].visitId, "visit-1")
assert.equal(plan.requests[0].updateCells.range.startRowIndex, 1)
assert.throws(
  () =>
    buildVisitBindingMigration({
      sheetId: 123,
      headers,
      rows: [
        { Account: "Roam", post_id: "post-1", journey_id: "journey-1", place_id: "place-1", visit_id: "wrong" },
      ],
      journeys: [{ id: "journey-1", visits: [{ id: "visit-1", placeId: "place-1" }] }],
    }),
  /Conflicting visit_id/
)

console.log("Editorial Visit binding tests passed.")
