import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { normalizeSearchText } from "../../../src/features/my-atlas/catalog/search.mjs"

const SCHEMA_VERSION = 1
const RECORD_SHARD_HEX_LENGTH = 3
const SEARCH_SHARD_HEX_LENGTH = 3
const SEARCH_PREFIX_CHARACTERS = Object.freeze([4, 6])

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function gzipJson(value) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(value)), {
    level: 9,
    mtime: 0,
  })
}

function publicSearchRecord(record, catalogRevision) {
  return {
    placeId: record.placeId,
    placeType: record.placeType,
    name: record.name,
    asciiName: record.asciiName,
    countryCode: record.countryCode,
    countryName: record.countryName,
    ...(record.admin1Code ? { admin1Code: record.admin1Code } : {}),
    ...(record.admin1Name ? { admin1Name: record.admin1Name } : {}),
    ...(record.continent ? { continent: record.continent } : {}),
    ...(record.spotCategory ? { spotCategory: record.spotCategory } : {}),
    ...(record.spotKind ? { spotKind: record.spotKind } : {}),
    coordinates: record.coordinates,
    coordinateKind: record.coordinateKind,
    population: record.population || 0,
    source: record.source,
    catalogRevision,
    deprecated: Boolean(record.deprecated),
  }
}

function queryPrefixes(value) {
  const normalized = normalizeSearchText(value)
  if ([...normalized].length < SEARCH_PREFIX_CHARACTERS[0]) return []
  const tokens = normalized
    .split(" ")
    .filter(token => [...token].length >= SEARCH_PREFIX_CHARACTERS[0])
  return [
    ...new Set(
      [normalized, ...tokens].flatMap(item => {
        const characters = [...item]
        return SEARCH_PREFIX_CHARACTERS.filter(
          length => characters.length >= length
        ).map(length => characters.slice(0, length).join(""))
      })
    ),
  ]
}

function recordSearchNames(record) {
  return [
    record.name,
    record.asciiName,
    ...(Array.isArray(record.searchNames) ? record.searchNames : []),
  ]
    .map(normalizeSearchText)
    .filter(value => [...value].length >= SEARCH_PREFIX_CHARACTERS[0])
}

function addSearchCandidate(
  shards,
  shard,
  record,
  searchName,
  catalogRevision
) {
  if (!shards.has(shard)) shards.set(shard, new Map())
  const candidates = shards.get(shard)
  if (!candidates.has(record.placeId)) {
    candidates.set(record.placeId, {
      record: publicSearchRecord(record, catalogRevision),
      searchNames: new Set(),
    })
  }
  candidates.get(record.placeId).searchNames.add(searchName)
}

function writeGzipShard(outputDirectory, key, payload) {
  const file = path.join(outputDirectory, ...key.split("/"))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const encoded = gzipJson(payload)
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file)
    if (!existing.equals(encoded)) {
      throw new Error(`Immutable catalog artifact conflict: ${key}`)
    }
  } else {
    fs.writeFileSync(file, encoded)
  }
  return encoded.length
}

