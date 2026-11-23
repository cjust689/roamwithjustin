import assert from "node:assert/strict"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  AUTOMATION_POST_HEADERS,
  ATLAS_POST_HEADERS,
  EXISTING_POST_HEADERS,
  buildCanonicalCatalog,
  parseCsvRecords,
  planBaseline,
  validatePostsHeaders,
} from "./lib/editorial-baseline.mjs"

const catalog = buildCanonicalCatalog({
  journeys: journeyRecords,
  places: placeRecords,
  atlasNodes: atlasPresentation,
})

assert.equal(catalog.counts.journey, journeyRecords.length)
assert.equal(catalog.counts.place, placeRecords.length)
assert.equal(
  catalog.counts.visit,
  journeyRecords.reduce(
    (count, journey) => count + (journey.visits || []).length,
    0
  )
)
assert.equal(catalog.counts["atlas-node"], atlasPresentation.length)
assert.equal(
  JSON.stringify(catalog),
  JSON.stringify(
    buildCanonicalCatalog({
      journeys: journeyRecords,
      places: placeRecords,
      atlasNodes: atlasPresentation,
    })
  ),
  "catalog generation must be deterministic"
)

const keys = new Set()
catalog.records.forEach(record => {
  const key = `${record.entityType}:${record.id}:${record.journeyId || ""}`
  assert.equal(keys.has(key), false, `duplicate catalog key ${key}`)
  keys.add(key)
})

const parsed = parseCsvRecords(
  [
    [...EXISTING_POST_HEADERS, ...ATLAS_POST_HEADERS, "post_id"].join(","),
    [
      '"Split, Croatia"',
      "Raptor Experience",
      "Ready",
      "Roam",
      "Carousel",
      '"A caption, with punctuation"',
      "https://drive.google.com/drive/folders/example",
      "",
      "Europe (2026)",
      "New: Raptor Boat Day",
      "The vessel",
      '"First line\nSecond line"',
      "",
      "June 2026",
      "Preview",
      "Both",
      "",
      "post-opaque-a1",
    ].join(","),
    [
      "Atlanta",
      "Business post",
      "Ready",
      "WebWorks",
      "Reel",
      "Caption",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Off",
      "Social",
      "",
      "post-opaque-b2",
    ].join(","),
  ].join("\r\n")
)

assert.deepEqual(validatePostsHeaders(parsed.headers), {
  missingExisting: [],
  missingAtlas: [],
  missingAutomation: AUTOMATION_POST_HEADERS.filter(
    header => header !== "post_id"
  ),
})
assert.equal(parsed.rows.length, 2)
assert.equal(parsed.rows[0].Caption, "A caption, with punctuation")
assert.equal(parsed.rows[0]["Atlas Notes"], "First line\nSecond line")
assert.throws(
  () => parseCsvRecords("Location,Location\nOne,Two"),
  /duplicate header/
)
assert.throws(
  () => parseCsvRecords("Location,Account\nOne,Roam,Unexpected"),
  /more fields than the header row/
)

const plan = planBaseline({
  headers: parsed.headers,
  rows: parsed.rows,
  catalog,
  eligibleAccount: "Roam",
})

assert.equal(plan.summary.eligibleRows, 1)
assert.equal(plan.summary.ignoredRows, 1)
assert.equal(plan.summary.missingPostIds, 0)
assert.equal(plan.summary.exactJourneyMatches, 1)
assert.equal(plan.eligibleRows[0].journey.matches[0].id, "europe-summer-2026")
assert.equal(plan.eligibleRows[0].atlasMode, "Preview")
assert.equal(plan.eligibleRows[0].postId, "post-opaque-a1")
assert.deepEqual(plan.eligibleRows[0].blockers, ["place-needs-review"])
assert.equal(plan.migration.eligibleRowsNeedingPostIds, 0)
assert.equal(plan.migration.eligibleRowsDefaultedOff, 0)
assert.equal(plan.migration.requiresCreatorAuthorizedWrite, true)

const boundPlacePlan = planBaseline({
  headers: parsed.headers,
  rows: [{ ...parsed.rows[0], place_id: "split-croatia" }],
  catalog,
  eligibleAccount: "Roam",
})
assert.equal(boundPlacePlan.eligibleRows[0].place.status, "matched")
assert.equal(boundPlacePlan.eligibleRows[0].place.bindingSource, "place_id")
assert.equal(
  boundPlacePlan.eligibleRows[0].place.matches[0].id,
  "split-croatia"
)
assert.deepEqual(boundPlacePlan.eligibleRows[0].blockers, [])

const invalidPlacePlan = planBaseline({
  headers: parsed.headers,
  rows: [{ ...parsed.rows[0], place_id: "missing-place" }],
  catalog,
  eligibleAccount: "Roam",
})
assert.equal(invalidPlacePlan.eligibleRows[0].place.status, "invalid-binding")
assert.deepEqual(invalidPlacePlan.eligibleRows[0].blockers, [
  "place-needs-review",
])

const historicalHeaders = validatePostsHeaders(EXISTING_POST_HEADERS)
assert.deepEqual(historicalHeaders.missingExisting, [])
assert.deepEqual(historicalHeaders.missingAtlas, ATLAS_POST_HEADERS)
assert.deepEqual(historicalHeaders.missingAutomation, AUTOMATION_POST_HEADERS)

console.log(
  `Editorial baseline tests passed: ${catalog.counts.journey} Journeys, ${catalog.counts.place} Places, ${catalog.counts.visit} Visits, ${catalog.counts["atlas-node"]} Atlas nodes.`
)
