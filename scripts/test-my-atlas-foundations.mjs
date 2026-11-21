import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import compiler from "vue-template-compiler"
import {
  normalizeExperienceChange,
  normalizeExperienceWebsite,
  applyExperienceChange,
  validStoredExperiences,
  MAX_VISIT_EXPERIENCES,
} from "../shared/my-atlas-experiences.mjs"
import { normalizePatchPin } from "../workers/my-atlas/src/account/contracts.mjs"
import { updateMyAtlasPin } from "../src/features/my-atlas/api/client.mjs"
import {
  extractExpediaTable,
  extractExpediaSheetGrid,
  compileExpediaLinks,
  EXPEDIA_LINK_HEADERS,
} from "./lib/expedia-destination-links.mjs"
import {
  resolveExpediaFlightLink,
  isApprovedExpediaUrl,
} from "../src/services/expediaDestinationLinks.mjs"
import {
  normalizeDiscoveryRequest,
  searchViator,
} from "../workers/experience-discovery/src/viator.mjs"
import { handleDiscoveryRequest } from "../workers/experience-discovery/src/index.mjs"

const id = "exp_" + "a".repeat(32),
  now = "2026-11-20T19:00:00.000Z"
const activity = {
  action: "add",
  id,
  title: " Boat excursion ",
  operatorName: "",
  operatorWebsite: "",
}
assert.equal(normalizeExperienceChange(activity).title, "Boat excursion")
for (const title of ["", "a".repeat(121), "<script>", "a\u200bb", "\ud800"])
  assert.equal(normalizeExperienceChange({ ...activity, title }), null)
for (const value of [
  "javascript:alert(1)",
  "https://user:pass@example.com",
  "https://127.0.0.1/",
  "https://[::1]/",
  "https://test.local/",
  "https://a.example\\evil",
  "http://example.com",
])
  assert.equal(normalizeExperienceWebsite(value), null)
assert.equal(
  normalizeExperienceWebsite(" https://operator.example.com/?a=1&b=2 "),
  "https://operator.example.com/?a=1&b=2"
)
let entries = applyExperienceChange(undefined, activity, now).experiences
assert.equal(validStoredExperiences(entries), true)
assert.equal(
  applyExperienceChange(entries, activity, now).error,
  "duplicate_experience"
)
entries = applyExperienceChange(
  entries,
  { ...activity, action: "edit", title: "Snorkeling" },
  now
).experiences
assert.equal(entries[0].createdAt, now)
assert.equal(
  applyExperienceChange(entries, { action: "remove", id }, now).experiences
    .length,
  0
)
assert.equal(
  applyExperienceChange(
    entries,
    { action: "remove", id: "exp_" + "b".repeat(32) },
    now
  ).error,
  "experience_not_found"
)
const full = Array.from({ length: MAX_VISIT_EXPERIENCES }, (_, index) => ({
  ...entries[0],
  id: "exp_" + index.toString(16).padStart(32, "0"),
}))
assert.equal(
  applyExperienceChange(full, activity, now).error,
  "experience_limit"
)
const headers = new Headers({
  "If-Match": '"rev-2"',
  "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
})
assert.equal(
  normalizePatchPin(
    { experienceChange: activity },
    "pin_" + "1".repeat(24),
    headers,
    2026
  ).patch.experienceChange.title,
  "Boat excursion"
)
assert.throws(() =>
  normalizePatchPin(
    { experienceChange: { ...activity, visibility: "public" } },
    "pin_" + "1".repeat(24),
    headers,
    2026
  )
)
let options
await updateMyAtlasPin({
  apiBaseUrl: "https://api.example.com",
  accessToken: "fixture",
  pinId: "pin_" + "1".repeat(24),
  experienceChange: activity,
  revision: 2,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  fetchImpl: async (_url, request) => {
    options = request
    return Response.json(
      {
        pin: {
          pinId: "pin_" + "1".repeat(24),
          placeId: "geonames:1",
          memory: "Keep memory",
          visitedDates: [],
          experiences: applyExperienceChange(undefined, activity, now)
            .experiences,
        },
      },
      { headers: { ETag: '"rev-3"' } }
    )
  },
})
assert.deepEqual(Object.keys(JSON.parse(options.body)), ["experienceChange"])
assert.equal(
  options.headers.get("Idempotency-Key"),
  "11111111-1111-4111-8111-111111111111"
)

