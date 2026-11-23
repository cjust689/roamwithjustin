import assert from "node:assert/strict"
import {
  emptyTravelSearchDraft,
  reviewFlightSearch,
  reviewRentalSearch,
  TRAVEL_SEARCH_PROVIDERS,
} from "../src/features/my-atlas/planning/travelSearch.mjs"
import { normalizedFlightAirportCode } from "../src/features/my-atlas/planning/handoffs.mjs"
import {
  tripTravelContext,
  seedTravelDates,
  tripTravelFingerprint,
} from "../src/features/my-atlas/planning/tripTravelContext.mjs"

const draft = emptyTravelSearchDraft()
assert.equal(draft.flights.outboundFrom, "")
const flight = {
  ...draft.flights,
  outboundFrom: "ATL",
  outboundTo: "MAD",
  departDate: "2027-04-05",
  returnDate: "2027-04-20",
}
assert.equal(reviewFlightSearch(flight).links.length, 0)
const reviewed = reviewFlightSearch({ ...flight, confirmed: true })
assert.equal(reviewed.legs.length, 2)
assert.equal(reviewed.legs[1].origin, "MAD")
assert.equal(reviewed.legs[1].destination, "ATL")
const roundtrip = new URL(reviewed.links[0].url)
assert.equal(roundtrip.origin, "https://www.expedia.com")
assert.equal(
  roundtrip.pathname,
  "/go/flight/search/Roundtrip/2027-04-05/2027-04-20"
)
assert.deepEqual(
  [...roundtrip.searchParams.keys()].sort(),
  [
    "FromAirport",
    "NumAdult",
    "ToAirport",
    "TripType",
    "FromDate",
    "ToDate",
    "load",
  ].sort()
)
assert.equal(roundtrip.searchParams.get("FromAirport"), "ATL")
assert.equal(roundtrip.searchParams.get("ToAirport"), "MAD")
assert.equal(roundtrip.searchParams.get("TripType"), "RoundTrip")
assert.equal(roundtrip.searchParams.get("FromDate"), "2027-04-05")
assert.equal(roundtrip.searchParams.get("ToDate"), "2027-04-20")
assert.equal(normalizedFlightAirportCode("atl"), "ATL")
assert.equal(normalizedFlightAirportCode("Atlanta (ATL)"), "ATL")
assert.equal(normalizedFlightAirportCode("ATL - Hartsfield Jackson"), "ATL")
assert.equal(normalizedFlightAirportCode("Atlanta"), "")
assert.equal(normalizedFlightAirportCode("(ATL) or (SJO)"), "")
const labeled = reviewFlightSearch({
  ...flight,
  outboundFrom: "Atlanta (atl)",
  outboundTo: "mad",
  confirmed: true,
})
assert.equal(
  new URL(labeled.links[0].url).searchParams.get("FromAirport"),
  "ATL"
)
assert.equal(new URL(labeled.links[0].url).searchParams.get("ToAirport"), "MAD")
assert.ok(
  reviewFlightSearch({
    ...flight,
    outboundFrom: "Atlanta",
    confirmed: true,
  }).readiness.some(message => /City names/.test(message))
)
const openJaw = reviewFlightSearch({
  ...flight,
  searchType: "open-jaw",
  returnFrom: "AGP",
  returnTo: "ATL",
  confirmed: true,
})
assert.equal(openJaw.links.length, 2)
assert.equal(
  new URL(openJaw.links[1].url).searchParams.get("FromAirport"),
  "AGP"
)
assert.equal(openJaw.legs[1].origin, "AGP")
const dateFree = reviewFlightSearch({
  ...flight,
  departDate: "",
  returnDate: "",
  confirmed: true,
})
assert.equal(dateFree.links.length, 0)
assert.equal(dateFree.legs.length, 2)
assert.equal(
  reviewFlightSearch({ ...flight, outboundFrom: "Atlanta", confirmed: true })
    .links.length,
  0
)
assert.equal(
  reviewFlightSearch({ ...flight, searchType: "one-way", confirmed: true }).legs
    .length,
  1
)
assert.equal(
  reviewFlightSearch({ ...flight, searchType: "individual-legs" }).legs.length,
  0
)
assert.throws(
  () => reviewFlightSearch({ ...flight, returnDate: "2027-04-01" }),
  /return date/
)
assert.throws(
  () => reviewFlightSearch({ ...flight, departDate: "2027-02-30" }),
  /valid flight date/
)
assert.throws(
  () => reviewFlightSearch({ ...flight, outboundFrom: "<script>" }),
  /invalid/
)

