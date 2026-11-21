import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import {
  assertCanonicalTrip,
  transitionTripLifecycle,
  reorderTripStops,
  removeEmptyTripStop,
  buildCanonicalTripMapRoute,
  validTripCalendarDate,
} from "../shared/my-atlas-trips.mjs"
import { previewTripUpgrade } from "../workers/my-atlas/src/trips/preview.mjs"

const digest = async value => createHash("sha256").update(value).digest("hex")
const now = "2026-11-20T12:00:00.000Z",
  later = "2026-11-21T12:00:00.000Z"
const london = {
  placeId: "geonames:2643743",
  placeType: "city",
  name: "London",
  coordinates: [-0.1257, 51.5085],
  countryCode: "GB",
  countryName: "United Kingdom",
}
const paris = {
  placeId: "geonames:2988507",
  placeType: "city",
  name: "Paris",
  coordinates: [2.3488, 48.8534],
  countryCode: "FR",
  countryName: "France",
}
const pins = [
  {
    pinId: "pin_" + "1".repeat(24),
    placeId: london.placeId,
    visitedDates: [{ year: 2024, month: 5 }, { year: 2025 }],
    visitedYears: [2024, 2025],
    memory: "Keep this memory.\nAnd its second line.",
    experiences: [
      {
        id: "exp_" + "e".repeat(32),
        title: "Private activity",
        operatorName: "",
        operatorWebsite: "",
        visibility: "private",
        source: "user-recap",
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    pinId: "pin_" + "2".repeat(24),
    placeId: paris.placeId,
    visitedDates: [{ year: 2025 }],
    visitedYears: [2025],
    memory: "A separate visit",
    createdAt: now,
    updatedAt: now,
  },
]
const plan = {
  planId: "plan_" + "3".repeat(24),
  title: "A planned journey",
  status: "saved",
  note: "Private planning notes",
  start: paris,
  stops: [london, paris],
  endMode: "return-to-start",
  end: null,
  desiredYear: 2027,
  retentionState: "active",
  retentionExpiresAt: "2027-05-20T12:00:00.000Z",
  createdAt: now,
  updatedAt: now,
}
const source = {
  profile: {
    userId: "usr_fixture",
    revision: 8,
    pinCount: 2,
    planCount: 1,
    wishCount: 0,
    public: true,
  },
  pins,
  plans: [plan],
  wishes: [],
  atlasImage: { imageId: "existing-image", storageKey: "private/image-key" },
}
const unchanged = structuredClone(source)
const resolver = async id =>
  id === london.placeId ? london : id === paris.placeId ? paris : null
const result = await previewTripUpgrade(source, {
  resolvePlace: resolver,
  digest,
})
assert.equal(result.ready, true)
assert.deepEqual(source, unchanged, "Preview must not mutate source data")
assert.equal(
  result.trips.length,
  1,
  "Only the existing plan is a trip; destinations are not inferred trips"
)
assert.equal(
  result.counts.candidateStops,
  2,
  "Endpoints are not fabricated as visits"
)
assert.equal(
  result.trips.find(trip => trip.lifecycle === "planned").tripId,
  plan.planId
)
assert.equal(result.destinations.length, 2)
assert.deepEqual(result.destinations[0].snapshot, pins[0])
const past = {
  ...result.trips[0],
  tripId: "trip_" + "e".repeat(24),
  lifecycle: "past",
  stops: [result.destinations[0].stop],
  sharing: { publicAtlas: true },
  legacy: { snapshot: result.destinations[0].snapshot },
}
assert.deepEqual(past.legacy.snapshot, pins[0])
assert.deepEqual(past.stops[0].visitedDates, pins[0].visitedDates)
assert.equal(past.stops[0].memories[0].text, pins[0].memory)
assert.deepEqual(past.stops[0].experiences, pins[0].experiences)
assert.equal(
  past.sharing.publicAtlas,
  true,
  "Retain the prior public geography choice in the candidate"
)
const planned = result.trips.find(trip => trip.lifecycle === "planned")
assert.equal(
  planned.sharing.publicAtlas,
  false,
  "A private plan must not become public"
)
assert.deepEqual(
  planned.legacy.snapshot,
  plan,
  "Preserve endpoints, notes and retention without interpreting them"
)
assert.equal(planned.stops[0].place.placeId, past.stops[0].place.placeId)
assert.notEqual(planned.stops[0].stopId, past.stops[0].stopId)
assert.deepEqual(
  planned.stops[0].memories,
  [],
  "Repeated places must not share another visit's memory"
)
assert.deepEqual(planned.stops[0].experiences, [])
assert.equal(
  (await previewTripUpgrade(source, { resolvePlace: resolver, digest }))
    .fingerprint,
  result.fingerprint
)
assert.equal(
  (await previewTripUpgrade(source, { resolvePlace: resolver, digest }))
    .trips[0].tripId,
  result.trips[0].tripId
)
const anotherOwner = await previewTripUpgrade(
  { ...source, profile: { ...source.profile, userId: "usr_another" } },
  { resolvePlace: resolver, digest }
)
assert.equal(
  anotherOwner.trips[0].tripId,
  result.trips[0].tripId,
  "Preserve the original plan ID"
)
assert.notEqual(
  anotherOwner.destinations[0].stop.stopId,
  result.destinations[0].stop.stopId
)
assert.notEqual(
  (
    await previewTripUpgrade(source, {
      resolvePlace: async id => ({
        ...(await resolver(id)),
        name: "A changed catalog name",
      }),
      digest,
    })
  ).fingerprint,
  result.fingerprint
)
assert.notEqual(
  (
    await previewTripUpgrade(
      { ...source, profile: { ...source.profile, revision: 9 } },
      { resolvePlace: resolver, digest }
    )
  ).fingerprint,
  result.fingerprint
)
const blocked = await previewTripUpgrade(source, {
  resolvePlace: async () => null,
  digest,
})
assert.equal(blocked.ready, false)
assert.equal(blocked.issues.length, 2)
assert.deepEqual(source, unchanged)

for (const trip of result.trips) assertCanonicalTrip(trip)
const traveled = transitionTripLifecycle(planned, "past", {
  expectedVersion: 1,
  now: later,
})
assert.equal(traveled.tripId, planned.tripId)
assert.equal(traveled.stops, planned.stops)
assert.equal(traveled.legacy, planned.legacy)
assert.equal(traveled.logistics, planned.logistics)
assert.equal(
  transitionTripLifecycle(traveled, "past", { expectedVersion: 2, now: later }),
  traveled,
  "Repeated status changes are no-ops"
)
const reversed = transitionTripLifecycle(traveled, "planned", {
  expectedVersion: 2,
  now: later,
})
const content = trip => {
  const rest = { ...trip }
  for (const key of ["lifecycle", "version", "updatedAt", "statusChangedAt"])
    delete rest[key]
  return rest
}
assert.deepEqual(content(reversed), content(planned))
assert.throws(
  () =>
    transitionTripLifecycle(traveled, "planned", {
      expectedVersion: 1,
      now: later,
    }),
  error => error.code === "revision_conflict"
)
assert.throws(() =>
  transitionTripLifecycle(traveled, "inferred-from-date", {
    expectedVersion: 2,
    now: later,
  })
)
const reordered = reorderTripStops(
  traveled,
  [...traveled.stops].reverse().map(stop => stop.stopId),
  { expectedVersion: 2, now: later }
)
assert.equal(reordered.stops[0], traveled.stops[1])
assert.throws(() =>
  reorderTripStops(
    traveled,
    [traveled.stops[0].stopId, traveled.stops[0].stopId],
    { expectedVersion: 2, now: later }
  )
)
assert.throws(
  () =>
    removeEmptyTripStop(past, past.stops[0].stopId, {
      expectedVersion: 1,
      now: later,
    }),
  error => error.code === "stop_has_content"
)
const single = {
  ...past,
  stops: [
    { ...past.stops[0], memories: [], experiences: [], visitedDates: [] },
  ],
}
assert.equal(buildCanonicalTripMapRoute(single).length, 1)
assert.equal(
  buildCanonicalTripMapRoute(single)[0].role,
  "stop",
  "No invented start or return marker"
)
assert.throws(
  () =>
    removeEmptyTripStop(single, single.stops[0].stopId, {
      expectedVersion: 1,
      now: later,
    }),
  error => error.code === "trip_needs_stop"
)
const repeated = {
  ...planned,
  stops: [
    planned.stops[0],
    { ...planned.stops[0], stopId: "stop_" + "a".repeat(32) },
  ],
}
assertCanonicalTrip(repeated)
assert.notEqual(
  buildCanonicalTripMapRoute(repeated)[0].key,
  buildCanonicalTripMapRoute(repeated)[1].key
)
assert.equal(validTripCalendarDate("2024-02-29"), true)
assert.equal(validTripCalendarDate("2025-02-29"), false)
assert.equal(validTripCalendarDate("2026-13-01"), false)
assert.equal(validTripCalendarDate(null), true)
console.log(
  "Canonical trip identity, reversible lifecycle, repeat-visit isolation and nonmutating migration preview tests passed."
)