const ownerSource = compiler
  .parseComponent(
    await fs.readFile(
      "src/features/my-atlas/views/MyAtlasGeographicProof.vue",
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let failure = "unavailable",
  attempts = []
const pin = {
  pinId: "pin_" + "1".repeat(24),
  memory: "Keep memory",
  experiences: [],
}
const dependencies = {
  formatVisitedDates: () => "",
  formatPlaceTypeLabel: () => "",
  MyAtlasActionFeedback: {},
  MyAtlasMap: {},
  MyAtlasLocationPicker: {},
  MyAtlasPinEditor: {},
  MyAtlasPlanner: {},
  MyAtlasTrips: {},
  MyAtlasRegistrationForm: {},
  MyAtlasTutorial: {},
  getMyAtlasApiAccessToken: async () => "fixture",
  updateMyAtlasPin: async request => {
    attempts.push(request)
    if (failure) throw Object.assign(Error("fixture"), { code: failure })
    return {
      pin: {
        ...pin,
        ...(request.customPlace
          ? {
              name: request.customPlace.name,
              coordinates: request.customPlace.coordinates,
            }
          : {}),
        experiences: applyExperienceChange(undefined, activity, now)
          .experiences,
      },
      revision: 3,
    }
  },
}
const ownerComponent = new Function(...Object.keys(dependencies), ownerSource)(
  ...Object.values(dependencies)
)
const owner = {
  pinEditorPin: pin,
  canUseAtlas: true,
  pins: [pin],
  accountProfile: { revision: 2 },
  accountPending: false,
  experiencePending: false,
  experienceSavedSequence: 0,
  experienceAttempt: null,
  updatePlanningRevision(value) {
    this.accountProfile.revision = value
  },
  showActionFeedback(value) {
    this.feedback = value
  },
  async refreshAccountState() {
    this.accountProfile.revision = 4
  },
}
await ownerComponent.methods.saveVisitExperience.call(owner, activity)
assert.equal(owner.experienceSavedSequence, 0)
assert.equal(owner.feedback.tone, "error")
failure = ""
await ownerComponent.methods.saveVisitExperience.call(owner, activity)
assert.equal(attempts[0].idempotencyKey, attempts[1].idempotencyKey)
assert.equal(attempts[0].revision, attempts[1].revision)
assert.equal(owner.pins[0].memory, "Keep memory")
assert.equal(owner.experienceSavedSequence, 1)
assert.equal(owner.accountPending, false)
failure = "revision_conflict"
await ownerComponent.methods.saveVisitExperience.call(owner, {
  ...activity,
  action: "edit",
  title: "Changed",
})
assert.equal(owner.experienceAttempt, null)
assert.equal(
  owner.experienceSavedSequence,
  1,
  "conflicts must not clear the edit form"
)
assert.equal(owner.accountProfile.revision, 4)

owner.$set = (object, key, value) => {
  object[key] = value
}
owner.loadedPlaces = {}
owner.pinEditorError = ""
owner.closePinEditor = () => {
  owner.locationAttempt = null
}
owner.withAccountRevisionRetry = () => {
  throw Error("Custom location must not auto-overwrite a revision conflict")
}
const customPlace = { name: "Corrected location", coordinates: [16.45, 43.52] }
failure = "unavailable"
await ownerComponent.methods.updatePlaceDetails.call(
  owner,
  pin,
  [{ year: 2025 }],
  pin.memory,
  customPlace
)
const locationAttempt = owner.locationAttempt
assert.ok(locationAttempt.key)
failure = ""
await ownerComponent.methods.updatePlaceDetails.call(
  owner,
  pin,
  [{ year: 2025 }],
  pin.memory,
  customPlace
)
assert.equal(attempts.at(-1).idempotencyKey, locationAttempt.key)
assert.equal(attempts.at(-1).revision, locationAttempt.revision)
assert.equal(owner.locationAttempt, null)
failure = "revision_conflict"
await ownerComponent.methods.updatePlaceDetails.call(
  owner,
  pin,
  [{ year: 2025 }],
  pin.memory,
  customPlace
)
assert.equal(owner.locationAttempt, null)
assert.match(owner.pinEditorError, /Review this location draft/)

const exact =
  "https://www.expedia.com/affiliates/flight?x=a%2Fb&token=A+B&order=2"
const row = {
  id: "expedia-city",
  destination_id: "geonames:4180439",
  destination_label: "Atlanta",
  country_code: "US",
  expedia_flights_url: exact,
  enabled: "true",
  placement_scope: "public",
  notes: "Internal only",
  row: 2,
}
const catalog = {
  records: [
    {
      placeId: "geonames:4180439",
      name: "Atlanta",
      placeType: "city",
      countryCode: "US",
    },
  ],
}
const compiled = compileExpediaLinks([row], catalog)
assert.equal(compiled.registry.links[0].affiliateUrl, exact)
assert.equal(compiled.serialized.includes("Internal only"), false)
assert.equal(
  compileExpediaLinks([row], catalog, compiled.registry).serialized,
  compiled.serialized
)
assert.equal(
  compileExpediaLinks([row], catalog, compiled.registry).diff[0].change,
  "unchanged"
)
for (const changed of [
  { ...row, destination_id: "geonames:999" },
  { ...row, country_code: "CA" },
  { ...row, expedia_flights_url: "https://www.expedia.com.evil.example/x" },
  { ...row, expedia_flights_url: "https://user:pass@www.expedia.com/x" },
])
  assert.throws(() => compileExpediaLinks([changed], catalog))
assert.throws(() =>
  compileExpediaLinks(
    [row, { ...row, id: "another", placement_scope: "both-approved" }],
    catalog
  )
)
assert.throws(
  () => compileExpediaLinks([], catalog, compiled.registry),
  /Missing published rows/
)
assert.equal(isApprovedExpediaUrl("https://tinyurl.com/abc"), false)
const generic = {
  ...row,
  id: "expedia-generic",
  destination_id: "",
  destination_label: "",
  country_code: "",
  expedia_flights_url: "https://www.expedia.com/Flights?owner=issued",
}
const registry = compileExpediaLinks([row, generic], catalog).registry
assert.equal(
  resolveExpediaFlightLink(row.destination_id, "public", registry).href,
  exact
)
assert.equal(
  resolveExpediaFlightLink("geonames:123", "public", registry).resolution,
  "generic"
)
assert.equal(
  resolveExpediaFlightLink(row.destination_id, "private", registry).tracked,
  false
)
assert.equal(
  resolveExpediaFlightLink(row.destination_id, "public", { links: [] })
    .resolution,
  "ordinary"
)
const cell = (content, url) => ({
  content: [
    {
      paragraph: {
        elements: [
          { textRun: { content, textStyle: url ? { link: { url } } : {} } },
        ],
      },
    },
  ],
})
const values = EXPEDIA_LINK_HEADERS.map(key => row[key])
const document = {
  body: {
    content: [
      {
        table: {
          tableRows: [
            { tableCells: EXPEDIA_LINK_HEADERS.map(value => cell(value)) },
            {
              tableCells: values.map((value, index) =>
                index === 4 ? cell("Friendly label", exact) : cell(value)
              ),
            },
          ],
        },
      },
    ],
  },
}
assert.equal(
  extractExpediaTable(document, "json")[0].expedia_flights_url,
  exact
)
const sheet = {
  sheets: [
    {
      data: [
        {
          rowData: [
            {
              values: EXPEDIA_LINK_HEADERS.map(formattedValue => ({
                formattedValue,
              })),
            },
            {
              values: values.map((formattedValue, index) =>
                index === 4
                  ? {
                      formattedValue: "Friendly Expedia label",
                      hyperlink: exact,
                    }
                  : { formattedValue }
              ),
            },
          ],
        },
      ],
    },
  ],
}
assert.equal(extractExpediaSheetGrid(sheet)[0].expedia_flights_url, exact)
sheet.sheets[0].data[0].rowData[1].values[4].textFormatRuns = [
  { format: { link: { uri: "https://www.expedia.com/different" } } },
]
assert.throws(() => extractExpediaSheetGrid(sheet), /multiple hyperlink/)
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "rwj-expedia-test-"))
if (!path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep))
  throw Error("Unexpected test directory")