const pairs = [
  {
    pairKey: "outbound",
    from: { location: { name: "Atlanta" } },
    to: { isFinish: false, location: { name: "Madrid" } },
  },
  {
    pairKey: "middle",
    from: { location: { name: "Amsterdam" } },
    to: { isFinish: false, location: { name: "Split" } },
  },
  {
    pairKey: "return",
    from: { location: { name: "Malaga" } },
    to: { isFinish: true, location: { name: "Atlanta" } },
  },
]
const originalPairs = JSON.stringify(pairs)
const conflict = reviewFlightSearch({ ...flight, confirmed: true }, pairs)
assert.equal(conflict.conflicts.length, 1)
assert.equal(conflict.links.length, 0)
assert.equal(
  reviewFlightSearch(
    { ...flight, confirmed: true, conflictChoice: "main" },
    pairs
  ).links.length,
  1
)
assert.equal(JSON.stringify(pairs), originalPairs)

const rental = { ...draft.rental, pickup: "Madrid Airport", confirmed: true }
const same = reviewRentalSearch(rental)
assert.match(same.details, /Drop off at Madrid Airport/)
assert.equal(same.url, TRAVEL_SEARCH_PROVIDERS.avis.url)
assert.equal(new URL(same.url).search, "")
assert.equal(reviewRentalSearch({ ...rental, confirmed: false }).url, null)
assert.match(
  reviewRentalSearch({
    ...rental,
    dropoffMode: "different-location",
    dropoff: "Malaga Airport",
  }).details,
  /Drop off at Malaga Airport/
)
assert.equal(reviewRentalSearch({ ...rental, need: "no" }).url, null)
assert.throws(
  () =>
    reviewRentalSearch({
      ...rental,
      pickupAt: "2027-04-10T10:00",
      dropoffAt: "2027-04-09T10:00",
    }),
  /after pickup/
)
assert.throws(
  () => reviewRentalSearch({ ...rental, pickupAt: "2027-02-30T10:00" }),
  /valid rental date/
)
assert.throws(
  () =>
    reviewRentalSearch({
      ...rental,
      dropoffMode: "different-location",
      dropoff: "",
    }),
  /Choose pickup/
)
assert.equal(draft.rental.pickup, "")
const trip = {
  stops: [
    {
      stopId: "one",
      place: { placeId: "one", name: "Uvita" },
      plannedDates: { arrival: "2027-04-06", departure: "2027-04-10" },
    },
    {
      stopId: "two",
      place: { placeId: "two", name: "La Fortuna" },
      plannedDates: { arrival: "2027-04-11", departure: "2027-04-18" },
    },
  ],
  routeEndpoints: {
    start: {
      place: { name: "Atlanta" },
      plannedDates: { arrival: null, departure: "2027-04-05" },
    },
    finish: {
      place: { name: "Atlanta" },
      plannedDates: { arrival: "2027-04-20", departure: null },
    },
  },
}
const context = tripTravelContext(trip)
assert.equal(context.departDate, "2027-04-05")
assert.equal(context.returnDate, "2027-04-20")
const seeded = seedTravelDates(draft, context)
assert.equal(seeded.flights.departDate, context.departDate)
assert.equal(seeded.flights.returnDate, context.returnDate)
assert.equal(
  seeded.flights.outboundFrom,
  "",
  "A city endpoint must not silently select an airport"
)
assert.equal(seeded.flights.outboundTo, "")
assert.equal(
  draft.flights.departDate,
  "",
  "Seeding does not mutate a saved source draft"
)
assert.equal(
  seedTravelDates(
    { ...draft, flights: { ...flight, departDate: "2027-04-04" } },
    context
  ).flights.departDate,
  "2027-04-04",
  "Keep explicitly chosen flight dates"
)
assert.equal(
  seedTravelDates(draft, { departDate: "2027-04-20", returnDate: "2027-04-01" })
    .flights.departDate,
  ""
)
assert.equal(tripTravelContext({ stops: trip.stops }).departDate, "2027-04-06")
assert.equal(tripTravelContext({ stops: trip.stops }).returnDate, "2027-04-18")
assert.notEqual(
  tripTravelFingerprint(trip),
  tripTravelFingerprint({ ...trip, routeEndpoints: undefined })
)
console.log("My Atlas flight and rental search tests passed.")
