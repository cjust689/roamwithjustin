import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import { assertTripStorageBudget } from "../workers/my-atlas/src/trips/store.mjs"
import { fetchMyAtlasAccountExport } from "../src/features/my-atlas/api/client.mjs"
import { requestMyAtlasTrips } from "../src/features/my-atlas/planning/tripClient.mjs"
import {
  encodeSharedTrip,
  decodeSharedTrip,
  buildSharedTripUrl,
} from "../src/features/my-atlas/planning/sharedTrip.mjs"
import { buildCanonicalTripMapRoute } from "../shared/my-atlas-trips.mjs"
import {
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
} from "../src/features/my-atlas/catalog/customPlace.mjs"
import { emptyTravelSearchDraft } from "../src/features/my-atlas/planning/travelSearch.mjs"
import {
  buildGoogleMapsRouteHandoffs,
  buildAiPlanningPrompt,
} from "../src/features/my-atlas/planning/handoffs.mjs"

const now = "2026-11-20T00:00:00.000Z"
assertTripStorageBudget([{ note: "Small record" }])
assert.throws(
  () => assertTripStorageBudget([{ note: "x".repeat(1024 * 1024) }]),
  /trip_storage_limit/
)
assert.throws(
  () =>
    assertTripStorageBudget(
      Array.from({ length: 5 }, () => ({ note: "x".repeat(900000) }))
    ),
  /trip_storage_limit/
)
assert.throws(
  () => assertTripStorageBudget([], { note: "界".repeat(600000) }),
  /trip_storage_limit/
)
const exportPayload = {
  schemaVersion: 3,
  pins: [],
  wishlist: [],
  plans: [],
  trips: [],
}
const readExport = payload =>
  fetchMyAtlasAccountExport({
    apiBaseUrl: "https://api.example.test",
    accessToken: "fixture",
    fetchImpl: async () => Response.json(payload),
  })
