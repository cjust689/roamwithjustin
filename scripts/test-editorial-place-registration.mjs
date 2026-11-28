import assert from "node:assert/strict"
import { buildCanonicalCatalog } from "./lib/editorial-baseline.mjs"
import {
  planPlaceRegistration,
  selectPlaceRegistrationRow,
  serializeGeographyRecords,
} from "./lib/editorial-place-registration.mjs"

const empty = {
  schemaVersion: 1,
  places: [],
  visits: [],
  atlasNodes: [],
  registrations: [],
}
const rootPlace = {
  id: "test-country",
  name: "Test Country",
  coordinates: [-80, 20],
  parentPlaceId: null,
  countryCode: "TC",
  regionCode: null,
  category: "country",
  evidenceStatus: "confirmed",
  coordinatePrecision: "country",
  description: "A test country used by the registration suite.",
  externalLinks: {},
  verificationNotes: "Test fixture.",
}
const firstPlace = {
  id: "first-stop",
  name: "First Stop",
  coordinates: [-80.1, 20.1],
  parentPlaceId: rootPlace.id,
  countryCode: "TC",
  regionCode: null,
  category: "destination",
  evidenceStatus: "confirmed",
  coordinatePrecision: "town",
  description: "The first stop in the test Journey.",
  externalLinks: {},
  verificationNotes: "Test fixture.",
}
const existingPlace = {
  id: "existing-cove",
  name: "Existing Cove",
  coordinates: [-80.3, 20.3],
  parentPlaceId: rootPlace.id,
  countryCode: "TC",
  regionCode: null,
  category: "beach",
  evidenceStatus: "confirmed",
  coordinatePrecision: "beach",
  description: "A cove already in the Place registry.",
  externalLinks: {},
  verificationNotes: "Test fixture.",
}
const journey = {
  id: "test-country-2026",
  year: 2026,
  slug: "test-country-2026",
  title: "Test Country (2026)",
  visits: [
    {
      id: "test-country-2026-first-stop",
      legacyId: "first-stop",
      placeId: "first-stop",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "destination",
      description: "",
      summary: "",
      notes: [],
      media: [],
      socialLinks: [],
    },
  ],
}
const rootNode = {
  id: "test-country",
  placeId: "test-country",
  journeyId: journey.id,
  parentId: null,
  camera: { center: [-80, 20], zoom: 6, pitch: 40, bearing: 0 },
  relatedIds: [],
}
const firstNode = {
  id: firstPlace.id,
  placeId: firstPlace.id,
  journeyId: journey.id,
  parentId: rootNode.id,
  camera: { center: firstPlace.coordinates, zoom: 10, pitch: 45, bearing: 0 },
  relatedIds: [],
}
const places = [rootPlace, firstPlace, existingPlace]
const atlasNodes = [rootNode, firstNode]
const catalog = buildCanonicalCatalog({
  journeys: [journey],
  places,
  atlasNodes,
})
const row = {
  Account: "Roam",
  Date: "2026-04-05",
  Location: "Test Cove",
  "Series/Post": "A test cove",
  "Drive Folder": "https://drive.google.com/drive/folders/test",
  "Publish To": "Both",
  "Atlas Journey": journey.title,
  "Atlas Place": "New Place",
  "Atlas Coordinates": "20.2, -80.2",
  "Atlas Stop": "Yes",
  "Atlas Experience": "",
  "Atlas Mode": "Off",
  "Atlas Notes": "",
  post_id: "post-test-cove",
}

assert.equal(
  selectPlaceRegistrationRow({ rows: [row], postId: row.post_id }).rowNumber,
  2
)
assert.throws(
  () =>
    selectPlaceRegistrationRow({
      rows: [{ ...row, "Atlas Mode": "Preview" }],
      postId: row.post_id,
    }),
  /must remain Off/
)
assert.throws(
  () =>
    selectPlaceRegistrationRow({
      rows: [{ ...row, "Atlas Stop": "No" }],
      postId: row.post_id,
    }),
  /Atlas Stop Yes/
)

