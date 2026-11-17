import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildPlaceCatalog } from "./my-atlas/lib/build-place-catalog.mjs"
import { buildWorkerPlaceCatalogArtifacts } from "./my-atlas/lib/build-worker-place-catalog.mjs"
import {
  resolveCatalogPlace,
  searchPlaceCatalog,
} from "../src/features/my-atlas/catalog/search.mjs"
import {
  addDraftPin,
  removeDraftPin,
} from "../src/features/my-atlas/catalog/pinDraft.mjs"
import { isMyAtlasGeographicProofEnabled } from "../src/features/my-atlas/config/featureFlags.mjs"
import {
  getMyAtlasAuthConfiguration,
  inspectMyAtlasAuthConfiguration,
} from "../src/features/my-atlas/config/auth0.mjs"
import {
  buildAuth0ClientOptions,
  buildLoginOptions,
  buildLogoutOptions,
  completeAuth0Redirect,
  getAudienceAccessToken,
  hasAuth0RedirectResponse,
  safeMyAtlasReturnPath,
} from "../src/features/my-atlas/auth/session.mjs"
import { searchMyAtlasPlaces } from "../src/features/my-atlas/catalog/placeSearchClient.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../src/features/my-atlas/config/placeSearch.mjs"
import { createLocalPlaceSearchServer } from "./my-atlas/local-place-search-server.mjs"
import {
  CatalogConfigurationError,
  WorkerPlaceCatalog,
} from "../workers/my-atlas/src/catalog/store.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const fixture = path.join(
  projectRoot,
  "scripts",
  "my-atlas",
  "fixtures",
  "geonames"
)
const options = {
  sourceDirectory: fixture,
  revision: "fixture-2026-11-16",
  sourceSnapshotDate: "2026-11-16",
  spotSourceFile: path.join(fixture, "spots.json"),
}

function directoryBucket(directory) {
  return {
    async get(key) {
      const file = path.join(directory, ...key.split("/"))
      if (!fs.existsSync(file)) return null
      const bytes = fs.readFileSync(file)
      return {
        size: bytes.length,
        async arrayBuffer() {
          return bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          )
        },
      }
    },
  }
}

function workerCatalog(directory) {
  return new WorkerPlaceCatalog({
    MY_ATLAS_CATALOG_R2: directoryBucket(directory),
    MY_ATLAS_CATALOG_MANIFEST_KEY: "catalog/current.json",
  })
}

function artifactFiles(directory, root = directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const file = path.join(directory, entry.name)
      return entry.isDirectory()
        ? artifactFiles(file, root)
        : [
            {
              file: path.relative(root, file).replaceAll("\\", "/"),
              bytes: fs.readFileSync(file).toString("base64"),
            },
          ]
    })
    .sort((left, right) => left.file.localeCompare(right.file))
}

assert.equal(isMyAtlasGeographicProofEnabled({}), false)
assert.equal(
  isMyAtlasGeographicProofEnabled({
    VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF: "false",
  }),
  false
)
assert.equal(
  isMyAtlasGeographicProofEnabled({
    VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF: "true",
  }),
  true
)

