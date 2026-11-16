import assert from "node:assert/strict"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
  postSourceHash,
} from "./lib/editorial-baseline.mjs"
import {
  applyPublicationWriteback,
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
}
const plan = buildPublicationWriteback(input)
assert.equal(plan.rowNumber, 2)
assert.equal(plan.requests.length, 11)
assert.equal(plan.values.atlas_status, "Published")
assert.equal(plan.values.last_deployment, "main-merge-sha")

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

console.log("Editorial publication write-back tests passed.")
