import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  normalizeInstagramHandle,
  instagramProfileUrl,
} from "../shared/my-atlas-instagram.mjs"
import { normalizeProfilePatch } from "../workers/my-atlas/src/account/contracts.mjs"
import {
  updateMyAtlasInstagram,
  updateMyAtlasDiscovery,
} from "../src/features/my-atlas/api/client.mjs"
import {
  directoryImageVersion,
  mergeDirectoryCards,
  readDirectoryWindow,
} from "../src/features/my-atlas/discovery/directory.mjs"
import {
  atlasTimelineSequence,
  atlasStats,
  atlasYears,
  formatVisitedDates,
  placesForYear,
  placesThroughTimelineStep,
} from "../src/features/my-atlas/catalog/atlasInsights.mjs"

assert.equal(normalizeInstagramHandle(" @My.Travel_1 "), "my.travel_1")
assert.equal(normalizeInstagramHandle(" "), "")
for (const value of [
  null,
  12,
  "@",
  "@@user",
  "https://instagram.com/user",
  "user/x",
  "user?x=1",
  "a..b",
  ".user",
  "user.",
  "a".repeat(31),
  "user name",
  "<script>",
])
  assert.equal(normalizeInstagramHandle(value), null)
assert.equal(
  instagramProfileUrl("my.travel_1"),
  "https://www.instagram.com/my.travel_1/"
)
assert.equal(instagramProfileUrl("https://evil.example"), "")
const headers = new Headers({
  "If-Match": '"rev-1"',
  "Idempotency-Key": "33333333-3333-4333-8333-333333333333",
})
assert.deepEqual(
  normalizeProfilePatch({ instagramHandle: "@My.Travel" }, headers).patch,
  { instagramHandle: "my.travel" }
)
assert.deepEqual(
  normalizeProfilePatch({ instagramHandle: "" }, headers).patch,
  { instagramHandle: "" }
)
assert.throws(() =>
  normalizeProfilePatch({ instagramHandle: "javascript:alert(1)" }, headers)
)
let requests = 0
for (const listed of [true, false]) {
  let calls = 0
  const result = await updateMyAtlasDiscovery({
    apiBaseUrl: "https://api.example",
    accessToken: "fixture",
    public: listed,
    discoverable: listed,
    revision: 7,
    fetchImpl: async (_url, options) => {
      calls++
      assert.deepEqual(JSON.parse(options.body), {
        public: listed,
        discoverable: listed,
      })
      assert.equal(options.headers.get("If-Match"), '"rev-7"')
      assert.ok(options.headers.get("Idempotency-Key"))
      return Response.json(
        {
          profile: {
            handle: "atlas-owner",
            public: listed,
            discoverable: listed,
          },
        },
        { headers: { ETag: '"rev-8"' } }
      )
    },
  })
  assert.equal(
    calls,
    1,
    "Profile and directory visibility use one atomic request"
  )
  assert.equal(result.public, listed)
  assert.equal(result.discoverable, listed)
  assert.equal(result.revision, 8)
}
await assert.rejects(
  updateMyAtlasDiscovery({
    apiBaseUrl: "https://api.example",
    accessToken: "fixture",
    public: true,
    discoverable: true,
    revision: 7,
    fetchImpl: async () =>
      Response.json(
        {
          profile: { handle: "atlas-owner", public: false, discoverable: true },
        },
        { headers: { ETag: '"rev-8"' } }
      ),
  }),
  error => error.code === "invalid_response"
)
const profile = await updateMyAtlasInstagram({
  apiBaseUrl: "https://api.example",
  accessToken: "fixture",
  instagramHandle: "@My.Travel",
  revision: 1,
  fetchImpl: async (_url, options) => {
    requests++
    assert.equal(options.method, "PATCH")
    assert.deepEqual(JSON.parse(options.body), { instagramHandle: "my.travel" })
    assert.equal(options.headers.get("If-Match"), '"rev-1"')
    assert.ok(options.headers.get("Idempotency-Key"))
    return Response.json(
      {
        profile: {
          handle: "atlas-owner",
          instagramHandle: "my.travel",
          public: false,
          discoverable: false,
        },
      },
      { headers: { ETag: '"rev-2"' } }
    )
  },
})
assert.equal(profile.instagramHandle, "my.travel")
assert.equal(profile.revision, 2)
await assert.rejects(() =>
  updateMyAtlasInstagram({
    apiBaseUrl: "https://api.example",
    accessToken: "fixture",
    instagramHandle: "https://evil.example",
    revision: 2,
    fetchImpl: () => {
      requests++
      throw Error("Unexpected")
    },
  })
)
assert.equal(requests, 1)

