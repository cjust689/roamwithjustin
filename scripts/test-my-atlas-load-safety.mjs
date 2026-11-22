import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import dotenv from "dotenv"
import compiler from "vue-template-compiler"
import { createRequire } from "node:module"
import {
  accountDeletionStorageKey,
  discardLegacyDeletion,
  LEGACY_DELETION_STORAGE_KEY,
} from "../src/features/my-atlas/auth/accountDeletion.mjs"
import { deleteMyAtlasAccountWithRevisionRecovery } from "../src/features/my-atlas/api/client.mjs"
import { myAtlasStopMapPlace } from "../src/features/my-atlas/catalog/mapMemory.mjs"
const require = createRequire(import.meta.url)
const {
  myAtlasLocalRuntime,
  selectMyAtlasRuntime,
} = require("./lib/my-atlas-local-runtime.cjs")
let preparationCalls = 0
const prepareForExplicitMode = () => {
  preparationCalls++
  return null
}
const configuredEnvironment = {
  VUE_APP_MY_ATLAS_API_URL: "https://api.example.com",
  VUE_APP_MY_ATLAS_PLACE_SEARCH_URL: "https://api.example.com/v1/places/search",
}
assert.equal(
  selectMyAtlasRuntime(
    process.cwd(),
    configuredEnvironment,
    ["--my-atlas"],
    prepareForExplicitMode
  ),
  null
)
assert.equal(
  preparationCalls,
  0,
  "normal development must not prepare or switch to an isolated account store"
)
assert.equal(
  configuredEnvironment.VUE_APP_MY_ATLAS_API_URL,
  "https://api.example.com"
)
assert.equal(
  selectMyAtlasRuntime(
    process.cwd(),
    configuredEnvironment,
    ["--my-atlas-local-api"],
    prepareForExplicitMode
  ).environment.VUE_APP_MY_ATLAS_API_URL,
  "http://127.0.0.1:8787"
)
assert.equal(preparationCalls, 1)
const {
  prepareLocalRegistration,
} = require("./lib/my-atlas-local-registration.cjs")
const testRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "rwj-local-registration-")
)
if (!path.resolve(testRoot).startsWith(path.resolve(os.tmpdir()) + path.sep))
  throw Error("Unexpected temporary test root")
try {
  const prepared = prepareLocalRegistration(testRoot)
  const secretFile = path.join(testRoot, "workers/my-atlas/.dev.vars")
  const first = await fs.readFile(secretFile, "utf8")
  const repeated = prepareLocalRegistration(testRoot)
  assert.equal(prepared.inviteCode, repeated.inviteCode)
  assert.equal(
    await fs.readFile(secretFile, "utf8"),
    first,
    "startup must not rotate local secrets or invitations on each run"
  )
  const values = dotenv.parse(first)
  assert.ok(values.INVITE_HASH_PEPPER.length >= 32)
  assert.equal(values.MY_ATLAS_LOCAL_REGISTRATION, "true")
  const configured = myAtlasLocalRuntime(testRoot, {}, prepared)
  assert.equal(
    configured.environment.VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY,
    "1x00000000000000000000AA"
  )
  assert.equal(
    configured.environment.INVITE_HASH_PEPPER,
    undefined,
    "server secrets must not enter the frontend environment"
  )
  await fs.writeFile(secretFile, 'TURNSTILE_SECRET_KEY="owner-real-secret"\n')
  assert.equal(prepareLocalRegistration(testRoot), null)
  assert.equal(
    await fs.readFile(secretFile, "utf8"),
    'TURNSTILE_SECRET_KEY="owner-real-secret"\n'
  )
} finally {
  await fs.rm(testRoot, { recursive: true, force: true })
}

const profile = {
  userId: "usr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  createdAt: "2026-11-20T00:00:00.000Z",
  revision: 1,
}
const local = "http://127.0.0.1:8787",
  remote = "https://api.example.com"
