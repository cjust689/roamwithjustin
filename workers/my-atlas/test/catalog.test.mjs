import { describe, expect, it } from "vitest"
import {
  CatalogConfigurationError,
  CatalogUnavailableError,
  WorkerPlaceCatalog,
} from "../src/catalog/store.mjs"

const REVISION = "fixture-2026-11-16"
const PLACE = {
  placeId: "geonames:3621138",
  placeType: "city",
  name: "Uvita",
  asciiName: "Uvita",
  countryCode: "CR",
  countryName: "Costa Rica",
  admin1Code: "07",
  admin1Name: "Puntarenas Province",
  coordinates: [-83.7395, 9.17039],
  coordinateKind: "populated-place",
  population: 1000,
  source: {
    provider: "GeoNames",
    geonameId: "3621138",
    featureClass: "P",
    featureCode: "PPL",
  },
  catalogRevision: REVISION,
  deprecated: false,
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

async function gzipJson(value) {
  const stream = new Blob([JSON.stringify(value)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).arrayBuffer()
}

function object(bytes) {
  return {
    size: bytes.byteLength,
    async arrayBuffer() {
      return bytes.slice(0)
    },
  }
}

async function fixtureEnvironment() {
  const releasePrefix = `catalog/releases/${REVISION}`
  const manifest = {
    schemaVersion: 1,
    artifactVersion: 1,
    catalogRevision: REVISION,
    sourceSnapshotDate: "2026-11-16",
    attribution: { provider: "GeoNames", license: "CC BY 4.0" },
    encoding: "gzip",
    releasePrefix,
    recordShards: {
      algorithm: "sha256-place-id",
      hexLength: 2,
      keyTemplate: `${releasePrefix}/records/{shard}.json.gz`,
    },
    searchShards: {
      algorithm: "sha256-normalized-query-prefix",
      prefixCharacters: 2,
      hexLength: 2,
      keyTemplate: `${releasePrefix}/search/{shard}.json.gz`,
    },
  }
  const recordShard = (await sha256(PLACE.placeId)).slice(0, 2)
  const searchShard = (await sha256("uv")).slice(0, 2)
  const values = new Map([
    [
      "catalog/current.json",
      object(new TextEncoder().encode(JSON.stringify(manifest)).buffer),
    ],
    [
      `${releasePrefix}/records/${recordShard}.json.gz`,
      object(
        await gzipJson({
          schemaVersion: 1,
          catalogRevision: REVISION,
          records: [PLACE],
        })
      ),
    ],
    [
      `${releasePrefix}/search/${searchShard}.json.gz`,
      object(
        await gzipJson({
          schemaVersion: 1,
          catalogRevision: REVISION,
          candidates: [
            {
              record: PLACE,
              searchNames: ["uvita", "uvita costa rica"],
            },
          ],
        })
      ),
    ],
  ])
  return {
    MY_ATLAS_CATALOG_R2: {
      async get(key) {
        return values.get(key) || null
      },
    },
    MY_ATLAS_CATALOG_MANIFEST_KEY: "catalog/current.json",
  }
}

describe("versioned Worker place catalog", () => {
  it("resolves an exact ID and searches one bounded gzip shard", async () => {
    const catalog = new WorkerPlaceCatalog(await fixtureEnvironment())
    expect(await catalog.resolve(PLACE.placeId)).toEqual(PLACE)
    expect(await catalog.resolveMany([PLACE.placeId])).toEqual([PLACE])
    expect(await catalog.search("Uvita Costa Rica")).toMatchObject({
      catalogRevision: REVISION,
      results: [{ placeId: PLACE.placeId, name: "Uvita" }],
    })
    expect((await catalog.search("Miami")).results).toEqual([])
  })

  it("fails closed for missing bindings or mismatched shard revisions", async () => {
    expect(
      () =>
        new WorkerPlaceCatalog({
          MY_ATLAS_CATALOG_MANIFEST_KEY: "catalog/current.json",
        })
    ).toThrow(CatalogConfigurationError)

    const environment = await fixtureEnvironment()
    const originalGet = environment.MY_ATLAS_CATALOG_R2.get
    environment.MY_ATLAS_CATALOG_R2.get = async key => {
      const result = await originalGet(key)
      if (!key.includes("/records/")) return result
      return object(
        await gzipJson({
          schemaVersion: 1,
          catalogRevision: "wrong-revision",
          records: [PLACE],
        })
      )
    }
    const catalog = new WorkerPlaceCatalog(environment)
    await expect(catalog.resolve(PLACE.placeId)).rejects.toThrow(
      CatalogUnavailableError
    )
  })
})