const authEnvironment = {
  VUE_APP_MY_ATLAS_AUTH0_DOMAIN: "example.us.auth0.com",
  VUE_APP_MY_ATLAS_AUTH0_CLIENT_ID: "public-client-id",
  VUE_APP_MY_ATLAS_AUTH0_AUDIENCE: "https://api.example.com",
}
assert.deepEqual(inspectMyAtlasAuthConfiguration({}), {
  configured: false,
  missing: ["domain", "clientId", "audience"],
})
assert.equal(inspectMyAtlasAuthConfiguration(authEnvironment).configured, true)
const authConfiguration = getMyAtlasAuthConfiguration(
  authEnvironment,
  "http://localhost:8080"
)
assert.equal(authConfiguration.domain, "example.us.auth0.com")
assert.equal(
  authConfiguration.callbackUri,
  "http://localhost:8080/my-atlas/callback"
)
assert.equal(authConfiguration.logoutUri, "http://localhost:8080/my-atlas")
assert.match(authConfiguration.scope, /read:my-atlas/)
assert.match(authConfiguration.scope, /write:my-atlas/)
assert.throws(
  () => getMyAtlasAuthConfiguration(authEnvironment, "http://example.com"),
  /requires HTTPS/
)
assert.equal(
  buildAuth0ClientOptions(authConfiguration).authorizationParams.audience,
  "https://api.example.com"
)
assert.equal(
  buildLoginOptions(authConfiguration).authorizationParams.connection,
  "google-oauth2"
)
assert.equal(
  buildLogoutOptions(authConfiguration).logoutParams.returnTo,
  "http://localhost:8080/my-atlas"
)
assert.equal(hasAuth0RedirectResponse("?code=abc&state=xyz"), true)
assert.equal(hasAuth0RedirectResponse("?error=access_denied&state=xyz"), true)
assert.equal(hasAuth0RedirectResponse("?code=abc"), false)
assert.equal(safeMyAtlasReturnPath("https://attacker.example"), "/my-atlas")

let requestedTokenOptions
const tokenClient = {
  getTokenSilently(options) {
    requestedTokenOptions = options
    return Promise.resolve("access-token-not-logged")
  },
}
assert.equal(
  await getAudienceAccessToken(tokenClient, authConfiguration),
  "access-token-not-logged"
)
assert.equal(
  requestedTokenOptions.authorizationParams.audience,
  "https://api.example.com"
)
assert.equal(
  await completeAuth0Redirect({
    handleRedirectCallback() {
      return Promise.resolve({
        appState: { returnTo: "https://attacker.example" },
      })
    },
  }),
  "/my-atlas"
)

assert.equal(getMyAtlasPlaceSearchEndpoint({}, "http://localhost:8080"), "")
assert.equal(
  getMyAtlasPlaceSearchEndpoint(
    {
      VUE_APP_MY_ATLAS_PLACE_SEARCH_URL:
        "http://127.0.0.1:8788/v1/places/search",
    },
    "http://localhost:8080"
  ),
  "http://127.0.0.1:8788/v1/places/search"
)
assert.throws(
  () =>
    getMyAtlasPlaceSearchEndpoint(
      { VUE_APP_MY_ATLAS_PLACE_SEARCH_URL: "http://example.com/search" },
      "https://roamwithjustin.com"
    ),
  /requires HTTPS/
)

const first = buildPlaceCatalog(options)
const repeat = buildPlaceCatalog(options)
assert.deepEqual(
  first,
  repeat,
  "identical inputs must produce identical output"
)
assert.equal(first.stats.countries, 3)
assert.equal(first.stats.cities, 5)
assert.equal(first.stats.spots, 2)
assert.equal(resolveCatalogPlace(first, "iso-country:AN"), null)
assert.equal(first.sources.length, 4)
assert.ok(first.sources.every(source => /^[a-f0-9]{64}$/.test(source.sha256)))

const workerArtifactRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "my-atlas-worker-catalog-")
)
const manifest = buildWorkerPlaceCatalogArtifacts({
  catalog: first,
  outputDirectory: workerArtifactRoot,
})
const repeatWorkerArtifactRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "my-atlas-worker-catalog-repeat-")
)
buildWorkerPlaceCatalogArtifacts({
  catalog: first,
  outputDirectory: repeatWorkerArtifactRoot,
})
assert.deepEqual(
  artifactFiles(workerArtifactRoot),
  artifactFiles(repeatWorkerArtifactRoot),
  "identical catalogs must produce byte-identical Worker artifacts"
)
const conflictingWorkerCatalog = structuredClone(first)
conflictingWorkerCatalog.records.find(
  record => record.placeId === "geonames:3621138"
).name = "Changed Uvita"
assert.throws(
  () =>
    buildWorkerPlaceCatalogArtifacts({
      catalog: conflictingWorkerCatalog,
      outputDirectory: workerArtifactRoot,
    }),
  /Immutable catalog artifact conflict/
)
assert.equal(manifest.catalogRevision, options.revision)
assert.ok(manifest.recordShards.count > 0)
assert.ok(manifest.searchShards.count > 0)
assert.ok(manifest.shardStats.largestRecordCompressedBytes > 0)
assert.ok(manifest.shardStats.largestSearchCompressedBytes > 0)

