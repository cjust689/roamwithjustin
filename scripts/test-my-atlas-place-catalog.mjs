import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildPlaceCatalog } from "./my-atlas/lib/build-place-catalog.mjs"
import {
  resolveCatalogPlace,
  searchPlaceCatalog,
} from "../src/features/my-atlas/catalog/search.mjs"
import {
  addDraftPin,
  removeDraftPin,
} from "../src/features/my-atlas/catalog/pinDraft.mjs"
import { isMyAtlasGeographicProofEnabled } from "../src/features/my-atlas/config/featureFlags.mjs"

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

const first = buildPlaceCatalog(options)
const repeat = buildPlaceCatalog(options)
assert.deepEqual(
  first,
  repeat,
  "identical inputs must produce identical output"
)
assert.equal(first.stats.countries, 3)
assert.equal(first.stats.cities, 5)
assert.equal(resolveCatalogPlace(first, "iso-country:AN"), null)
assert.equal(first.sources.length, 3)
assert.ok(first.sources.every(source => /^[a-f0-9]{64}$/.test(source.sha256)))

const uvita = searchPlaceCatalog(first, "Uvita Costa Rica")
assert.equal(uvita.length, 1)
assert.equal(uvita[0].placeId, "geonames:3621138")
assert.deepEqual(uvita[0].coordinates, [-83.7395, 9.17039])
assert.equal(
  searchPlaceCatalog(first, "Увита")[0].placeId,
  "geonames:3621138"
)

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
console.log("My Atlas GeoNames catalog tests passed.")
