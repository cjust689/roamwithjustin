import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  normalizeTripStay,
  tripStayNights,
  assertTripStays,
  normalizeTripStayUrl,
} from "../shared/my-atlas-trips.mjs"
import {
  sortedTripStays,
  seedTripStayDates,
  stayDateLabel,
} from "../src/features/my-atlas/planning/stays.mjs"
import { destinationPlaceSelection } from "../src/features/my-atlas/catalog/destinationDraft.mjs"
import { requestMyAtlasTrips } from "../src/features/my-atlas/planning/tripClient.mjs"

const place = {
  placeId: "geonames:2643743",
  placeType: "city",
  name: "London",
  coordinates: [-0.1257, 51.5085],
  countryCode: "GB",
  countryName: "United Kingdom",
  admin1Name: "England",
  continent: "EU",
  featureCode: "PPLC",
  routeReadiness: "road-accessible",
}
const stay = {
  id: "stay_" + "a".repeat(32),
  name: "Base camp",
  url: "https://example.com/stay?ref=original",
  checkIn: "2026-06-10",
  checkOut: "2026-06-13",
  place,
}
assert.deepEqual(normalizeTripStay(stay), stay)
assert.equal(tripStayNights(stay.checkIn, stay.checkOut), 3)
assert.equal(tripStayNights("2026-03-07", "2026-03-09"), 2)
assert.equal(tripStayNights("2024-02-28", "2024-03-01"), 2)
for (const date of [null, "", "2026-02-30", "2026-06-10T00:00:00Z"])
  assert.equal(tripStayNights(date, "2026-06-13"), null)
assert.equal(tripStayNights("2026-06-13", "2026-06-13"), null)
assert.equal(tripStayNights("2026-06-14", "2026-06-13"), null)
assert.equal(
  normalizeTripStayUrl("http://example.com/stay"),
  "http://example.com/stay"
)
for (const url of [
  "javascript:alert(1)",
  "data:text/plain,hello",
  "//example.com",
  "https://user:pass@example.com",
  "https://exa mple.com",
  "https://example.com/\\evil",
])
  assert.throws(() => normalizeTripStayUrl(url))
for (const patch of [
  { checkOut: "2026-06-09" },
  { name: "<b>bad</b>" },
  { stopIds: [] },
  { nights: 3 },
  { place: { ...place, coordinates: [181, 2] } },
])
  assert.throws(() => normalizeTripStay({ ...stay, ...patch }))
assert.deepEqual(assertTripStays(), [])
assert.throws(() => assertTripStays([stay, stay]))
assert.equal(
  sortedTripStays({ stays: [{ ...stay, checkIn: "2026-07-01" }, stay] })[0],
  stay
)
assert.match(stayDateLabel("2026-06-10"), /10/)
assert.deepEqual(destinationPlaceSelection(place), { placeId: place.placeId })
assert.deepEqual(destinationPlaceSelection({ ...place, placeType: "custom" }), {
  customPlace: { name: place.name, coordinates: place.coordinates },
})
assert.deepEqual(
  seedTripStayDates({
    lifecycle: "past",
    stops: [
      { actualDates: { arrival: "2025-06-10", departure: "2025-06-13" } },
    ],
  }),
  { checkIn: "2025-06-10", checkOut: "2025-06-13" }
)
for (const [action, method, suffix] of [
  ["addStay", "POST", "/stays"],
  ["editStay", "PATCH", "/stays/" + stay.id],
  ["removeStay", "DELETE", "/stays/" + stay.id],
]) {
  await requestMyAtlasTrips({
    action,
    tripId: "trip_" + "a".repeat(24),
    stayId: stay.id,
    apiBaseUrl: "https://api.example.com",
    accessToken: "fixture",
    revision: 1,
    idempotencyKey: "fixture",
    fetchImpl: async (url, options) => {
      assert.ok(url.endsWith(suffix))
      assert.equal(options.method, method)
      return Response.json(
        { profile: { revision: 2 }, upgraded: true },
        { headers: { ETag: '"rev-2"' } }
      )
    },
  })
}
await assert.rejects(
  requestMyAtlasTrips({ action: "editStay", tripId: "trip_" + "a".repeat(24) }),
  error => error.code === "invalid_trip"
)
for (const name of ["MyAtlasTripLodging", "MyAtlasStayEditor"]) {
  const source = compiler.parseComponent(
    await fs.readFile(`src/features/my-atlas/components/${name}.vue`, "utf8")
  )
  assert.deepEqual(compiler.compile(source.template.content).errors, [])
}
console.log(
  "Private stays: dates/DST, URL safety, destination metadata reuse, limits, client routes and Vue templates passed"
)