const fixtureWorkerCatalog = workerCatalog(workerArtifactRoot)
assert.equal(
  (await fixtureWorkerCatalog.resolve("geonames:3621138")).name,
  "Uvita"
)
assert.equal(await fixtureWorkerCatalog.resolve("geonames:999999999"), null)
const workerParis = await fixtureWorkerCatalog.search("Paris", { limit: 8 })
assert.equal(workerParis.catalogRevision, options.revision)
assert.equal(workerParis.results[0].placeId, "geonames:2988507")
assert.ok(
  workerParis.results.some(place => place.placeId === "geonames:4717560")
)
assert.equal(
  (await fixtureWorkerCatalog.search("Uvita Costa Rica")).results[0].placeId,
  "geonames:3621138"
)
assert.equal(
  (await fixtureWorkerCatalog.search("Costa Rica")).results[0].placeId,
  "iso-country:CR"
)
assert.equal(
  (await fixtureWorkerCatalog.search("Yellowstone")).results[0].placeId,
  "geonames:5843642"
)
assert.equal(
  (await fixtureWorkerCatalog.search("Eiffel Tower")).results[0].placeId,
  "geonames:6254976"
)
await assert.rejects(() => fixtureWorkerCatalog.search("x"), /between 2 and 80/)
assert.throws(
  () =>
    new WorkerPlaceCatalog({
      MY_ATLAS_CATALOG_MANIFEST_KEY: "catalog/current.json",
    }),
  error => error instanceof CatalogConfigurationError
)

const localSearchServer = createLocalPlaceSearchServer({ catalog: first })
await new Promise((resolve, reject) => {
  localSearchServer.once("error", reject)
  localSearchServer.listen(0, "127.0.0.1", resolve)
})
try {
  const address = localSearchServer.address()
  const endpoint = `http://127.0.0.1:${address.port}/v1/places/search`
  const remoteParis = await searchMyAtlasPlaces({
    query: "Paris",
    catalog: { records: [] },
    endpoint,
    limit: 8,
  })
  assert.equal(remoteParis[0].placeId, "geonames:2988507")
  assert.ok(remoteParis.some(place => place.placeId === "geonames:4717560"))
} finally {
  await new Promise(resolve => localSearchServer.close(resolve))
}

const uvita = searchPlaceCatalog(first, "Uvita Costa Rica")
assert.equal(uvita.length, 1)
assert.equal(uvita[0].placeId, "geonames:3621138")
assert.deepEqual(uvita[0].coordinates, [-83.7395, 9.17039])
assert.equal(searchPlaceCatalog(first, "Увита")[0].placeId, "geonames:3621138")

const paris = searchPlaceCatalog(first, "Paris")
assert.equal(paris[0].placeId, "geonames:2988507")
assert.ok(paris.some(place => place.placeId === "geonames:4717560"))
assert.equal(
  searchPlaceCatalog(first, "Paris Texas")[0].placeId,
  "geonames:4717560"
)
assert.equal(
  searchPlaceCatalog(first, "Costa Rica")[0].placeId,
  "iso-country:CR"
)
assert.ok(resolveCatalogPlace(first, "iso-country:CR").coordinates)
const yellowstone = searchPlaceCatalog(first, "Yellowstone National Park")[0]
assert.equal(yellowstone.placeType, "spot")
assert.equal(yellowstone.spotCategory, "national-park")
assert.equal(yellowstone.spotKind, "National park")
assert.deepEqual(yellowstone.coordinates, [-110.58846, 44.42796])
assert.equal(searchPlaceCatalog(first, "Eiffel Tower")[0].name, "Eiffel Tower")

