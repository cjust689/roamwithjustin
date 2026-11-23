import {
  tripTravelContext,
  seedTravelDates,
  tripTravelFingerprint,
} from "../src/features/my-atlas/planning/tripTravelContext.mjs"
import { validTripCalendarDate } from "../shared/my-atlas-trips.mjs"
import {
  emptyDestinationDraft,
  destinationPlaceSelection,
} from "../src/features/my-atlas/catalog/destinationDraft.mjs"
import { seedTripStayDates } from "../src/features/my-atlas/planning/stays.mjs"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  normalizeTripTravelDraft,
  savedTripTravelDraft,
} from "../shared/my-atlas-trip-logistics.mjs"
import { assertTripStorageBudget } from "../workers/my-atlas/src/trips/store.mjs"
import { fetchMyAtlasAccountExport } from "../src/features/my-atlas/api/client.mjs"
import { requestMyAtlasTrips } from "../src/features/my-atlas/planning/tripClient.mjs"
import {
  encodeSharedTrip,
  decodeSharedTrip,
  buildSharedTripUrl,
} from "../src/features/my-atlas/planning/sharedTrip.mjs"
import { buildCanonicalTripMapRoute } from "../shared/my-atlas-trips.mjs"
import { myAtlasStopMapPlace } from "../src/features/my-atlas/catalog/mapMemory.mjs"
import {
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
} from "../src/features/my-atlas/catalog/customPlace.mjs"
import { emptyTravelSearchDraft } from "../src/features/my-atlas/planning/travelSearch.mjs"
import { formatPlaceTypeLabel } from "../src/features/my-atlas/catalog/placeTypes.mjs"
import {
  journeyCardRecords,
  journeyCardDate,
} from "../src/features/my-atlas/planning/journeyCards.mjs"
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
  tripTravelContext,
  seedTravelDates,
  tripTravelFingerprint,
  validTripCalendarDate,
  formatPlaceTypeLabel,
  MyAtlasDialog: {},
  MyAtlasInfo: {},
  MyAtlasSwitch: {},
  MyAtlasTravelSearch: {},
  MyAtlasVisitManager: {},
  MyAtlasTripDestinations: {},
  journeyCardDate,
  normalizeTripTravelDraft,
  savedTripTravelDraft,
  emptyTravelSearchDraft,
  buildGoogleMapsRouteHandoffs,
  buildAiPlanningPrompt,
  MyAtlasExperiences: {},
  MyAtlasDestinationPicker: {},
  MyAtlasTripLodging: {},
  MyAtlasStayEditor: {},
  seedTripStayDates,
  destinationPlaceSelection,
  emptyDestinationDraft,
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
  myAtlasStopMapPlace,
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
ui.openWorkspace("visit")
await ui.mutate("editStop", edit, trip.tripId, trip.stops[0].stopId)
assert.ok(ui.attempt)
assert.equal(ui.memoryDraft, "Keep this unsaved draft")
assert.equal(
  ui.workspace,
  "visit",
  "An ambiguous write must retain the dialog and draft"
)
ui.pending = true
ui.closeWorkspace()
assert.equal(ui.workspace, "visit", "A pending write cannot be dismissed")
ui.pending = false
failure = ""
readFailure = true
await ui.mutate("editStop", edit, trip.tripId, trip.stops[0].stopId)
assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey)
assert.equal(calls[0].revision, calls[1].revision)
assert.equal(ui.savedSequence, 1)
assert.equal(ui.refreshNeeded, true)
assert.match(
  ui.workspaceStatus,
  /saved.*Refresh trips/i,
  "A confirmed write with failed refresh stays visible inside the dialog"
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
assert.equal(ui.groupDestinations.length, 2)
assert.equal(ui.filter, "past")
assert.deepEqual(
  ui.combineIds,
  [],
  "Selecting destinations does not select or infer existing trips"
)
assert.equal(calls.length, before, "Preparing a group never writes")
ui.groupTitle = "Reviewed group name"
ui.applyDestinationGroup()
assert.equal(
  ui.groupTitle,
  "Reviewed group name",
  "Refresh preserves the entered name"
)
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
assert.deepEqual(ui.combineIds, [])
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
ui.pending = false
ui.refreshNeeded = false
ui.upgraded = false
ui.writesEnabled = true
ui.preview = { ready: true, fingerprint: "a".repeat(64) }
ui.groupDestinations = [
  { pinId: "pin_" + "b".repeat(24), name: "Atlanta" },
  { pinId: "pin_" + "a".repeat(24), name: "Uvita" },
]
ui.groupTitle = ""
ui.retentionAcknowledged = false
assert.equal(ui.canSaveDestinationGroup, false)
ui.groupTitle = "My actual trip"
assert.equal(ui.canSaveDestinationGroup, false)
ui.retentionAcknowledged = true
assert.equal(
  ui.canSaveDestinationGroup,
  true,
  "A name and acknowledgement enable Create trip without a typed magic phrase"
)
const writes = []
ui.mutate = async (action, body) => {
  writes.push({ action, body })
  if (action === "upgrade") ui.upgraded = true
}
await ui.saveDestinationGroup()
assert.deepEqual(
  writes.map(write => write.action),
  ["upgrade", "groupDestinations"]
)
assert.deepEqual(writes[1].body, {
  title: "My actual trip",
  pinIds: ui.groupDestinations.map(place => place.pinId),
})
ui.writesEnabled = false
await ui.saveDestinationGroup()
assert.equal(writes.length, 2, "The UI respects a disabled server gate")
ui.writesEnabled = true
ui.groupTitle = ""
ui.groupTargetId = firstVisit.tripId
assert.equal(
  ui.canSaveDestinationGroup,
  true,
  "An explicit existing trip needs no replacement title"
)
console.log(
  "Trip workspace retry, draft preservation, response validation, read-only v2 sharing and legacy link compatibility tests passed."
)

const savedDraft = normalizeTripTravelDraft(emptyTravelSearchDraft())
const withLogistics = {
  ...trip,
  logistics: {
    flights: [{ searchDraft: savedDraft.flights }],
    rentals: [{ searchDraft: savedDraft.rental }],
  },
}
assert.deepEqual(savedTripTravelDraft(withLogistics), savedDraft)
assert.equal(savedTripTravelDraft(trip), null)
assert.throws(() =>
  normalizeTripTravelDraft({
    ...savedDraft,
    providerUrl: "https://example.test",
  })
)
const privateSearch = structuredClone(savedDraft)
privateSearch.flights.outboundFrom = "PRIVATE AIRPORT SEARCH"
assert.ok(
  !JSON.stringify(
    decodeSharedTrip(
      encodeSharedTrip({
        ...withLogistics,
        logistics: {
          flights: [{ searchDraft: privateSearch.flights }],
          rentals: [{ searchDraft: privateSearch.rental }],
        },
      })
    )
  ).includes("PRIVATE AIRPORT SEARCH")
)
assert.deepEqual(journeyCardRecords([], []), [])
assert.equal(journeyCardDate({ trip, legacy: false }), "")
assert.equal(
  journeyCardDate({
    trip: {
      ...trip,
      stops: [
        {
          ...stop(1),
          actualDates: { arrival: "2025-03-03", departure: "2025-03-04" },
        },
        { ...stop(2), actualDates: { arrival: "2025-02-01", departure: null } },
      ],
    },
    legacy: false,
  }),
  "2025-02-01 to 2025-03-04"
)
const legacyCard = {
  planId: "plan_old",
  title: "Old plan",
  stops: [place],
  desiredYear: 2027,
  updatedAt: "2026-01-01",
}
assert.deepEqual(
  journeyCardRecords([trip], [legacyCard]).map(record => record.legacy),
  [false, true]
)
assert.equal(journeyCardDate({ trip: legacyCard, legacy: true }), "2027")
assert.equal(
  journeyCardRecords([{ ...trip, tripId: legacyCard.planId }], [legacyCard])
    .length,
  1
)
console.log(
  "Journey dates, canonical/legacy cards, private logistics reload and share exclusion tests passed."
)

ui.pending = false
ui.refreshNeeded = false
ui.writesEnabled = true
ui.startNew()
// The default journey is a recap. Management still uses the existing guarded
// actions, and drag previews never change persisted or prop-owned stop order.
ui.trips = [structuredClone(trip)]
ui.selectedId = trip.tripId
ui.refreshNeeded = false
ui.writesEnabled = true
ui.pending = false
ui.scope = "past"
ui.filter = "past"
ui.profilePublic = false
assert.equal(ui.selectedDate, "")
ui.selected.stops[0].visitedDates = [{ year: 2026 }]
assert.equal(ui.selectedDate, "2026")
ui.editingStopId = ""
ui.editStop(ui.selected.stops[0])
assert.equal(ui.workspaceTab, "memory")
assert.equal(ui.memoryDraft, "Private memory 1")
assert.deepEqual(
  ui.visitSections.map(section => section.key),
  ["memory", "planning", "dates", "experiences", "actions"]
)
assert.deepEqual(
  ui.dialogTabs,
  [],
  "The destination picker replaces the tab-button row"
)
ui.openStopActions(ui.selected.stops[1])
assert.equal(ui.editingStopId, trip.stops[1].stopId)
assert.equal(ui.workspaceTab, "actions")
ui.openWorkspace("metadata")
assert.equal(ui.workspaceTab, "details")
assert.equal(ui.dialogTabs[1].key, "settings")
ui.openWorkspace("visits")
assert.deepEqual(
  ui.dialogTabs.map(tab => tab.key),
  ["order", "move", "existing"]
)
ui.selected.lifecycle = "planned"
assert.deepEqual(
  ui.dialogTabs.map(tab => tab.key),
  ["order", "move"]
)
ui.selected.lifecycle = "past"
ui.openWorkspace("share")
assert.equal(ui.dialogTitle, "Share journey")
assert.equal(ui.canAddExistingDestinations, true)
ui.profilePublic = true
assert.equal(ui.canAddExistingDestinations, false)
ui.startNew()
ui.draftTitle = "Just an idea"
assert.equal(
  ui.canCreateTrip,
  false,
  "Older servers require a first destination"
)
ui.capabilities = { emptyTripDrafts: true, planningNotes: true }
assert.equal(
  ui.canCreateTrip,
  true,
  "Capable servers accept a named empty draft"
)
ui.draftTitle = "  "
assert.equal(ui.canCreateTrip, false)
ui.selectedId = trip.tripId
ui.selected.lifecycle = "planned"
ui.editingStopId = ""
ui.editStop(ui.selected.stops[0])
assert.equal(ui.workspaceTab, "planning")
assert.equal(ui.planNoteDraft, ui.editingStop.planNote)
ui.planNoteDraft = "Keep this idea separate"
ui.memoryDraft = "A different memory"
ui.workspaceTab = "dates"
ui.workspaceTab = "planning"
assert.equal(ui.planNoteDraft, "Keep this idea separate")
assert.equal(ui.memoryDraft, "A different memory")
ui.selected.lifecycle = "past"
ui.destinations = [{ pinId: "pin_" + "a".repeat(24), placeId: place.placeId }]
ui.knownPlaces = [place]
assert.equal(
  ui.existingDestinations[0].name,
  "London",
  "Standalone pins use resolved place names without changing the pin reference"
)
assert.equal(ui.existingDestinations[0].pinId, ui.destinations[0].pinId)
const originalMutate = ui.mutate
const managementWrites = []
ui.mutate = (...args) => managementWrites.push(args)
ui.reorderStops([trip.stops[0].stopId, trip.stops[0].stopId])
ui.reorderStops(["another-owner-stop", trip.stops[0].stopId])
ui.moveStop(0, -1)
ui.moveStop(1, 1)
assert.equal(managementWrites.length, 0)
const reversedIds = ui.selected.stops.map(item => item.stopId).reverse()
ui.reorderStops(reversedIds)
assert.deepEqual(managementWrites.pop(), [
  "reorder",
  { stopIds: reversedIds },
  trip.tripId,
])
ui.openStopActions(ui.selected.stops[0])
ui.removeStop(ui.editingStop)
assert.equal(
  managementWrites.length,
  0,
  "Permanent removal requires its own in-dialog confirmation"
)
ui.confirmRemoveStop()
assert.equal(ui.workspace, "remove")
ui.removeStop(ui.editingStop)
assert.equal(managementWrites.pop()[0], "removeStop")
ui.pending = true
ui.openWorkspace("metadata")
assert.equal(ui.workspace, "remove", "Pending writes cannot switch editors")
ui.pending = false
ui.mutate = originalMutate

const destinationFile = compiler.parseComponent(
  await fs.readFile(
    "src/features/my-atlas/components/MyAtlasTripDestinations.vue",
    "utf8"
  )
)
assert.deepEqual(compiler.compile(destinationFile.template.content).errors, [])
const gestureListeners = { addEventListener() {}, removeEventListener() {} }
const destinationComponent = new Function(
  "document",
  "window",
  destinationFile.script.content.replace("export default", "return")
)(gestureListeners, gestureListeners)
const destinationEvents = []
const list = {
  ...destinationComponent.data(),
  stops: structuredClone(trip.stops),
  pending: false,
  reorderable: true,
  $emit: (...args) => destinationEvents.push(args),
}
for (const [name, method] of Object.entries(destinationComponent.methods))
  list[name] = method.bind(list)
Object.defineProperty(list, "orderedStops", {
  get: () => destinationComponent.computed.orderedStops.call(list),
})
list.$refs = {
  list: {
    children: list.stops.map((item, index) => ({
      dataset: { stopId: item.stopId },
      getBoundingClientRect: () => ({ top: index * 80, height: 80 }),
    })),
  },
}
list.$el = { closest: () => null }
const originalIds = list.stops.map(item => item.stopId)
let capturedPointer
const pointer = {
  button: 0,
  pointerId: 1,
  currentTarget: {
    setPointerCapture: id => {
      capturedPointer = id
    },
  },
}
list.startDrag(pointer, originalIds[0])
assert.equal(capturedPointer, 1)
list.drag({ pointerId: 1, clientY: 180 })
assert.deepEqual(
  list.orderedStops.map(item => item.stopId),
  [...originalIds].reverse()
)
assert.deepEqual(
  list.stops.map(item => item.stopId),
  originalIds
)
assert.equal(
  destinationEvents.length,
  0,
  "Dragging only previews until release"
)
list.cancelDrag()
assert.deepEqual(
  list.orderedStops.map(item => item.stopId),
  originalIds
)
list.startDrag(pointer, originalIds[0])
list.drag({ pointerId: 1, clientY: 180 })
list.finishDrag({ pointerId: 7 })
assert.equal(
  destinationEvents.length,
  0,
  "Other pointers cannot commit an order"
)
list.finishDrag({ pointerId: 1 })
assert.deepEqual(destinationEvents.pop(), [
  "reorder",
  [...originalIds].reverse(),
])
list.move(0, -1)
list.move(1, 1)
assert.equal(destinationEvents.length, 0)
list.move(0, 1)
assert.deepEqual(destinationEvents.pop(), [
  "reorder",
  [...originalIds].reverse(),
])
list.pending = true
list.move(0, 1)
list.startDrag(pointer, originalIds[0])
assert.equal(list.dragId, "")
assert.equal(destinationEvents.length, 0)
list.pending = false
list.reorderDisabled = true
list.move(0, 1)
list.startDrag(pointer, originalIds[0])
assert.equal(list.dragId, "")
assert.equal(
  destinationEvents.length,
  0,
  "Read-only and refresh states cannot reorder"
)
console.log(
  "Compact destination sections, explicit management, single-dialog removal, and occurrence-safe pointer/keyboard reordering checks passed."
)

// Creating a named record precedes every destination action. A failed create
// keeps the name in its original form, while a confirmed create advances once.
ui.mutate = component.methods.mutate.bind(ui)
ui.scope = "planned"
ui.filter = "planned"
ui.pending = false
ui.refreshNeeded = false
ui.capabilities = { emptyTripDrafts: true, planningNotes: true }
ui.startNew()
ui.draftTitle = "A hike to plan"
ui.$refs = {}
const named = {
  ...structuredClone(trip),
  title: ui.draftTitle,
  lifecycle: "planned",
  workflow: "draft",
  stops: [],
}
const nameCalls = []
let failName = true
ui.call = async input => {
  nameCalls.push(structuredClone(input))
  if (input.action === "list")
    return {
      trips: [named],
      profile: { revision: 50 },
      upgraded: true,
      writesEnabled: true,
      capabilities: ui.capabilities,
    }
  if (failName) throw Object.assign(Error(), { code: "unavailable" })
  return { trip: named, profile: { revision: 50 }, upgraded: true }
}
await ui.createNamedTrip()
assert.equal(ui.workspace, "create")
assert.equal(ui.draftTitle, "A hike to plan")
assert.equal(ui.selectedId, "")
failName = false
await ui.createNamedTrip()
assert.equal(ui.workspace, "add")
assert.equal(ui.selectedId, named.tripId)
assert.deepEqual(
  nameCalls.filter(call => call.action !== "list").map(call => call.body.stops),
  [[], []]
)
ui.destinationDraft = {
  ...emptyDestinationDraft(),
  query: "9.17, -83.74",
  name: "Trailhead",
}
const beforeReview = nameCalls.length
ui.beginPlacement({
  kind: "explicit-coordinate",
  name: "Trailhead",
  coordinates: [-83.74, 9.17],
})
assert.equal(ui.workspace, "")
ui.resumePlacementEditor()
assert.equal(ui.workspace, "add")
assert.equal(ui.destinationDraft.reviewed, false)
assert.equal(ui.destinationDraft.query, "9.17, -83.74")
ui.beginPlacement({
  kind: "explicit-coordinate",
  name: "Trailhead",
  coordinates: [-83.74, 9.17],
})
ui.setCoordinates([-83.8, 9.2])
assert.equal(ui.workspace, "add")
assert.equal(ui.destinationDraft.reviewed, true)
assert.deepEqual(ui.destinationDraft.coordinates, [-83.8, 9.2])
assert.equal(
  nameCalls.length,
  beforeReview,
  "Review and both return paths never save a destination"
)
console.log(
  "Name-first persistence, failed-create retention and explicit pin-review return tests passed."
)

ui.trips = [{ ...structuredClone(trip), lifecycle: "planned" }]
ui.selectedId = trip.tripId
ui.pending = false
ui.refreshNeeded = false
ui.capabilities = {
  emptyTripDrafts: true,
  planningNotes: true,
  routeEndpoints: true,
}
const plannedWrites = []
ui.$set = (target, key, value) => (target[key] = value)
ui.mutate = (...args) => plannedWrites.push(args)
ui.editingStopId = ""
ui.editStop(ui.selected.stops[0])
ui.dates.plannedArrival = "2027-04-06"
ui.dates.plannedDeparture = "2027-04-18"
ui.planNoteDraft = "A hike idea"
ui.saveStopPlanning()
assert.deepEqual(plannedWrites.pop(), [
  "editStop",
  {
    plannedDates: { arrival: "2027-04-06", departure: "2027-04-18" },
    planNote: "A hike idea",
  },
  trip.tripId,
  trip.stops[0].stopId,
])
ui.dates.plannedDeparture = "2027-04-01"
ui.saveStopPlanning()
assert.equal(plannedWrites.length, 0)
assert.match(ui.workspaceStatus, /departure on or after/)
ui.openWorkspace("endpoints")
ui.chooseEndpoint({
  selection: {
    customPlace: { name: "Private departure", coordinates: [1, 2] },
  },
})
ui.endpointDraft.start.plannedDates.departure = "2027-04-05"
ui.endpointRole = "finish"
ui.finishAtStart()
assert.equal(
  ui.endpointDraft.finish.plannedDates.arrival,
  null,
  "Return dates must not be copied from departure dates"
)
ui.endpointDraft.finish.plannedDates.arrival = "2027-04-20"
ui.saveEndpoints()
const endpointWrite = plannedWrites.pop()
assert.equal(endpointWrite[0], "metadata")
assert.equal(
  endpointWrite[1].routeEndpoints.start.place.customPlace.name,
  "Private departure"
)
assert.equal(
  endpointWrite[1].routeEndpoints.finish.plannedDates.arrival,
  "2027-04-20"
)
assert.equal(
  ui.selected.stops.length,
  trip.stops.length,
  "Endpoint drafting never creates destinations"
)
const startPlace = { ...place, name: "Private departure" }
ui.selected.routeEndpoints = {
  start: {
    place: startPlace,
    plannedDates: { arrival: null, departure: "2027-04-05" },
  },
  finish: {
    place: startPlace,
    plannedDates: { arrival: "2027-04-20", departure: null },
  },
}
const routeWithEndpoints = buildCanonicalTripMapRoute(ui.selected)
assert.deepEqual(
  routeWithEndpoints.map(node => node.role),
  ["start", "stop", "stop", "finish"]
)
assert.equal(routeWithEndpoints[1].key, trip.stops[0].stopId)
assert.equal(
  JSON.stringify(decodeSharedTrip(encodeSharedTrip(ui.selected))).includes(
    "Private departure"
  ),
  false
)
assert.equal(ui.selectedDate, "2027-04-05 to 2027-04-20")
console.log(
  "Visible destination date saves, optional endpoint drafts, date order, stable visit identities and shared-link privacy passed."
)

ui.capabilities.stays = true
ui.editStay()
ui.stayDraft.name = "Private base camp"
ui.stayDraft.url = "https://example.com/stay"
ui.stayDraft.checkIn = "2026-06-10"
ui.stayDraft.checkOut = "2026-06-13"
ui.destinationDraft.name = "Nearby town"
ui.beginPlacement({
  kind: "explicit-coordinate",
  coordinates: [1, 2],
  name: "Nearby town",
})
assert.equal(ui.workspace, "")
assert.equal(ui.stayDraft.name, "Private base camp")
ui.setCoordinates([1.1234567, 2.1234567])
assert.equal(ui.workspace, "stay")
assert.equal(ui.stayDraft.checkIn, "2026-06-10")
ui.chooseStayLocation({
  selection: {
    customPlace: { name: "Nearby town", coordinates: [1.123457, 2.123457] },
  },
})
await ui.saveStay()
const stayWrite = plannedWrites.pop()
assert.equal(stayWrite[0], "addStay")
assert.deepEqual(stayWrite[1].place, {
  customPlace: { name: "Nearby town", coordinates: [1.123457, 2.123457] },
})
assert.equal(stayWrite[1].name, "Private base camp")
assert.equal(ui.selected.stops.length, trip.stops.length)
console.log(
  "Private lodging form reuses map confirmation, retains stay drafts and creates no destination stops"
)
