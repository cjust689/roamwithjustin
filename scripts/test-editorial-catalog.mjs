import assert from "node:assert/strict"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { placeRecords } from "../src/content/places/index.mjs"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
  buildCanonicalCatalog,
} from "./lib/editorial-baseline.mjs"
import {
  ATLAS_CATALOG_HEADERS,
  ATLAS_CATALOG_TITLE,
  applyAtlasCatalogMigration,
  buildAtlasCatalogMigration,
  buildBindingReport,
} from "./lib/editorial-google-catalog.mjs"

const catalog = buildCanonicalCatalog({
  journeys: journeyRecords,
  places: placeRecords,
  atlasNodes: atlasPresentation,
  experiences: [
    {
      id: "experience-test",
      slug: "test",
      title: "Test experience",
      journeyId: journeyRecords[0].id,
      placeId: null,
      sourceOwner: "sheet",
    },
  ],
})
const postsHeaders = [
  ...EXISTING_POST_HEADERS,
  ...ATLAS_POST_HEADERS,
  ...AUTOMATION_POST_HEADERS,
]
const migration = buildAtlasCatalogMigration({
  catalog,
  existingSheets: [
    {
      sheetId: 87724606,
      title: "Sheet1",
      hidden: false,
      gridProperties: { rowCount: 1000, columnCount: 30 },
      protectedRanges: [],
    },
  ],
  postsSheetId: 87724606,
  postsHeaders,
  postsGridRowCount: 1000,
  createSheetId: () => 123456789,
})

assert.equal(migration.sheetId, 123456789)
assert.equal(migration.summary.createdSheet, true)
assert.equal(migration.summary.catalogRecords, catalog.records.length)
assert.equal(migration.summary.journeyChoices, journeyRecords.length)
assert.equal(migration.summary.experienceChoices, 1)
assert.deepEqual(migration.values[0], ATLAS_CATALOG_HEADERS)
assert.equal(
  migration.requests.find(request => request.addSheet).addSheet.properties
    .title,
  ATLAS_CATALOG_TITLE
)
assert.equal(
  migration.requests.find(request => request.addProtectedRange)
    .addProtectedRange.protectedRange.warningOnly,
  true
)
const validations = migration.requests
  .filter(request => request.setDataValidation)
  .map(request => request.setDataValidation)
assert.equal(validations.length, 2)
const validation = validations.find(
  rule => rule.range.startColumnIndex === postsHeaders.indexOf("Atlas Journey")
)
const experienceValidation = validations.find(
  rule => rule.range.startColumnIndex === postsHeaders.indexOf("Atlas Experience")
)
assert.equal(validation.rule.condition.type, "ONE_OF_RANGE")
assert.match(
  validation.rule.condition.values[0].userEnteredValue,
  /'Atlas Catalog'!\$C\$/
)
assert.equal(validation.rule.strict, false)
assert.match(
  experienceValidation.rule.condition.values[0].userEnteredValue,
  /'Atlas Catalog'!\$C\$/
)
assert.equal(experienceValidation.rule.strict, false)

const applyCalls = []
await applyAtlasCatalogMigration({
  auth: null,
  spreadsheetId: "sheet/id",
  requests: migration.requests,
  request: async options => {
    applyCalls.push(options)
    return { data: { replies: [] } }
  },
})
assert.equal(applyCalls.length, 1)
assert.equal(
  applyCalls[0].url,
  "https://sheets.googleapis.com/v4/spreadsheets/sheet%2Fid:batchUpdate"
)

assert.throws(
  () =>
    buildAtlasCatalogMigration({
      catalog,
      existingSheets: [
        {
          sheetId: 333,
          title: ATLAS_CATALOG_TITLE,
          gridProperties: { rowCount: 250, columnCount: 9 },
          protectedRanges: [],
        },
      ],
      postsSheetId: 87724606,
      postsHeaders,
      postsGridRowCount: 1000,
    }),
  /not marked as automation-owned/
)

const report = buildBindingReport({
  catalog,
  baselinePlan: {
    eligibleRows: [
      {
        postId: "post-b",
        sourceHash: "hash-b",
        journey: { input: "" },
        currentJourneyId: null,
        currentPlaceId: null,
        place: { input: "Unknown", status: "unmatched", matches: [] },
      },
      {
        postId: "post-a",
        sourceHash: "hash-a",
        journey: { input: "Example Journey" },
        currentJourneyId: "example-journey",
        currentPlaceId: "miami",
        place: {
          input: "Miami",
          status: "matched",
          matches: [{ id: "miami", label: "Miami", url: "/atlas/miami" }],
        },
      },
    ],
  },
})
assert.deepEqual(report.summary, {
  rows: 2,
  exact: 1,
  ambiguous: 0,
  unmatched: 1,
  blank: 0,
})
assert.deepEqual(
  report.records.map(record => record.postId),
  ["post-a", "post-b"]
)

console.log("Editorial Atlas Catalog tests passed.")