const plan = planPlaceRegistration({
  current: empty,
  row,
  catalog,
  journeys: [journey],
  places,
  atlasNodes,
  options: {
    parentPlace: firstPlace.id,
    summary: "A small coastal stop on the Test Country journey.",
    category: "coastal place",
    coordinatePrecision: "village",
    afterPlace: firstPlace.id,
  },
})
assert.equal(plan.createdPlace, true)
assert.equal(plan.createdAtlasNode, true)
assert.equal(plan.resumed, false)
assert.equal(plan.place.id, "test-cove")
assert.deepEqual(plan.place.coordinates, [-80.2, 20.2])
assert.equal(plan.visit.insertAfterPlaceId, firstPlace.id)
assert.equal(plan.visit.id, "test-country-2026-test-cove")
assert.equal(plan.place.parentPlaceId, firstPlace.id)
assert.equal(plan.atlasNode.parentId, firstNode.id)
assert.equal(plan.records.places.length, 1)
assert.equal(plan.records.visits.length, 1)
assert.equal(plan.records.atlasNodes.length, 1)
assert.equal(plan.records.registrations.length, 1)
assert.match(serializeGeographyRecords(plan.records), /"test-cove"/)

const composedVisit = Object.fromEntries(
  Object.entries(plan.visit).filter(
    ([key]) =>
      !["journeyId", "insertAfterPlaceId", "sourcePostId"].includes(key)
  )
)
const resumedJourney = {
  ...journey,
  visits: [...journey.visits, composedVisit],
}
const resumedPlaces = [...places, plan.place]
const resumedNodes = [...atlasNodes, plan.atlasNode]
const resumedCatalog = buildCanonicalCatalog({
  journeys: [resumedJourney],
  places: resumedPlaces,
  atlasNodes: resumedNodes,
})
const resumed = planPlaceRegistration({
  current: plan.records,
  row,
  catalog: resumedCatalog,
  journeys: [resumedJourney],
  places: resumedPlaces,
  atlasNodes: resumedNodes,
})
assert.equal(resumed.resumed, true)
assert.equal(resumed.registration.id, plan.registration.id)

const existingRow = {
  ...row,
  Location: existingPlace.name,
  "Atlas Place": "New Place",
  post_id: "post-existing-cove",
}
const existingAtlasNode = {
  id: existingPlace.id,
  placeId: existingPlace.id,
  journeyId: journey.id,
  parentId: rootNode.id,
  camera: {
    center: existingPlace.coordinates,
    zoom: 11,
    pitch: 50,
    bearing: 0,
  },
  relatedIds: [],
}
const existingPlan = planPlaceRegistration({
  current: empty,
  row: existingRow,
  catalog,
  journeys: [journey],
  places,
  atlasNodes: [...atlasNodes, existingAtlasNode],
  options: { afterPlace: "end" },
})
assert.equal(existingPlan.createdPlace, false)
assert.equal(existingPlan.createdAtlasNode, false)
assert.equal(existingPlan.place.id, existingPlace.id)
assert.equal(existingPlan.records.places.length, 0)
assert.equal(existingPlan.records.visits.length, 1)
assert.equal(existingPlan.records.atlasNodes.length, 0)

assert.throws(
  () =>
    planPlaceRegistration({
      current: empty,
      row: { ...row, "Atlas Place": "Test Cove" },
      catalog,
      journeys: [journey],
      places,
      atlasNodes,
    }),
  /explicit New Place choice/
)
assert.throws(
  () =>
    planPlaceRegistration({
      current: empty,
      row: { ...row, "Atlas Place": "New Place" },
      catalog,
      journeys: [journey],
      places,
      atlasNodes,
      options: {
        parentPlace: rootPlace.id,
        longitude: -80.2,
        latitude: 20.2,
        summary: "Invalid public summary - with a dash.",
      },
    }),
  /dash punctuation/
)
assert.throws(
  () =>
    planPlaceRegistration({
      current: empty,
      row: { ...row, "Atlas Coordinates": "not a coordinate" },
      catalog,
      journeys: [journey],
      places,
      atlasNodes,
      options: {
        parentPlace: firstPlace.id,
        summary: "A valid public summary.",
      },
    }),
  /latitude, longitude/
)

console.log("Editorial Place registration tests passed.")