try {
  const invalid = path.join(temporary, "invalid.csv")
  await fs.writeFile(
    invalid,
    EXPEDIA_LINK_HEADERS.join(",") +
      "\ninvalid,,,,https://evil.example,true,public,\n"
  )
  const before = await fs.readFile(
    "src/content/partners/expedia-flight-links.json",
    "utf8"
  )
  const result = spawnSync(
    process.execPath,
    [
      "scripts/affiliates/import-expedia-links.mjs",
      "--file",
      invalid,
      "--publish",
    ],
    { encoding: "utf8" }
  )
  assert.equal(result.status, 1)
  assert.equal(
    await fs.readFile("src/content/partners/expedia-flight-links.json", "utf8"),
    before
  )
} finally {
  await fs.rm(temporary, { recursive: true, force: true })
}

const mappings = [
  {
    siteLocationId: "geonames:1",
    viatorDestinationId: "77",
    label: "Fixture market",
    active: true,
  },
]
const selection = normalizeDiscoveryRequest(
  { destinationId: "geonames:1" },
  mappings
)
assert.throws(() =>
  normalizeDiscoveryRequest({ destinationId: "custom:1" }, mappings)
)
assert.throws(() =>
  normalizeDiscoveryRequest(
    { destinationId: "geonames:1", tripId: "private" },
    mappings
  )
)
const productUrl =
  "https://www.viator.com/tours/fixture?pid=A%2Fb&campaign=one+two"