export function buildWorkerPlaceCatalogArtifacts({
  catalog,
  outputDirectory,
  artifactRevision = "",
}) {
  if (
    !catalog ||
    catalog.schemaVersion !== 1 ||
    !Array.isArray(catalog.records) ||
    typeof catalog.catalogRevision !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(catalog.catalogRevision)
  ) {
    throw new Error("A valid versioned place catalog is required")
  }
  if (!outputDirectory) throw new Error("outputDirectory is required")

  const revision = artifactRevision || catalog.catalogRevision
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(revision)) {
    throw new Error("A valid artifact revision is required")
  }
  const releasePrefix = `catalog/releases/${revision}`
  const recordShards = new Map()
  const searchShards = new Map()

  for (const record of catalog.records) {
    const recordShard = sha256(record.placeId).slice(0, RECORD_SHARD_HEX_LENGTH)
    if (!recordShards.has(recordShard)) recordShards.set(recordShard, [])
    recordShards.get(recordShard).push(record)

    if (record.deprecated) continue
    for (const searchName of recordSearchNames(record)) {
      for (const prefix of queryPrefixes(searchName)) {
        const searchShard = sha256(prefix).slice(0, SEARCH_SHARD_HEX_LENGTH)
        addSearchCandidate(
          searchShards,
          searchShard,
          record,
          searchName,
          revision
        )
      }
    }
  }

  fs.mkdirSync(outputDirectory, { recursive: true })
  const shardStats = {
    recordShards: 0,
    recordCompressedBytes: 0,
    largestRecordCompressedBytes: 0,
    searchShards: 0,
    searchCompressedBytes: 0,
    largestSearchCompressedBytes: 0,
  }

  for (const [shard, records] of [...recordShards].sort()) {
    const bytes = writeGzipShard(
      outputDirectory,
      `${releasePrefix}/records/${shard}.json.gz`,
      {
        schemaVersion: SCHEMA_VERSION,
        catalogRevision: revision,
        records: records
          .map(record => ({ ...record, catalogRevision: revision }))
          .sort((left, right) => left.placeId.localeCompare(right.placeId)),
      }
    )
    shardStats.recordShards += 1
    shardStats.recordCompressedBytes += bytes
    shardStats.largestRecordCompressedBytes = Math.max(
      shardStats.largestRecordCompressedBytes,
      bytes
    )
  }

  for (const [shard, candidateMap] of [...searchShards].sort()) {
    const candidates = [...candidateMap.values()]
      .map(candidate => ({
        record: candidate.record,
        searchNames: [...candidate.searchNames].sort(),
      }))
      .sort((left, right) =>
        left.record.placeId.localeCompare(right.record.placeId)
      )
    const bytes = writeGzipShard(
      outputDirectory,
      `${releasePrefix}/search/${shard}.json.gz`,
      {
        schemaVersion: SCHEMA_VERSION,
        catalogRevision: revision,
        candidates,
      }
    )
    shardStats.searchShards += 1
    shardStats.searchCompressedBytes += bytes
    shardStats.largestSearchCompressedBytes = Math.max(
      shardStats.largestSearchCompressedBytes,
      bytes
    )
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    artifactVersion: 2,
    catalogRevision: revision,
    sourceSnapshotDate: catalog.sourceSnapshotDate,
    attribution: catalog.attribution,
    stats: catalog.stats,
    releasePrefix,
    encoding: "gzip",
    recordShards: {
      algorithm: "sha256-place-id",
      hexLength: RECORD_SHARD_HEX_LENGTH,
      keyTemplate: `${releasePrefix}/records/{shard}.json.gz`,
      count: shardStats.recordShards,
    },
    searchShards: {
      algorithm: "sha256-normalized-query-prefix-v2",
      prefixCharacters: SEARCH_PREFIX_CHARACTERS,
      hexLength: SEARCH_SHARD_HEX_LENGTH,
      keyTemplate: `${releasePrefix}/search/{shard}.json.gz`,
      count: shardStats.searchShards,
    },
    shardStats,
  }
  const manifestDirectory = path.join(outputDirectory, "catalog")
  fs.mkdirSync(manifestDirectory, { recursive: true })
  const manifestFile = path.join(manifestDirectory, "current.json")
  const encodedManifest = `${JSON.stringify(manifest)}\n`
  if (fs.existsSync(manifestFile)) {
    const existingManifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    if (
      existingManifest.catalogRevision === manifest.catalogRevision &&
      fs.readFileSync(manifestFile, "utf8") !== encodedManifest
    ) {
      throw new Error(
        `Immutable catalog manifest conflict: ${manifest.catalogRevision}`
      )
    }
  }
  fs.writeFileSync(manifestFile, encodedManifest, "utf8")
  return manifest
}
