import assert from "node:assert/strict"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
  postSourceHash,
} from "./lib/editorial-baseline.mjs"
import {
  applyPublicationWriteback,
  buildPlaceRegistrationWriteback,
  buildPublicationWriteback,
} from "./lib/editorial-google-publication.mjs"

const headers = [
  ...EXISTING_POST_HEADERS,
  ...ATLAS_POST_HEADERS,
  ...AUTOMATION_POST_HEADERS,
]
const row = Object.fromEntries(headers.map(header => [header, ""]))
Object.assign(row, {
  Location: "Cruz Bay",
  "Series/Post": "Arrival",
  Account: "Roam",
  "Atlas Journey": "USVI and St. John (2025)",
  "Atlas Place": "Cruz Bay",
  "Publish To": "Both",
  "Atlas Mode": "Publish",
  post_id: "post-123",
})
const expectedSheetSourceHash = postSourceHash(row)
const input = {
  sheetId: 123,
  headers,
  rows: [row],
  postId: "post-123",
  expectedSheetSourceHash,
  processedHash: "processed-hash",
  deploymentSha: "main-merge-sha",
  atlasUrl: "https://roamwithjustin.com/atlas/cruz-bay",
  atlasUrlLevel: "visit",
  verifiedAt: "2026-11-15T12:00:00.000Z",
  experienceId: "experience-test",
  momentId: "moment-test",
  sourceRevision: "1",
  journeyId: "usvi-st-john-2025",
  placeId: "cruz-bay",
  visitId: "usvi-st-john-2025-cruz-bay",
}
const plan = buildPublicationWriteback(input)
assert.equal(plan.rowNumber, 2)
assert.equal(plan.requests.length, 14)
assert.equal(plan.values.atlas_status, "Published")
assert.equal(plan.values.last_deployment, "main-merge-sha")
assert.equal(plan.values.place_id, "cruz-bay")

const postedRow = { ...row, Status: "Posted" }
const recovered = buildPublicationWriteback({
  ...input,
  rows: [postedRow],
  expectedSheetSourceHash: postSourceHash(postedRow),
  publishedSheetSourceHash: expectedSheetSourceHash,
})
assert.equal(recovered.currentSourceHash, postSourceHash(postedRow))
assert.equal(recovered.values.source_hash, expectedSheetSourceHash)
assert.equal(recovered.values.last_processed_hash, input.processedHash)
assert.throws(
  () => buildPublicationWriteback({ ...input, publishedSheetSourceHash: "" }),
  /publishedSheetSourceHash/
)
assert.equal(
  recovered.requests.some(
    request =>
      request.updateCells.range.startColumnIndex === headers.indexOf("Status")
  ),
  false
)
assert.throws(
  () => buildPublicationWriteback({ ...input, rows: [postedRow] }),
  /changed after publication planning/
)

const appliedRow = { ...row, ...plan.values }
assert.equal(
  buildPublicationWriteback({ ...input, rows: [appliedRow] }).alreadyApplied,
  true
)
assert.throws(
  () =>
    buildPublicationWriteback({
      ...input,
      rows: [{ ...row, "Atlas Mode": "Off" }],
    }),
  /no longer approved/
)
assert.throws(
  () =>
    buildPublicationWriteback({
      ...input,
      rows: [{ ...row, Caption: "changed" }],
    }),
  /changed after publication planning/
)

const calls = []
await applyPublicationWriteback({
  auth: null,
  spreadsheetId: "sheet/id",
  requests: plan.requests,
  request: async options => {
    calls.push(options)
    return { data: { replies: [] } }
  },
})
assert.equal(calls.length, 1)
assert.match(calls[0].url, /sheet%2Fid:batchUpdate$/)

const registrationRow = {
  ...row,
  "Atlas Place": "New Place",
  "Atlas Mode": "Off",
  journey_id: "",
  place_id: "",
  visit_id: "",
}
const registrationInput = {
  sheetId: 123,
  headers,
  rows: [registrationRow],
  postId: "post-123",
  expectedSheetSourceHash: postSourceHash(registrationRow),
  requestedPlace: "New Place",
  placeLabel: "Test Cove",
  journeyId: "test-country-2026",
  placeId: "test-cove",
  visitId: "test-country-2026-test-cove",
}
const registration = buildPlaceRegistrationWriteback(registrationInput)
assert.equal(registration.requests.length, 5)
assert.equal(registration.values["Atlas Place"], "Test Cove")
assert.equal(registration.values.visit_id, "test-country-2026-test-cove")
assert.equal(
  buildPlaceRegistrationWriteback({
    ...registrationInput,
    rows: [{ ...registrationRow, ...registration.values }],
  }).alreadyApplied,
  true
)
assert.throws(
  () =>
    buildPlaceRegistrationWriteback({
      ...registrationInput,
      rows: [{ ...registrationRow, Caption: "changed" }],
    }),
  /changed after Place registration planning/
)

console.log("Editorial publication write-back tests passed.")