const product = {
  productCode: "TEST1",
  title: "Fixture activity",
  productUrl,
  pricing: { currency: "USD", summary: { fromPrice: 20 } },
  reviews: { combinedAverageRating: 4.5, totalReviews: 2 },
}
let providerCalls = 0
const provider = async (url, request) => {
  providerCalls++
  assert.equal(url, "https://api.sandbox.viator.com/partner/products/search")
  assert.equal(request.headers["exp-api-key"], "fixture-secret")
  assert.deepEqual(JSON.parse(request.body), {
    filtering: { destination: "77" },
    sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
    pagination: { start: 1, count: 6 },
    currency: "USD",
  })
  return Response.json({ products: [product] })
}
const found = await searchViator({
  selection,
  key: "fixture-secret",
  fetchImpl: provider,
})
assert.equal(found.products[0].productUrl, productUrl)
assert.equal(JSON.stringify(found).includes("fixture-secret"), false)
await assert.rejects(searchViator({ selection, key: "" }), {
  code: "viator_key_not_configured",
})
await assert.rejects(
  searchViator({
    selection,
    key: "fixture",
    fetchImpl: async () =>
      new Response("", { status: 429, headers: { "Retry-After": "60" } }),
  }),
  { code: "provider_rate_limited", retryAfter: "60" }
)
await assert.rejects(
  searchViator({
    selection,
    key: "fixture",
    fetchImpl: async () =>
      Response.json({
        products: [{ ...product, productUrl: "https://evil.example/" }],
      }),
  }),
  { code: "invalid_provider_response" }
)
const environment = {
  LOCAL_DISCOVERY_ENABLED: "true",
  VIATOR_API_KEY: "fixture-secret",
}
assert.equal(
  (
    await handleDiscoveryRequest(
      new Request("https://remote.example/search", { method: "POST" }),
      environment
    )
  ).status,
  404
)
assert.equal(
  (
    await handleDiscoveryRequest(
      new Request("http://127.0.0.1:8789/search", {
        method: "POST",
        headers: { Origin: "https://foreign.example" },
      }),
      environment
    )
  ).status,
  403
)
const before = providerCalls
const page = await handleDiscoveryRequest(
  new Request("http://127.0.0.1:8789/"),
  environment,
  { fetchImpl: provider, destinations: mappings }
)
assert.equal(page.status, 200)
assert.equal(providerCalls, before)
assert.equal((await page.text()).includes("fixture-secret"), false)
const request = () =>
  new Request("http://127.0.0.1:8789/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "unit-search",
    },
    body: JSON.stringify({ destinationId: "geonames:1" }),
  })
for (let i = 0; i < 6; i++)
  assert.equal(
    (
      await handleDiscoveryRequest(request(), environment, {
        fetchImpl: provider,
        destinations: mappings,
        now: 60000,
      })
    ).status,
    200
  )
assert.equal(
  (
    await handleDiscoveryRequest(request(), environment, {
      fetchImpl: provider,
      destinations: mappings,
      now: 60000,
    })
  ).status,
  429
)
console.log(
  "Private recap contracts, Expedia import/fallback/atomicity and local Viator sandbox boundary tests passed."
)
