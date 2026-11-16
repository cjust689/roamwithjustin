import assert from "node:assert/strict"
import {
  buildPlaceSuggestionReport,
  formatPlaceSuggestionCsv,
} from "./lib/editorial-place-suggestions.mjs"

const journeys = [
  {
    id: "europe-2026",
    title: "Europe (2026)",
    visits: [
      { id: "visit-split", placeId: "split" },
      { id: "visit-krka", placeId: "krka" },
      { id: "visit-madrid", placeId: "madrid" },
      { id: "visit-gibraltar", placeId: "gibraltar" },
    ],
  },
  {
    id: "utah-2026",
    title: "Utah (2026)",
    visits: [
      { id: "visit-zion", placeId: "zion" },
      { id: "visit-park-city", placeId: "park-city" },
    ],
  },
]
const places = [
  {
    id: "europe",
    name: "Europe",
    parentPlaceId: null,
    category: "continent",
  },
  {
    id: "split",
    name: "Split",
    parentPlaceId: "europe",
    countryCode: "HR",
    category: "city",
    evidenceStatus: "confirmed",
    coordinates: [16.4, 43.5],
  },
  {
    id: "krka",
    name: "Krka National Park",
    parentPlaceId: "europe",
    countryCode: "HR",
    category: "national-park",
    evidenceStatus: "confirmed",
    coordinates: [16, 43.9],
  },
  {
    id: "madrid",
    name: "Madrid",
    parentPlaceId: "europe",
    countryCode: "ES",
    category: "city",
    evidenceStatus: "confirmed",
    coordinates: [-3.7, 40.4],
  },
  {
    id: "gibraltar",
    name: "Gibraltar",
    parentPlaceId: "europe",
    countryCode: "GI",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinates: [-5.3, 36.1],
  },
  {
    id: "utah",
    name: "Utah",
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-UT",
    category: "region",
  },
  {
    id: "zion",
    name: "Zion National Park",
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "national-park",
    evidenceStatus: "confirmed",
    coordinates: [-112.9, 37.3],
  },
  {
    id: "park-city",
    name: "Park City",
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "city",
    evidenceStatus: "confirmed",
    coordinates: [-111.5, 40.6],
  },
]
const rows = [
  {
    Location: "Croatia",
    "Series/Post": "Waterfalls at Krka National Park",
    Caption: "A waterfall day",
  },
  {
    Location: "Utah 26",
    "Series/Post": "Winter trip",
    Caption: "No specific stop named yet",
  },
  { Location: "Madrid", Caption: "Madrid on foot" },
  { Location: "Spain", "Series/Post": "Gibraltar", Caption: "Quick stop" },
]
const baselinePlan = {
  eligibleRows: [
    {
      diagnosticRow: 2,
      postId: "post-croatia",
      sourceHash: "hash-croatia",
      currentJourneyId: "europe-2026",
      currentPlaceId: null,
      place: { input: "Croatia", status: "unmatched", matches: [] },
    },
    {
      diagnosticRow: 3,
      postId: "post-utah",
      sourceHash: "hash-utah",
      currentJourneyId: "utah-2026",
      currentPlaceId: null,
      place: { input: "Utah 26", status: "unmatched", matches: [] },
    },
    {
      diagnosticRow: 4,
      postId: "post-madrid",
      sourceHash: "hash-madrid",
      currentJourneyId: "europe-2026",
      currentPlaceId: "madrid",
      place: {
        input: "Madrid",
        status: "matched",
        matches: [{ id: "madrid" }],
      },
    },
    {
      diagnosticRow: 5,
      postId: "post-gibraltar",
      sourceHash: "hash-gibraltar",
      currentJourneyId: "europe-2026",
      currentPlaceId: null,
      place: { input: "Spain", status: "unmatched", matches: [] },
    },
  ],
}

const report = buildPlaceSuggestionReport({
  rows,
  baselinePlan,
  journeys,
  places,
})
assert.deepEqual(report.summary, {
  eligibleRows: 4,
  alreadyBound: 1,
  unresolvedRows: 3,
  groups: 3,
  strongTextSuggestions: 2,
  reviewRequiredRows: 3,
  rowsWithoutCandidates: 0,
})
assert.match(report.reportHash, /^[a-f0-9]{64}$/)

const croatia = report.rows.find(row => row.postId === "post-croatia")
assert.equal(croatia.candidateBasis, "journey-and-geography")
assert.equal(croatia.suggestionStatus, "strong-text-suggestion")
assert.deepEqual(
  croatia.candidates.map(candidate => candidate.placeId),
  ["krka", "split"]
)
assert.deepEqual(croatia.candidates[0].matchedTerms, ["Krka National Park"])
assert.equal(croatia.safeToWrite, false)
assert.equal(croatia.postLabel, "Waterfalls at Krka National Park")

const utah = report.rows.find(row => row.postId === "post-utah")
assert.equal(utah.candidateBasis, "journey-and-geography")
assert.equal(utah.suggestionStatus, "multiple-candidates")
assert.deepEqual(
  utah.candidates.map(candidate => candidate.placeId),
  ["zion", "park-city"]
)

const gibraltar = report.rows.find(row => row.postId === "post-gibraltar")
assert.equal(gibraltar.candidateBasis, "journey-geography-and-explicit-name")
assert.equal(gibraltar.suggestionStatus, "strong-text-suggestion")
assert.equal(gibraltar.candidates[0].placeId, "gibraltar")

const csv = formatPlaceSuggestionCsv(report)
assert.match(csv, /^sheet_row,post_id,series_post,/)
assert.match(csv, /post-croatia,Waterfalls at Krka National Park/)
assert.match(csv, /Krka National Park \| Split,false/)

assert.throws(
  () =>
    buildPlaceSuggestionReport({
      rows: [rows[0]],
      baselinePlan: {
        eligibleRows: [
          {
            ...baselinePlan.eligibleRows[0],
            currentJourneyId: null,
          },
        ],
      },
      journeys,
      places,
    }),
  /has no canonical Journey binding/
)

console.log("Editorial read-only Place suggestion tests passed.")