const aliasCollisionCatalog = {
  records: [
    {
      placeId: "geonames:1",
      placeType: "city",
      name: "Three Rivers",
      asciiName: "Three Rivers",
      searchNames: ["three rivers", "moab"],
      population: 7752,
    },
    {
      placeId: "geonames:2",
      placeType: "city",
      name: "Moab",
      asciiName: "Moab",
      searchNames: ["moab", "moab utah united states"],
      population: 5235,
    },
  ],
}
assert.equal(
  searchPlaceCatalog(aliasCollisionCatalog, "Moab")[0].placeId,
  "geonames:2"
)

let pins = addDraftPin([], "geonames:3621138", first)
assert.throws(
  () => addDraftPin(pins, "geonames:3621138", first),
  error => error.code === "duplicate_pin"
)
assert.throws(
  () => addDraftPin(pins, "coordinates:9.17,-83.74", first),
  error => error.code === "unsupported_place"
)
assert.throws(
  () => addDraftPin(pins, "geonames:4717560", first, { limit: 1 }),
  error => error.code === "pin_limit"
)
pins = removeDraftPin(pins, "geonames:3621138")
assert.deepEqual(pins, [])
pins = addDraftPin([], "geonames:5843642", first)
assert.deepEqual(pins, [{ placeId: "geonames:5843642" }])

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "my-atlas-catalog-"))
const nextSource = path.join(tempRoot, "next")
fs.cpSync(fixture, nextSource, { recursive: true })
const cityFile = path.join(nextSource, "cities500.txt")
const withoutUvita = fs
  .readFileSync(cityFile, "utf8")
  .split(/\r?\n/)
  .filter(line => !line.startsWith("3621138\t"))
  .join("\n")
fs.writeFileSync(cityFile, withoutUvita, "utf8")

const second = buildPlaceCatalog({
  ...options,
  sourceDirectory: nextSource,
  revision: "fixture-2026-11-17",
  sourceSnapshotDate: "2026-11-17",
  previousCatalog: first,
})
const deprecatedUvita = resolveCatalogPlace(second, "geonames:3621138")
assert.equal(deprecatedUvita.deprecated, true)
assert.equal(searchPlaceCatalog(second, "Uvita").length, 0)
assert.equal(
  searchPlaceCatalog(second, "Uvita", { includeDeprecated: true })[0].placeId,
  "geonames:3621138"
)
const deprecatedArtifactRoot = path.join(tempRoot, "deprecated-artifact")
buildWorkerPlaceCatalogArtifacts({
  catalog: second,
  outputDirectory: deprecatedArtifactRoot,
})
const deprecatedWorkerCatalog = workerCatalog(deprecatedArtifactRoot)
assert.equal(
  (await deprecatedWorkerCatalog.resolve("geonames:3621138")).deprecated,
  true
)
assert.equal((await deprecatedWorkerCatalog.search("Uvita")).results.length, 0)
assert.throws(
  () => addDraftPin([], "geonames:3621138", second),
  error => error.code === "deprecated_place"
)

const changedSource = path.join(tempRoot, "changed")
fs.cpSync(fixture, changedSource, { recursive: true })
const changedCityFile = path.join(changedSource, "cities500.txt")
fs.writeFileSync(
  changedCityFile,
  fs
    .readFileSync(changedCityFile, "utf8")
    .replace(
      "4717560\tParis\tParis\tParis,Paris Texas\t33.66094\t-95.55551\tP\tPPLA2\tUS\t",
      "4717560\tParis\tParis\tParis,Paris Texas\t33.66094\t-95.55551\tP\tPPLA2\tFR\t"
    ),
  "utf8"
)
assert.throws(
  () =>
    buildPlaceCatalog({
      ...options,
      sourceDirectory: changedSource,
      revision: "fixture-identity-change",
      previousCatalog: first,
    }),
  /Catalog identity country changed/
)

fs.rmSync(tempRoot, { recursive: true, force: true })
fs.rmSync(workerArtifactRoot, { recursive: true, force: true })
fs.rmSync(repeatWorkerArtifactRoot, { recursive: true, force: true })
console.log("My Atlas GeoNames catalog tests passed.")
