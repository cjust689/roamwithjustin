import assert from "node:assert/strict"
import {
  nextSourceRevision,
  publicationSourceHash,
  publicObjectUrl,
  selectPublicationRow,
} from "./lib/editorial-publication-plan.mjs"

const base = {
  Account: "Roam",
  post_id: "post-123",
  journey_id: "journey-1",
  place_id: "place-1",
  visit_id: "visit-1",
  "Drive Folder": "https://drive.google.com/drive/folders/1234567890abc",
  "Atlas Mode": "Preview",
}
assert.equal(
  selectPublicationRow({ rows: [base], postId: "post-123" }).rowNumber,
  2
)
assert.throws(
  () => selectPublicationRow({ rows: [base], postId: "post-123", apply: true }),
  /not approved/
)
assert.equal(
  selectPublicationRow({
    rows: [{ ...base, "Atlas Mode": "Publish" }],
    apply: true,
  }).mode,
  "Publish"
)
assert.throws(
  () =>
    selectPublicationRow({
      rows: [base, { ...base, post_id: "post-456" }],
    }),
  /exactly one/
)
assert.equal(
  selectPublicationRow({ rows: [{ ...base, visit_id: "" }] }).row.place_id,
  "place-1"
)
assert.throws(
  () =>
    selectPublicationRow({
      rows: [{ ...base, place_id: "", visit_id: "visit-1" }],
    }),
  /without its Place/
)

const combined = publicationSourceHash({
  sheetSourceHash: "a".repeat(64),
  driveFingerprint: "b".repeat(64),
})
assert.equal(combined.length, 64)
assert.equal(nextSourceRevision({}), "1")
assert.equal(nextSourceRevision({ source_revision: "8" }), "9")
assert.throws(() => nextSourceRevision({ source_revision: "draft" }), /Invalid/)
assert.equal(
  publicObjectUrl("images/a folder/photo #1.jpg"),
  "https://media.roamwithjustin.com/images/a%20folder/photo%20%231.jpg"
)

console.log("Editorial publication planning tests passed.")
