const assert = require("assert")
const {
  parseGearSource,
  planGearIngestion,
  validateGearRecords,
} = require("./lib/gear-ingestion.js")

const context = {
  journeys: [
    {
      id: "usvi-st-john-2025",
      visits: [
        {
          id: "usvi-st-john-2025-trunk-bay",
          placeId: "trunk-bay",
        },
      ],
    },
  ],
  media: [{ id: "image-usvi-usvi", kind: "image" }],
}

const emptyRecords = {
  schemaVersion: 1,
  items: [],
  usage: [],
}

const markdown = `---
schemaVersion: 1
journeyId: usvi-st-john-2025
mode: upsert
---

# Test fixture only

## Confirmed test mask
- gearId: confirmed-test-mask
- category: snorkeling
- brand: Test Brand
- model: Test Model
- usage: used
- evidence: creator-confirmed
- verificationStatus: verified
- visibility: published
- visitId: usvi-st-john-2025-trunk-bay
- mediaAssetId: image-usvi-usvi
- website: https://example.com/test-mask
- websiteVerified: true
- notes: Test fixture; never published.
`

const document = parseGearSource(markdown, "fixture.md")
const firstPlan = planGearIngestion({
  document,
  journeyId: "usvi-st-john-2025",
  records: emptyRecords,
  context,
})

assert.deepStrictEqual(firstPlan.errors, [])
assert.strictEqual(firstPlan.changed, true)
assert.deepStrictEqual(firstPlan.summary.created, ["confirmed-test-mask"])
assert.strictEqual(firstPlan.summary.linked.length, 1)
assert.strictEqual(firstPlan.records.items[0].links[0].verified, true)

const repeatPlan = planGearIngestion({
  document,
  journeyId: "usvi-st-john-2025",
  records: firstPlan.records,
  context,
})

assert.deepStrictEqual(repeatPlan.errors, [])
assert.strictEqual(repeatPlan.changed, false)
assert.deepStrictEqual(repeatPlan.summary.created, [])
assert.deepStrictEqual(repeatPlan.summary.linked, [])

const conflictingJourney = planGearIngestion({
  document,
  journeyId: "different-journey",
  records: emptyRecords,
  context,
})
assert(
  conflictingJourney.errors.some(error => error.includes("conflicts with"))
)
assert(
  conflictingJourney.errors.some(error =>
    error.includes("Unknown canonical journey")
  )
)

const missingIdDocument = parseGearSource(
  JSON.stringify({
    schemaVersion: 1,
    journeyId: "usvi-st-john-2025",
    items: [
      {
        name: "Needs an ID",
        category: "other",
        usageType: "used",
      },
    ],
  }),
  "fixture.json"
)
const missingIdPlan = planGearIngestion({
  document: missingIdDocument,
  journeyId: "usvi-st-john-2025",
  records: emptyRecords,
  context,
})
assert(
  missingIdPlan.errors.some(error =>
    error.includes('suggested ID: "needs-an-id"')
  )
)

const duplicateIdentityDocument = parseGearSource(
  JSON.stringify({
    schemaVersion: 1,
    journeyId: "usvi-st-john-2025",
    items: [
      {
        gearId: "different-test-mask-id",
        name: "Confirmed test mask",
        category: "snorkeling",
        usageType: "used",
      },
    ],
  }),
  "fixture.json"
)
const duplicatePlan = planGearIngestion({
  document: duplicateIdentityDocument,
  journeyId: "usvi-st-john-2025",
  records: firstPlan.records,
  context,
})
assert(
  duplicatePlan.errors.some(error => error.includes("appears to duplicate"))
)

const invalidPublishedRecords = {
  schemaVersion: 1,
  items: [
    {
      id: "unverified-item",
      category: "other",
      brand: null,
      model: null,
      name: "Unverified item",
      description: "",
      imageAssetId: null,
      aliases: [],
      links: [],
      verificationStatus: "needs-review",
    },
  ],
  usage: [
    {
      id: "gearuse-usvi-unverified-item",
      gearId: "unverified-item",
      journeyId: "usvi-st-john-2025",
      visitId: null,
      experienceId: null,
      usageType: "used",
      evidence: "needs-review",
      notes: "",
      whyItWorked: "",
      limitations: "",
      wouldBringAgain: null,
      featured: false,
      sortOrder: null,
      mediaAssetIds: [],
      visibility: "published",
    },
  ],
}
const invalidPublished = validateGearRecords(invalidPublishedRecords, context)
assert(
  invalidPublished.errors.some(error =>
    error.includes("cannot publish needs-review evidence")
  )
)
assert(
  invalidPublished.errors.some(error =>
    error.includes("cannot publish unverified gear")
  )
)

const experienceDocument = parseGearSource(
  JSON.stringify({
    schemaVersion: 1,
    journeyId: "usvi-st-john-2025",
    items: [
      {
        gearId: "experience-test-item",
        name: "Experience test item",
        category: "other",
        usageType: "used",
        experienceId: "not-yet-canonical",
      },
    ],
  }),
  "fixture.json"
)
const experiencePlan = planGearIngestion({
  document: experienceDocument,
  journeyId: "usvi-st-john-2025",
  records: emptyRecords,
  context,
})
assert(
  experiencePlan.errors.some(error =>
    error.includes("no canonical Experience registry yet")
  )
)

console.log("Gear ingestion tests passed.")
