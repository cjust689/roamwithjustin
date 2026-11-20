import assert from "node:assert/strict"
import {
  emptyTravelSearchDraft,
  reviewFlightSearch,
  reviewRentalSearch,
  TRAVEL_SEARCH_PROVIDERS,
} from "../src/features/my-atlas/planning/travelSearch.mjs"

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
  "/go/flight/search/roundtrip/2027-04-05/2027-04-20"
)
assert.deepEqual(
  [...roundtrip.searchParams.keys()].sort(),
  ["FromAirport", "NumAdult", "ToAirport", "load"].sort()
)
assert.equal(roundtrip.searchParams.get("FromAirport"), "ATL")
assert.equal(roundtrip.searchParams.get("ToAirport"), "MAD")
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
console.log("My Atlas flight and rental search tests passed.")