const ownerSource = compiler
  .parseComponent(
    await fs.readFile(
      new URL(
        "../src/features/my-atlas/views/MyAtlasGeographicProof.vue",
        import.meta.url
      ),
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let fail = false
const ownerDependencies = {
  formatVisitedDates: () => "",
  formatPlaceTypeLabel: () => "",
  MyAtlasActionFeedback: {},
  MyAtlasMap: {},
  MyAtlasLocationPicker: {},
  MyAtlasPinEditor: {},
  MyAtlasPlanner: {},
  MyAtlasTrips: {},
  MyAtlasJourneyCards: {},
  MyAtlasSwitch: {},
  MyAtlasInfo: {},
  MyAtlasMapNavigator: {},
  MyAtlasMapHelp: {},
  MyAtlasRegistrationForm: {},
  MyAtlasTutorial: {},
  normalizeInstagramHandle,
  instagramProfileUrl,
  getMyAtlasApiAccessToken: async () => "fixture-token",
  updateMyAtlasInstagram: options =>
    updateMyAtlasInstagram({
      ...options,
      fetchImpl: async (_url, request) => {
        if (fail)
          return Response.json({ error: "invalid_request" }, { status: 400 })
        const value = JSON.parse(request.body)
        return Response.json(
          {
            profile: {
              handle: "atlas-owner",
              public: false,
              discoverable: false,
              instagramHandle: value.instagramHandle,
            },
          },
          { headers: { ETag: '"rev-3"' } }
        )
      },
    }),
}
const ownerComponent = new Function(
  ...Object.keys(ownerDependencies),
  ownerSource
)(...Object.values(ownerDependencies))
const owner = {
  accountProfile: { handle: "atlas-owner", public: false, revision: 2 },
  instagramDraft: "@New.Owner",
  instagramError: "",
  accountPending: false,
  apiBaseUrl: "https://api.example",
  withAccountRevisionRetry: (_token, action) => action(2),
  showActionFeedback: value => {
    owner.feedback = value
  },
}
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(owner.accountProfile.instagramHandle, "new.owner")
assert.equal(
  owner.accountProfile.public,
  false,
  "saving Instagram must not publish an Atlas"
)
assert.equal(owner.instagramDraft, "new.owner")
assert.equal(owner.accountPending, false)
owner.instagramDraft = ""
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(owner.accountProfile.instagramHandle, "")
owner.instagramDraft = "another.owner"
fail = true
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(
  owner.instagramDraft,
  "another.owner",
  "failed save retains the desired input"
)
assert.equal(owner.feedback.tone, "error")
assert.equal(owner.accountPending, false)

const original = { handle: "first", favoriteImage: null }
const revised = {
  handle: "first",
  favoriteImage: { imageId: "image_new", updatedAt: "new" },
}
assert.deepEqual(
  mergeDirectoryCards([original], [revised, { handle: "second" }]),
  [revised, { handle: "second" }]
)
assert.notEqual(directoryImageVersion(original), directoryImageVersion(revised))
assert.notEqual(
  directoryImageVersion(revised),
  directoryImageVersion({
    ...revised,
    favoriteImage: { ...revised.favoriteImage, updatedAt: "later" },
  })
)
const cursors = []
const refreshed = await readDirectoryWindow(async cursor => {
  cursors.push(cursor)
  return cursor
    ? {
        atlases: Array.from({ length: 12 }, (_, i) => ({
          handle: `next-${i}`,
        })),
        nextCursor: "more",
      }
    : {
        atlases: Array.from({ length: 12 }, (_, i) =>
          i ? { handle: `first-${i}` } : revised
        ),
        nextCursor: "second",
      }
}, 24)
assert.deepEqual(cursors, ["", "second"])
assert.equal(refreshed.atlases.length, 24)
assert.equal(refreshed.atlases[0].favoriteImage.imageId, "image_new")
assert.equal(refreshed.nextCursor, "more")
const removed = await readDirectoryWindow(
  async () => ({ atlases: [], nextCursor: null }),
  24
)
assert.deepEqual(
  removed.atlases,
  [],
  "fresh snapshot removes profiles no longer listed"
)
await assert.rejects(
  () =>
    readDirectoryWindow(async () => ({ atlases: [], nextCursor: "loop" }), 24),
  /Repeated/
)

// Exercise grouped public browsing through the real component state, including
// repeated stops and switching back to independent destinations.
const publicSource = compiler
  .parseComponent(
    await fs.readFile(
      new URL(
        "../src/features/my-atlas/views/MyAtlasPublicView.vue",
        import.meta.url
      ),
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
const publicDependencies = {
  MyAtlasMap: {},
  MyAtlasMapNavigator: {},
  MyAtlasMapHelp: {},
  MyAtlasInfo: {},
  formatVisitedDates,
  atlasTimelineSequence,
  atlasStats,
  atlasYears,
  placesForYear,
  placesThroughTimelineStep,
  instagramProfileUrl,
  placeCatalog: { records: [] },
  window: { clearTimeout() {} },
}
const publicComponent = new Function(
  ...Object.keys(publicDependencies),
  publicSource
)(...Object.values(publicDependencies))
const publicView = publicComponent.data()
for (const [key, method] of Object.entries(publicComponent.methods))
  publicView[key] = method.bind(publicView)
for (const [key, computed] of Object.entries(publicComponent.computed))
  Object.defineProperty(publicView, key, {
    get: () => computed.call(publicView),
  })
publicView.toggleOverview = () => {
  publicView.overviewExpanded = !publicView.overviewExpanded
}
const publicPlaces = ["a", "b", "independent"].map((name, index) => ({
  placeId: `custom:${name}`,
  name,
  coordinates: [index, 10],
  visitedDates: [{ year: 2025 }],
  visitedYears: [2025],
}))
const sharedTrips = [
  {
    id: "public-trip-1",
    title: "A return trip",
    kind: "trip",
    lifecycle: "past",
    stops: [publicPlaces[0], publicPlaces[1], publicPlaces[0]].map(place => ({
      place,
    })),
  },
  {
    id: "public-trip-2",
    title: "A single stop",
    kind: "trip",
    lifecycle: "past",
    stops: [{ place: publicPlaces[1] }],
  },
  {
    id: "public-planned-trip-1",
    title: "A planned journey",
    kind: "trip",
    lifecycle: "planned",
    stops: [
      {
        place: {
          placeId: "planned-only",
          name: "Future stop",
          coordinates: [20, 20],
          visitedDates: [],
          visitedYears: [],
        },
      },
    ],
  },
]
publicView.atlas = { places: publicPlaces, trips: sharedTrips }
const unchangedPublicAtlas = JSON.stringify(publicView.atlas)
assert.equal(publicView.browsingTrips, true)
assert.equal(publicView.effectiveBrowseMode, "past")
assert.equal(publicView.selectedPublicTrip.id, "public-trip-1")
assert.deepEqual(
  publicView.displayedPlaces.map(place => place.name),
  ["a", "b"]
)
assert.deepEqual(
  publicView.navigatorRoute.map(node => node.location.name),
  ["a", "b", "a"]
)
assert.equal(
  publicView.visibleStats.places,
  2,
  "repeat stops do not inflate unique place statistics"
)
publicView.selectTripStop(2)
assert.equal(publicView.navigatorIndex, 2)
assert.equal(publicView.navigatorLocation.name, "a")
publicView.selectPlace(publicPlaces[0].placeId)
assert.equal(
  publicView.navigatorIndex,
  2,
  "clicking the current repeat must preserve its occurrence"
)
publicView.stepTrip(1)
assert.equal(publicView.navigatorIndex, 2)
publicView.closeNavigator()
assert.equal(publicView.selectedPublicTrip.id, "public-trip-1")
assert.equal(
  publicView.navigatorIndex,
  2,
  "closing map controls preserves the selected trip and stop"
)
publicView.openNavigator()
assert.equal(publicView.overviewExpanded, false)
assert.equal(publicView.navigatorIndex, 2)
publicView.chooseTrip("public-trip-2")
assert.equal(publicView.selectedPlace.name, "b")
assert.equal(publicView.navigatorIndex, 0)
publicView.stepTrip(-1)
assert.equal(publicView.navigatorIndex, 0)
publicView.setBrowseMode("destinations")
assert.equal(publicView.selectedPublicTrip, null)
assert.equal(
  publicView.displayedPlaces.length,
  3,
  "independent places remain available"
)
publicView.openNavigator()
assert.equal(publicView.navigatorTrip.kind, "atlas")
assert.equal(publicView.navigatorTrip.stops.length, 3)
publicView.setBrowseMode("planned")
assert.equal(publicView.visibleTrips.length, 1)
assert.equal(publicView.selectedPublicTrip.lifecycle, "planned")
assert.deepEqual(
  publicView.displayedPlaces.map(place => place.name),
  ["Future stop"]
)
assert.equal(
  publicView.stats.places,
  3,
  "planned stops do not count as visited destinations"
)
assert.equal(
  publicComponent.methods.exportStory,
  undefined,
  "public profiles cannot create another owner's Story download"
)
assert.equal(
  typeof ownerComponent.methods.exportStory,
  "function",
  "owners retain Story export"
)
publicView.setBrowseMode("destinations")
assert.ok(
  publicView.displayedPlaces.every(place => place.name !== "Future stop")
)
publicView.chooseTrip("public-trip-1")
assert.equal(publicView.browsingTrips, true)
assert.equal(publicView.selectedPublicTrip.lifecycle, "past")
assert.equal(
  JSON.stringify(publicView.atlas),
  unchangedPublicAtlas,
  "public browsing never edits trip data"
)
publicView.atlas = { places: publicPlaces }
publicView.browseMode = ""
publicComponent.watch.navigationTrips.call(
  publicView,
  publicView.navigationTrips
)
assert.equal(
  publicView.browsingTrips,
  false,
  "older responses without trips keep destination browsing"
)
assert.equal(publicView.displayedPlaces.length, 3)
assert.equal(publicView.navigatorIndex, 0)
publicView.atlas = { places: [], trips: [sharedTrips[2]] }
assert.equal(
  publicView.effectiveBrowseMode,
  "planned",
  "planned-only profiles default to their public plans"
)
publicView.setBrowseMode("past")
assert.equal(publicView.selectedPublicTrip, null)
assert.deepEqual(
  publicView.displayedPlaces,
  [],
  "an empty Past view cannot show planned pins"
)
publicView.setBrowseMode("destinations")
assert.deepEqual(
  publicView.displayedPlaces,
  [],
  "a planned-only profile has no visited destinations"
)
console.log(
  "Instagram links, revisioned writes, directory refresh and grouped public trip browsing tests passed."
)
