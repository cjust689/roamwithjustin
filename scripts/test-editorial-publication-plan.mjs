import assert from "node:assert/strict"
import {
  nextSourceRevision,
  publicationSourceHash,
  publicObjectUrl,
  resolvePublicationTarget,
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
  "Publish To": "Both",
  "Atlas Journey": "Costa Rica (2025)",
  "Atlas Place": "Uvita",
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

const catalog = {
  records: [
    {
      entityType: "journey",
      id: "costa-rica-2025",
      label: "Costa Rica (2025)",
      aliases: ["Costa Rica (2025)", "costa-rica-2025"],
    },
    {
      entityType: "place",
      id: "uvita-costa-rica",
      label: "Uvita",
      aliases: ["Uvita", "uvita-costa-rica"],
    },
    {
      entityType: "place",
      id: "unused-place",
      label: "Unused Place",
      aliases: ["Unused Place"],
    },
    {
      entityType: "visit",
      id: "costa-rica-2025-uvita-costa-rica",
      label: "Uvita / Costa Rica (2025)",
      journeyId: "costa-rica-2025",
      placeId: "uvita-costa-rica",
      aliases: ["Uvita", "Uvita / Costa Rica (2025)"],
    },
  ],
}
const resolved = resolvePublicationTarget({ row: base, catalog })
assert.equal(resolved.scope, "visit")
assert.equal(resolved.row.journey_id, "costa-rica-2025")
assert.equal(resolved.row.place_id, "uvita-costa-rica")
assert.equal(resolved.row.visit_id, "costa-rica-2025-uvita-costa-rica")
const journeyScoped = resolvePublicationTarget({
  row: { ...base, "Atlas Place": "" },
  catalog,
})
assert.equal(journeyScoped.scope, "journey")
assert.equal(journeyScoped.row.place_id, "")
assert.equal(journeyScoped.row.visit_id, "")
assert.throws(
  () =>
    resolvePublicationTarget({
      row: { ...base, "Atlas Place": "Unused Place" },
      catalog,
    }),
  /has no matching Visit/
)
assert.throws(
  () =>
    resolvePublicationTarget({
      row: { ...base, "Atlas Place": "New Place" },
      catalog,
    }),
  /run editorial:register:place first/
)
assert.throws(
  () =>
    resolvePublicationTarget({
      row: { ...base, "Publish To": "Social" },
      catalog,
    }),
  /choose Atlas or Both/
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
