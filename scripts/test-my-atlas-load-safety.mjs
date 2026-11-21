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
const dependencies = {
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
  MyAtlasRegistrationForm: {},
  MyAtlasTutorial: {},
  discardLegacyDeletion,
  window: { sessionStorage },
  getMyAtlasApiAccessToken: async () => "fixture",
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
