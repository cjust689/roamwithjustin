import assert from "node:assert/strict"
import {
  planEditorialCompilation,
  validateEditorialRecords,
} from "./lib/editorial-content-compiler.mjs"

const journeys = [
  {
    id: "journey-2026",
    visits: [{ id: "journey-2026-place", placeId: "place" }],
  },
]
const emptyEditorial = {
  schemaVersion: 1,
  experiences: [],
  moments: [],
  batches: [],
}
const emptyMedia = {
  schemaVersion: 1,
  assets: [{ id: "image-1" }, { id: "image-2" }],
  placements: [
    { id: "placement-1", assetId: "image-1", experienceId: null },
    { id: "placement-2", assetId: "image-2", experienceId: null },
  ],
  batches: [
    {
      id: "media-batch-1",
      journeyId: "journey-2026",
      assetIds: ["image-1", "image-2"],
    },
  ],
}
const row = {
  post_id: "11111111-1111-4111-8111-111111111111",
  journey_id: "journey-2026",
  place_id: "place",
  visit_id: "journey-2026-place",
  "Series/Post": "Boat day",
  "Atlas Experience": "New: Boat day",
  "Moment / Angle": "The vessel",
  "Atlas Notes": "Private evidence can keep a morning - afternoon shorthand.",
  "Atlas Story": "We board in the morning and watch the coastline change.",
  "Travel Date / Range": "July 2026",
}
const first = planEditorialCompilation({
  currentEditorial: emptyEditorial,
  currentMedia: emptyMedia,
  row,
  processedHash: "a".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
})
assert.equal(first.changed, true)
assert.equal(first.editorial.experiences.length, 1)
assert.equal(first.editorial.moments.length, 1)
assert.equal(first.editorial.moments[0].sortOrder, 0)
assert.equal(
  first.editorial.moments[0].notes,
  "We board in the morning and watch the coastline change."
)
assert.doesNotMatch(first.editorial.moments[0].notes, /Private evidence/)
assert.throws(
  () =>
    planEditorialCompilation({
      currentEditorial: emptyEditorial,
      currentMedia: emptyMedia,
      row: { ...row, "Atlas Story": "" },
      processedHash: "a".repeat(64),
      mediaBatchIds: ["media-batch-1"],
      journeys,
    }),
  /Atlas Story is required/
)
assert.equal(first.media.placements[0].experienceId, first.experienceId)
assert.deepEqual(validateEditorialRecords(first.editorial, { journeys }), [])

const mediaOnly = planEditorialCompilation({
  currentEditorial: emptyEditorial,
  currentMedia: emptyMedia,
  row: { ...row, "Atlas Experience": "", "Atlas Story": "" },
  processedHash: "a".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
})
assert.equal(mediaOnly.experienceId, null)
assert.equal(mediaOnly.momentId, null)
assert.deepEqual(mediaOnly.editorial, emptyEditorial)

const repeated = planEditorialCompilation({
  currentEditorial: first.editorial,
  currentMedia: first.media,
  row,
  processedHash: "a".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
})
assert.equal(repeated.changed, false)

const revised = planEditorialCompilation({
  currentEditorial: first.editorial,
  currentMedia: first.media,
  row: {
    ...row,
    "Atlas Story": "The coastline becomes the part I keep watching.",
  },
  processedHash: "b".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
})
assert.equal(revised.editorial.moments.length, 1)
assert.equal(revised.editorial.batches.length, 2)

const secondRow = {
  ...row,
  post_id: "22222222-2222-4222-8222-222222222222",
  "Atlas Experience": "Boat day",
  "Moment / Angle": "From the water",
}
const second = planEditorialCompilation({
  currentEditorial: first.editorial,
  currentMedia: first.media,
  row: secondRow,
  processedHash: "c".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
})
assert.equal(second.editorial.experiences.length, 1)
assert.equal(second.editorial.moments.length, 2)
assert.equal(second.editorial.moments[1].sortOrder, 1)

const journeyScoped = planEditorialCompilation({
  currentEditorial: emptyEditorial,
  currentMedia: emptyMedia,
  row: { ...row, place_id: "broad-region", visit_id: "" },
  processedHash: "f".repeat(64),
  mediaBatchIds: ["media-batch-1"],
  journeys,
  mode: "Preview",
})
assert.equal(journeyScoped.editorial.experiences[0].placeId, null)
assert.equal(journeyScoped.editorial.experiences[0].visitId, null)

assert.throws(
  () =>
    planEditorialCompilation({
      currentEditorial: emptyEditorial,
      currentMedia: emptyMedia,
      row: { ...row, "Atlas Story": "Morning - then the water." },
      processedHash: "d".repeat(64),
      mediaBatchIds: ["media-batch-1"],
      journeys,
    }),
  /dash punctuation/
)

console.log("Editorial Experience and Moment compiler tests passed.")
