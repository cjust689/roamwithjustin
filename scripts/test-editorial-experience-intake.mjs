import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import {
  compileCuratedExperiences,
  publishCuratedExperiences,
} from "./lib/curated-experiences.mjs"
import {
  officialExperiencePartner,
  validateCuratedExperiences,
} from "../src/content/experiences/curated-contract.mjs"
import {
  getJourneyExperienceViews,
  experienceCardView,
} from "../src/content/selectors/experiences.mjs"
import { experienceRecords } from "../src/content/experiences/index.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { buildAtlasNodeView } from "../src/content/selectors/projections.mjs"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"

const partner = {
  id: "operator-fixture",
  name: "Fixture operator",
  evidenceStatus: "confirmed",
  relationship: "trip-operator",
  externalLinks: { official: "https://operator.example.com/" },
}
const context = {
  generated: [],
  getJourney: id =>
    id === "journey-fixture"
      ? {
          id,
          visits: [
            {
              id: "visit-fixture",
              placeId: "place-fixture",
              partnerIds: [partner.id],
            },
          ],
        }
      : null,
  getPartner: id => (id === partner.id ? partner : null),
  getMediaAsset: id =>
    id === "image-fixture"
      ? { kind: "image", rights: { status: "owned" } }
      : null,
  placements: [
    {
      assetId: "image-fixture",
      journeyId: "journey-fixture",
      visitId: "visit-fixture",
      visibility: "published",
    },
  ],
}
const record = {
  id: "experience-fixture",
  slug: "boat-outing",
  journeyId: "journey-fixture",
  visitId: "visit-fixture",
  placeId: "place-fixture",
  title: "Boat outing",
  summary: "A fixture for the intake tests.",
  category: "boat-and-water",
  firsthand: true,
  evidenceRefs: ["private-owner-note-fixture"],
  partnerId: partner.id,
  coverAssetId: "image-fixture",
  visibility: "published",
  sortOrder: 0,
  disclosure: "independent",
  sourceOwner: "curated",
}
const input = { schemaVersion: 1, experiences: [record] }
const previous = { schemaVersion: 1, experiences: [] }
const result = compileCuratedExperiences(input, previous, context)
assert.equal(result.diff[0].change, "added")
assert.ok(!result.serialized.includes("private-owner-note-fixture"))
assert.ok(!result.serialized.includes("evidenceRefs"))
assert.deepEqual(validateCuratedExperiences(result.registry, context), [])
assert.match(officialExperiencePartner(partner).href, /^https:/)
for (const official of [
  "javascript:alert(1)",
  "https://user:pass@example.com/",
  "https://127.0.0.1/",
  "https://10.0.0.1/",
  "https://operator.local/",
  "https://operator.example.com/?affiliate=1",
  "http://operator.example.com/",
])
  assert.equal(
    officialExperiencePartner({ ...partner, externalLinks: { official } }),
    null
  )
assert.equal(
  officialExperiencePartner({ ...partner, evidenceStatus: "unknown" }),
  null
)
assert.equal(
  officialExperiencePartner({ ...partner, relationship: "sponsor" }),
  null
)

for (const patch of [
  { id: "" },
  { slug: "" },
  { journeyId: "unknown" },
  { visitId: "unknown" },
  { placeId: "elsewhere" },
  { firsthand: false },
  { evidenceRefs: [] },
  { evidenceRefs: ["x\u200b"] },
  { category: "anything" },
  { operatorWebsite: "https://unsafe.example/" },
  { partnerId: "unreviewed" },
  { coverAssetId: "unregistered" },
  { disclosure: "affiliate" },
  { sourceOwner: "my-atlas" },
  { title: "An outing — a day" },
  { summary: "Details: not allowed" },
  { summary: "One; two" },
  { title: "Coming soon" },
  { summary: "A confirmed excursion" },
  { summary: "<script>alert(1)</script>" },
])
  assert.throws(
    () =>
      compileCuratedExperiences(
        { ...input, experiences: [{ ...record, ...patch }] },
        previous,
        context
      ),
    undefined,
    JSON.stringify(patch)
  )