const key = accountDeletionStorageKey(local, profile)
assert.notEqual(key, accountDeletionStorageKey(remote, profile))
assert.notEqual(
  key,
  accountDeletionStorageKey(local, { ...profile, userId: "new-account" })
)
assert.notEqual(
  key,
  accountDeletionStorageKey(local, {
    ...profile,
    createdAt: "2026-11-21T00:00:00.000Z",
  })
)
const runtime = myAtlasLocalRuntime(process.cwd(), {
  VUE_APP_MY_ATLAS_API_URL: remote,
  KEEP: "unchanged",
})
assert.equal(runtime.environment.VUE_APP_MY_ATLAS_API_URL, local)
assert.equal(runtime.environment.KEEP, "unchanged")
assert.ok(
  runtime.persistencePath
    .replaceAll("\\", "/")
    .endsWith("/workers/my-atlas/.wrangler/state")
)
const state = new Map([
  [
    LEGACY_DELETION_STORAGE_KEY,
    JSON.stringify({
      revision: 1,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    }),
  ],
  [
    key,
    JSON.stringify({
      revision: 1,
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    }),
  ],
])
const sessionStorage = {
  getItem: key => state.get(key) || null,
  removeItem: key => state.delete(key),
}
const source = compiler
  .parseComponent(
    await fs.readFile(
      "src/features/my-atlas/views/MyAtlasGeographicProof.vue",
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let reads = 0,
  deletes = 0
let overviewResponse = { profile, trips: [], legacyPlans: [] }
const pin = { pinId: "pin_saved", memory: "Persisted memory" }
const visibilityCalls = []
let visibilityProfile = {
  ...profile,
  public: false,
  discoverable: false,
  revision: 5,
}
let rejectDiscovery = false
const dependencies = {
  formatVisitedDates: () => "",
  formatPlaceTypeLabel: () => "",
  MyAtlasActionFeedback: {},
  MyAtlasMap: {},
  myAtlasStopMapPlace,
  MyAtlasLocationPicker: {},
  MyAtlasPinEditor: {},
  MyAtlasPlanner: {},
  MyAtlasTrips: {},
  MyAtlasJourneyCards: {},
  MyAtlasSwitch: {},
  MyAtlasInfo: {},
  MyAtlasDialog: {},
  MyAtlasMapNavigator: {},
  MyAtlasMapHelp: {},
  MyAtlasRegistrationForm: {},
  MyAtlasTutorial: {},
  discardLegacyDeletion,
  window: { sessionStorage },
  getMyAtlasApiAccessToken: async () => "fixture",
  updateMyAtlasDiscovery: async input => {
    visibilityCalls.push({ kind: "discovery", ...input })
    if (rejectDiscovery) throw Error("Fixture listing failure")
    visibilityProfile = {
      ...visibilityProfile,
      public: input.public,
      discoverable: input.discoverable,
      revision: input.revision + 1,
    }
    return { ...visibilityProfile }
  },
  requestMyAtlasTrips: async () => overviewResponse,
  deleteMyAtlasAccountWithRevisionRecovery: () => {
    deletes++
    throw Error("Account loading must not delete")
  },
  fetchMyAtlasState: async () => {
    reads++
    return { profile, pins: [pin] }
  },
}
const component = new Function(...Object.keys(dependencies), source)(
  ...Object.values(dependencies)
)
const owner = {
  apiBaseUrl: local,
  overviewLoads: 0,
  loadJourneyOverview(token) {
    assert.equal(token, "fixture")
    this.overviewLoads++
  },
  $nextTick: () => {},
  applyAccountState(value) {
    this.state = value
  },
}
await component.methods.loadAccount.call(owner)
assert.equal(reads, 1)
assert.equal(
  owner.overviewLoads,
  1,
  "Account load starts the independent Overview read"
)
assert.equal(owner.accountLoadFailed, false)
assert.equal(deletes, 0)
assert.equal(owner.state.pins[0].memory, "Persisted memory")
assert.equal(state.has(LEGACY_DELETION_STORAGE_KEY), false)
assert.equal(
  state.has(key),
  true,
  "scoped retries are retained but must not run on load"
)
await component.methods.loadAccount.call(owner)
assert.equal(reads, 2)
assert.equal(deletes, 0)
const overview = {
  canUseAtlas: true,
  apiBaseUrl: local,
  accountProfile: profile,
  journeyRevision: 0,
  journeyRequest: 0,
  overviewTrips: [],
  overviewLegacyPlans: [],
}
overview.handleJourneyCollection =
  component.methods.handleJourneyCollection.bind(overview)
await component.methods.loadJourneyOverview.call(overview, "fixture")
assert.equal(overview.journeyRevision, 1)
assert.equal(overview.journeysError, false)
let resolveOverview
overviewResponse = new Promise(resolve => {
  resolveOverview = resolve
})
const oldRead = component.methods.loadJourneyOverview.call(overview, "fixture")
overview.accountProfile = { ...profile, userId: "different-owner" }
resolveOverview({
  profile,
  trips: [{ title: "Private old-owner trip" }],
  legacyPlans: [],
})
await oldRead
assert.deepEqual(
  overview.overviewTrips,
  [],
  "A stale account response cannot expose another owner's trips"
)
overview.accountProfile = { ...profile, revision: 3 }
overviewResponse = {
  profile: { ...profile, revision: 2 },
  trips: [{ title: "Stale trip" }],
}
await component.methods.loadJourneyOverview.call(overview, "fixture")
assert.deepEqual(
  overview.overviewTrips,
  [],
  "Older collection revisions cannot replace current Overview state"
)
let requests = 0
await assert.rejects(
  deleteMyAtlasAccountWithRevisionRecovery({
    apiBaseUrl: remote,
    accessToken: "fixture",
    accountId: profile.userId,
    revision: 1,
    fetchImpl: async (_url, options) => {
      requests++
      if (options.method === "DELETE")
        return Response.json({ error: "revision_conflict" }, { status: 412 })
      return Response.json(
        {
          profile: {
            ...profile,
            userId: "usr_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            handle: "new-owner",
            displayName: "New Owner",
            public: false,
            discoverable: false,
          },
        },
        { headers: { ETag: '"rev-1"' } }
      )
    },
  }),
  { code: "account_changed" }
)
assert.equal(
  requests,
  2,
  "account generation changes must prevent a second DELETE"
)
console.log(
  "Account load/reload never deletes, retry scoping, account-generation guard and local startup isolation tests passed."
)

const registrationSource = compiler
  .parseComponent(
    await fs.readFile(
      "src/features/my-atlas/components/MyAtlasRegistrationForm.vue",
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
const registration = new Function(registrationSource)()
const form = {
  ...registration.data.call({
    localDevelopment: false,
    initialDisplayName: "Justin",
  }),
  pending: false,
}
for (const [name, getter] of Object.entries(registration.computed))
  Object.defineProperty(form, name, { get: () => getter.call(form) })
assert.equal(form.canSubmit, false)
assert.ok(form.unmetRequirements.some(text => text.includes("invitation")))
assert.ok(form.unmetRequirements.some(text => text.includes("handle")))
form.inviteCode = "owner-invitation"
form.handle = "Justin-Travels"
form.acceptTerms = true
form.acceptPrivacy = true
form.turnstileToken = "test-token"
assert.equal(
  form.canSubmit,
  true,
  "A real prefilled display name and a valid handle can submit once all requirements are met"
)
form.turnstileToken = ""
assert.equal(form.canSubmit, false)
form.turnstileToken = "test-token"
form.handle = "a"
assert.equal(form.canSubmit, false)
form.handle = "valid-handle"
form.displayName = " "
assert.equal(form.canSubmit, false)
console.log(
  "Registration readiness validates handle/name, consent and verification instead of accepting placeholder text."
)

const tripStops = [
  {
    stopId: "first",
    place: { placeId: "same", name: "Repeated place", coordinates: [1, 2] },
  },
  {
    stopId: "missing",
    place: { placeId: "missing", name: "No coordinates", coordinates: null },
  },
  {
    stopId: "second",
    place: { placeId: "same", name: "Repeated place", coordinates: [1, 2] },
  },
]
const navigation = {
  overviewTrips: [
    {
      tripId: "trip-one",
      title: "Repeated visit trip",
      lifecycle: "past",
      workflow: "saved",
      stops: tripStops,
    },
  ],
  overviewLegacyPlans: [],
  displayedPlaces: [],
  mapNavigatorOpen: false,
  mapNavigatorTripId: "",
  mapNavigatorStopIndex: 0,
  sidebarExpanded: true,
  $refs: { trips: { selectedId: "trip-one" } },
  pauseTimeline() {},
  toggleSidebar() {
    this.sidebarExpanded = false
  },
}
for (const name of [
  "mapNavigationTrips",
  "mapNavigatorTrip",
  "mapNavigatorLocation",
  "mapNavigatorRoute",
])
  Object.defineProperty(navigation, name, {
    get: () => component.computed[name].call(navigation),
  })
for (const name of [
  "openMapNavigator",
  "chooseMapTrip",
  "stepMapTrip",
  "closeMapNavigator",
])
  navigation[name] = component.methods[name].bind(navigation)
const tripSnapshot = JSON.stringify(navigation.overviewTrips)
const mapContext = {
  canUseAtlas: false,
  mapNavigatorTrip: { stops: [{ place: { placeId: "trip-stop" } }] },
}
assert.deepEqual(
  component.computed.mapVisiblePlaces.call(mapContext),
  [],
  "signed-out maps cannot expose owner trip places"
)
mapContext.canUseAtlas = true
assert.equal(
  component.computed.mapVisiblePlaces.call(mapContext)[0].placeId,
  "trip-stop"
)
mapContext.mapNavigatorTrip = null
mapContext.tripMapActive = true
mapContext.tripView = {
  route: [{ location: { placeId: "occurrence", memory: "Occurrence memory" } }],
}
assert.equal(
  component.computed.mapVisiblePlaces.call(mapContext)[0].memory,
  "Occurrence memory"
)
mapContext.tripMapActive = false
mapContext.plannerMapActive = true
mapContext.plannerRoute = [{ location: { placeId: "planned-only" } }]
assert.deepEqual(
  component.computed.mapVisiblePlaces.call(mapContext),
  [{ placeId: "planned-only" }],
  "planner scope does not include visited pins"
)
navigation.openMapNavigator()
assert.equal(navigation.mapNavigatorTripId, "trip-one")
assert.equal(navigation.sidebarExpanded, false)
assert.deepEqual(
  navigation.mapNavigatorRoute.map(node => node.label),
  ["1", "3"],
  "Missing coordinates must not renumber actual stops"
)
navigation.stepMapTrip(1)
assert.equal(navigation.mapNavigatorLocation.placeId, "missing")
navigation.stepMapTrip(1)
assert.equal(navigation.mapNavigatorLocation.placeId, "same")
assert.equal(
  navigation.mapNavigatorStopIndex,
  2,
  "Repeated visits remain distinct"
)
navigation.stepMapTrip(1)
assert.equal(navigation.mapNavigatorStopIndex, 2)
navigation.closeMapNavigator()
assert.equal(navigation.mapNavigatorTrip, null)
assert.equal(
  JSON.stringify(navigation.overviewTrips),
  tripSnapshot,
  "Navigation cannot mutate stored trip data"
)
console.log(
  "Trip navigation preserves repeated visits, stop numbering and saved data."
)

const visibility = {
  canUseAtlas: true,
  accountPending: false,
  discoveryPending: false,
  hasPublicAtlasContent: true,
  apiBaseUrl: "https://fixture.example",
  accountProfile: { ...visibilityProfile },
  async withAccountRevisionRetry(token, operation) {
    assert.equal(token, "fixture")
    return operation(this.accountProfile.revision)
  },
}
await component.methods.setProfileListing.call(visibility, false)
assert.equal(
  visibilityCalls.length,
  0,
  "An unchanged private profile needs no write"
)
visibility.hasPublicAtlasContent = false
await component.methods.setProfileListing.call(visibility, true)
assert.equal(visibilityCalls.length, 0, "Empty profiles cannot be listed")
visibility.hasPublicAtlasContent = true
const listing = component.methods.setProfileListing.call(visibility, true)
assert.equal(visibility.accountPending, true)
assert.equal(visibility.discoveryPending, true)
await component.methods.setProfileListing.call(visibility, true)
await listing
assert.equal(
  visibilityCalls.length,
  1,
  "Repeated clicks cannot duplicate the request"
)
assert.equal(visibilityCalls[0].public, true)
assert.equal(
  visibilityCalls[0].discoverable,
  true,
  "One request publishes and lists together"
)
assert.equal(visibility.accountProfile.public, true)
assert.equal(visibility.accountProfile.discoverable, true)
await component.methods.setProfileListing.call(visibility, false)
assert.equal(visibilityCalls[1].public, false)
assert.equal(visibilityCalls[1].discoverable, false)
assert.equal(visibility.accountProfile.public, false)
assert.equal(visibility.accountProfile.discoverable, false)
visibilityProfile = { ...visibilityProfile, public: true, discoverable: false }
visibility.accountProfile = { ...visibilityProfile }
await component.methods.setProfileListing.call(visibility, false)
assert.equal(
  visibility.accountProfile.public,
  false,
  "Legacy unlisted profiles can be made private without listing first"
)
assert.equal(visibilityCalls.at(-1).discoverable, false)
rejectDiscovery = true
await component.methods.setProfileListing.call(visibility, true)
assert.equal(visibility.accountPending, false)
assert.equal(visibility.discoveryPending, false)
assert.equal(visibility.accountProfile.public, false)
assert.equal(
  visibility.accountProfile.discoverable,
  false,
  "Failed requests preserve both settings"
)
assert.ok(visibility.accountError)
visibility.canUseAtlas = false
const beforeSignedOut = visibilityCalls.length
await component.methods.setProfileListing.call(visibility, true)
await component.methods.setProfileListing.call(visibility, false)
assert.equal(visibilityCalls.length, beforeSignedOut)
console.log(
  "Explore listing changes profile publication atomically with guarded, revisioned requests."
)