assert.deepEqual(await readExport(exportPayload), exportPayload)
await assert.rejects(
  readExport({ ...exportPayload, trips: undefined }),
  error => error.code === "invalid_response"
)
const place = {
  placeId: "geonames:2643743",
  placeType: "city",
  name: "London",
  coordinates: [-0.1257, 51.5085],
  countryName: "United Kingdom",
  sourceWishId: "private-wish-reference",
}
const stop = index => ({
  stopId: "stop_" + String(index).repeat(32),
  place: { ...place },
  plannedDates: { arrival: null, departure: null },
  actualDates: { arrival: null, departure: null },
  visitedDates: [],
  planNote: "Private plan note",
  memories: [
    {
      memoryId: "memory_" + String(index).repeat(32),
      kind: "note",
      text: `Private memory ${index}`,
      mediaId: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  experiences: [],
  createdAt: now,
  updatedAt: now,
})
const trip = {
  schemaVersion: 1,
  tripId: "trip_" + "a".repeat(24),
  title: "A grouped trip",
  description: "Private overview",
  lifecycle: "past",
  workflow: "saved",
  version: 1,
  stops: [stop(1), stop(2)],
  memories: [],
  logistics: {
    flights: [{ confirmation: "Private reservation" }],
    rentals: [],
  },
  sharing: { publicAtlas: false },
  createdAt: now,
  updatedAt: now,
  statusChangedAt: null,
}
const shared = decodeSharedTrip(encodeSharedTrip(trip))
assert.equal(shared.version, 2)
assert.equal(shared.lifecycle, "past")
assert.equal(
  shared.stops.length,
  2,
  "Repeated visits remain two ordered entries"
)
assert.equal(shared.start, undefined)
assert.equal(shared.end, undefined)
for (const secret of [
  "Private memory",
  "Private overview",
  "Private plan note",
  "Private reservation",
  "private-wish-reference",
  trip.tripId,
])
  assert.ok(!JSON.stringify(shared).includes(secret))
assert.equal(
  decodeSharedTrip(
    encodeSharedTrip({
      title: "Legacy route",
      start: place,
      stops: [place],
      endMode: "return-to-start",
    })
  ).version,
  1
)
assert.throws(() => encodeSharedTrip({ ...trip, lifecycle: "inferred" }))
assert.throws(() => encodeSharedTrip({ ...trip, stops: [] }))
assert.throws(() =>
  encodeSharedTrip({
    ...trip,
    stops: [{ place: { ...place, coordinates: [null, 1] } }],
  })
)
assert.throws(
  () =>
    encodeSharedTrip({
      ...trip,
      stops: Array.from({ length: 50 }, () => ({
        place: {
          ...place,
          name: "n".repeat(120),
          admin1Name: "a".repeat(80),
          countryName: "c".repeat(80),
        },
      })),
    }),
  error => error.code === "shared_trip_too_large"
)

const response = payload =>
  Response.json(payload, {
    headers: { ETag: `"rev-${payload.profile.revision}"` },
  })
const state = {
  profile: { revision: 2, tripSchemaVersion: 1, tripCount: 1 },
  upgraded: true,
  writesEnabled: true,
  rollbackAvailable: false,
  trips: [trip],
}
assert.equal(
  (
    await requestMyAtlasTrips({
      apiBaseUrl: "https://example.test",
      accessToken: "fixture",
      fetchImpl: async (url, options) => {
        assert.equal(url, "https://example.test/v1/me/trips")
        assert.equal(options.method, "GET")
        return response(state)
      },
    })
  ).trips[0].tripId,
  trip.tripId
)
await assert.rejects(
  requestMyAtlasTrips({
    apiBaseUrl: "https://example.test",
    accessToken: "fixture",
    action: "lifecycle",
    tripId: trip.tripId,
    body: { lifecycle: "planned" },
    revision: 2,
    idempotencyKey: "fixture",
    fetchImpl: async () =>
      Response.json(
        { profile: { revision: 2 }, upgraded: true, trip },
        { headers: { ETag: '"rev-20"' } }
      ),
  }),
  error => error.code === "invalid_response"
)
await assert.rejects(
  requestMyAtlasTrips({ action: "editStop", tripId: trip.tripId }),
  error => error.code === "invalid_trip"
)

const source = compiler
  .parseComponent(
    await fs.readFile(
      "src/features/my-atlas/components/MyAtlasTrips.vue",
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let calls = [],
  failure = "unavailable",
  readFailure = false
const dependencies = {
  MyAtlasTravelSearch: {},
  emptyTravelSearchDraft,
  buildGoogleMapsRouteHandoffs,
  buildAiPlanningPrompt,
  MyAtlasExperiences: {},
  MyAtlasLocationPicker: {},
  getMyAtlasApiAccessToken: async () => "fixture",
  requestMyAtlasTrips: async input => {
    calls.push(structuredClone(input))
    if (input.action === "list") {
      if (readFailure) throw Object.assign(Error(), { code: "unavailable" })
      return state
    }
    if (failure) throw Object.assign(Error(), { code: failure })
    return {
      profile: { revision: 2, tripSchemaVersion: 1, tripCount: 1 },
      upgraded: true,
      trip,
      idempotent: false,
    }
  },
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
  buildCanonicalTripMapRoute,
  searchMyAtlasPlaces: async input => {
    assert.equal(typeof input, "object")
    return [place]
  },
  getMyAtlasPlaceSearchEndpoint: () => "https://example.test/search",
  buildSharedTripUrl,
}
const component = new Function(...Object.keys(dependencies), source)(
  ...Object.values(dependencies)
)
const events = []
const ui = {
  ...component.data(),
  apiBaseUrl: "https://example.test",
  revision: 1,
  $emit: (...args) => events.push(args),
}
for (const [name, method] of Object.entries(component.methods))
  ui[name] = method.bind(ui)
for (const [name, getter] of Object.entries(component.computed))
  Object.defineProperty(
    ui,
    name,
    typeof getter === "function"
      ? { get: () => getter.call(ui) }
      : {
          get: () => getter.get.call(ui),
          set: value => getter.set.call(ui, value),
        }
  )
ui.loaded = true
ui.upgraded = true
ui.writesEnabled = true
ui.currentRevision = 1
ui.trips = [trip]
ui.selectedId = trip.tripId
ui.editingStopId = trip.stops[0].stopId
ui.memoryDraft = "Keep this unsaved draft"
const edit = {
  experienceChange: { action: "remove", id: "exp_" + "a".repeat(32) },
}
await ui.mutate("editStop", edit, trip.tripId, trip.stops[0].stopId)
assert.ok(ui.attempt)
assert.equal(ui.memoryDraft, "Keep this unsaved draft")
failure = ""
readFailure = true
await ui.mutate("editStop", edit, trip.tripId, trip.stops[0].stopId)
assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey)
assert.equal(calls[0].revision, calls[1].revision)
assert.equal(ui.savedSequence, 1)
assert.equal(ui.refreshNeeded, true)
assert.ok(
  events.some(
    ([name, event]) => name === "action-feedback" && event.tone === "warning"
  )
)
readFailure = false
await ui.load()
assert.equal(ui.refreshNeeded, false)
assert.equal(ui.memoryDraft, "Keep this unsaved draft")
assert.equal(ui.editingStopId, trip.stops[0].stopId)
failure = "revision_conflict"
await ui.mutate("editStop", edit, trip.tripId, trip.stops[0].stopId)
assert.equal(ui.attempt, null)
assert.equal(ui.refreshNeeded, true)
assert.equal(ui.memoryDraft, "Keep this unsaved draft")
ui.writesEnabled = false
ui.refreshNeeded = false
const before = calls.length
await ui.mutate("lifecycle", { lifecycle: "planned" }, trip.tripId)
assert.equal(
  calls.length,
  before,
  "Client feature gates cannot be bypassed by ordinary actions"
)
const firstVisit = { ...trip, stops: [trip.stops[0]] }
const secondVisit = {
  ...trip,
  tripId: "trip_" + "b".repeat(24),
  stops: [
    {
      ...trip.stops[1],
      place: { ...place, placeId: "geonames:2988507", name: "Paris" },
    },
  ],
}
ui.trips = [firstVisit, secondVisit]
ui.upgraded = true
ui.loaded = true
await ui.prepareDestinationGroup([
  secondVisit.stops[0].place,
  firstVisit.stops[0].place,
])
assert.deepEqual(
  ui.combineIds,
  [secondVisit.tripId, firstVisit.tripId],
  "Visited selection order becomes trip order"
)
assert.equal(ui.filter, "past")
assert.equal(calls.length, before, "Preparing a group never writes")
ui.combineIds.reverse()
ui.applyDestinationGroup()
assert.deepEqual(
  ui.combineIds,
  [firstVisit.tripId, secondVisit.tripId],
  "Refresh does not reset reviewed selections"
)
ui.trips.push({ ...firstVisit, tripId: "trip_" + "c".repeat(24) })
await ui.prepareDestinationGroup([
  firstVisit.stops[0].place,
  secondVisit.stops[0].place,
])
assert.deepEqual(
  ui.combineIds,
  [],
  "Ambiguous repeated visits are not automatically combined"
)
assert.match(ui.error, /multiple visits/)
const originalCall = ui.call
let previewReads = 0
ui.upgraded = false
ui.call = async ({ action }) => {
  assert.equal(action, "preview")
  previewReads++
  return { revision: 2 }
}
await ui.prepareDestinationGroup([
  firstVisit.stops[0].place,
  secondVisit.stops[0].place,
])
assert.equal(previewReads, 1)
assert.equal(
  ui.groupDestinations.length,
  2,
  "Selection survives the upgrade review"
)
assert.equal(
  calls.length,
  before,
  "Legacy grouping only requests a read-only preview"
)
ui.trips = [firstVisit, secondVisit]
ui.upgraded = true
ui.applyDestinationGroup()
assert.deepEqual(ui.combineIds, [firstVisit.tripId, secondVisit.tripId])
ui.call = originalCall
ui.selectedId = firstVisit.tripId
ui.memoryDraft = "Unsaved memory across tabs"
component.watch.scope.handler.call(ui, "planned")
assert.equal(ui.filter, "planned")
assert.equal(ui.selectedId, "", "Past selections do not leak into Planning")
assert.equal(ui.memoryDraft, "Unsaved memory across tabs")
component.watch.scope.handler.call(ui, "past")
assert.equal(ui.filter, "past")
ui.scope = "past"
ui.startNew()
assert.equal(ui.draftLifecycle, "past", "Add trip follows the active tab")
console.log(
  "Trip workspace retry, draft preservation, response validation, read-only v2 sharing and legacy link compatibility tests passed."
)