assert.throws(() =>
  compileCuratedExperiences(input, previous, {
    ...context,
    generated: [{ ...record }],
  })
)
assert.throws(() =>
  compileCuratedExperiences(
    { ...input, experiences: [record, { ...record }] },
    previous,
    context
  )
)
assert.throws(() =>
  compileCuratedExperiences(input, previous, { ...context, placements: [] })
)
assert.throws(() =>
  compileCuratedExperiences(input, previous, {
    ...context,
    getMediaAsset: () => ({ kind: "image", rights: { status: "unknown" } }),
  })
)
assert.throws(
  () => compileCuratedExperiences(previous, result.registry, context),
  /Missing existing/
)
const withdrawn = compileCuratedExperiences(
  { ...input, experiences: [{ ...record, visibility: "draft" }] },
  result.registry,
  context
)
assert.throws(() =>
  compileCuratedExperiences(input, previous, {
    ...context,
    getJourney: id => ({
      id,
      visits: [
        { id: "visit-fixture", placeId: "place-fixture", partnerIds: [] },
      ],
    }),
  })
)
assert.throws(() =>
  compileCuratedExperiences(input, previous, {
    ...context,
    placements: [
      {
        ...context.placements[0],
        visitId: "other-visit",
        placeId: "place-fixture",
      },
    ],
  })
)
assert.equal(withdrawn.diff[0].change, "withdrawn")
const reordered = Object.fromEntries(Object.entries(record).reverse())
assert.equal(
  compileCuratedExperiences(
    { ...input, experiences: [reordered] },
    result.registry,
    context
  ).serialized,
  result.serialized
)
assert.equal(
  compileCuratedExperiences(input, result.registry, context).diff[0].change,
  "unchanged"
)

const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), "rwj-experience-intake-")
)
try {
  const target = path.join(temporary, "registry.json")
  await fs.writeFile(target, JSON.stringify(previous))
  assert.equal(await publishCuratedExperiences(target, result), true)
  const stat = await fs.stat(target)
  assert.equal(await publishCuratedExperiences(target, result), false)
  assert.equal((await fs.stat(target)).mtimeMs, stat.mtimeMs)
  const before = await fs.readFile(target, "utf8")
  assert.throws(() =>
    compileCuratedExperiences(
      { ...input, experiences: [{ ...record, title: "" }] },
      result.registry,
      context
    )
  )
  assert.equal(await fs.readFile(target, "utf8"), before)
  const changed = structuredClone(result.registry)
  changed.experiences[0].title = "Another edit"
  await fs.writeFile(target, JSON.stringify(changed))
  await assert.rejects(
    publishCuratedExperiences(target, withdrawn),
    /registry changed/i
  )
  assert.equal(
    JSON.parse(await fs.readFile(target, "utf8")).experiences[0].title,
    "Another edit"
  )
} finally {
  assert.ok(
    path
      .resolve(temporary)
      .startsWith(
        path.resolve(os.tmpdir()) + path.sep + "rwj-experience-intake-"
      )
  )
  await fs.rm(temporary, { recursive: true, force: true })
}

// Actual canonical selectors must reuse published identities and omit internal
// evidence, write-state metadata and private account records from card views.
for (const journey of journeyRecords) {
  const views = getJourneyExperienceViews(journey.id)
  for (const view of views) {
    assert.ok(
      experienceRecords.some(
        record => record.id === view.id && record.visibility === "published"
      )
    )
    const card = experienceCardView(view)
    for (const field of [
      "evidenceRefs",
      "firsthand",
      "sourceOwner",
      "visibility",
      "moments",
      "pinId",
      "userId",
    ])
      assert.equal(card[field], undefined)
    assert.ok(view.moments.every(moment => !moment.experiences))
  }
}
const nodes = atlasPresentation.map(buildAtlasNodeView)
assert.equal(
  nodes.length,
  atlasPresentation.length,
  "No activity map pins are created"
)
for (const node of nodes)
  for (const experience of node.storyExperiences || [])
    assert.ok(experience.card)
console.log(
  "Editorial experience intake, evidence privacy, ownership boundaries, exact relationships, safe operators and atomic publication tests passed."
)
