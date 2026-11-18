const MANIFEST_MAX_BYTES = 256 * 1024
const SHARD_MAX_COMPRESSED_BYTES = 16 * 1024 * 1024
const SHARD_MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024
const PLACE_ID_PATTERN = /^(?:iso-country:[A-Z]{2}|geonames:[1-9][0-9]{0,11})$/

const combiningMarks = /[\u0300-\u036f]/g
const punctuation = /[^\p{L}\p{N}]+/gu

export class CatalogConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "CatalogConfigurationError"
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = "The place catalog is temporarily unavailable.") {
    super(message)
    this.name = "CatalogUnavailableError"
  }
}

export class CatalogValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = "CatalogValidationError"
  }
}

export function normalizeCatalogSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(combiningMarks, "")
    .toLowerCase()
    .replace(punctuation, " ")
    .trim()
    .replace(/\s+/g, " ")
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

function cleanManifestKey(value) {
  const key = typeof value === "string" ? value.trim() : ""
  if (
    !key ||
    key.length > 512 ||
    key.startsWith("/") ||
    key.includes("..") ||
    !/^[A-Za-z0-9._/-]+$/.test(key)
  ) {
    throw new CatalogConfigurationError(
      "MY_ATLAS_CATALOG_MANIFEST_KEY is invalid."
    )
  }
  return key
}

function assertBucket(value) {
  if (!value || typeof value.get !== "function") {
    throw new CatalogConfigurationError("MY_ATLAS_CATALOG_R2 is not bound.")
  }
  return value
}

function assertTemplate(value, suffix) {
  return (
    typeof value === "string" &&
    value.endsWith(suffix) &&
    value.includes("{shard}") &&
    !value.startsWith("/") &&
    !value.includes("..")
  )
}

function assertManifest(value) {
  const versionOneSearch =
    value?.artifactVersion === 1 &&
    value.searchShards?.algorithm === "sha256-normalized-query-prefix" &&
    value.searchShards?.prefixCharacters === 2 &&
    Number.isInteger(value.searchShards?.hexLength) &&
    value.searchShards.hexLength >= 1 &&
    value.searchShards.hexLength <= 4
  const versionTwoSearch =
    value?.artifactVersion === 2 &&
    value.searchShards?.algorithm === "sha256-normalized-query-prefix-v2" &&
    Array.isArray(value.searchShards?.prefixCharacters) &&
    value.searchShards.prefixCharacters.length > 0 &&
    value.searchShards.prefixCharacters.length <= 4 &&
    value.searchShards.prefixCharacters.every(
      (length, index, lengths) =>
        Number.isInteger(length) &&
        length >= 4 &&
        length <= 12 &&
        (index === 0 || length > lengths[index - 1])
    ) &&
    Number.isInteger(value.searchShards?.hexLength) &&
    value.searchShards.hexLength >= 3 &&
    value.searchShards.hexLength <= 16
  if (
    !value ||
    value.schemaVersion !== 1 ||
    ![1, 2].includes(value.artifactVersion) ||
    typeof value.catalogRevision !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value.catalogRevision) ||
    value.encoding !== "gzip" ||
    value.recordShards?.algorithm !== "sha256-place-id" ||
    !Number.isInteger(value.recordShards?.hexLength) ||
    value.recordShards.hexLength < 1 ||
    value.recordShards.hexLength > 4 ||
    !assertTemplate(value.recordShards?.keyTemplate, ".json.gz") ||
    (!versionOneSearch && !versionTwoSearch) ||
    !assertTemplate(value.searchShards?.keyTemplate, ".json.gz") ||
    typeof value.attribution?.provider !== "string" ||
    typeof value.attribution?.license !== "string"
  ) {
    throw new CatalogUnavailableError("The catalog manifest is invalid.")
  }
  const expectedReleasePrefix = `catalog/releases/${value.catalogRevision}`
  if (
    value.releasePrefix !== expectedReleasePrefix ||
    !value.recordShards.keyTemplate.startsWith(
      `${expectedReleasePrefix}/records/`
    ) ||
    !value.searchShards.keyTemplate.startsWith(
      `${expectedReleasePrefix}/search/`
    )
  ) {
    throw new CatalogUnavailableError("The catalog manifest is invalid.")
  }
  return value
}

async function decodeObject(object, encoding, maximumBytes) {
  if (!object) throw new CatalogUnavailableError()
  if (
    Number.isFinite(object.size) &&
    object.size > SHARD_MAX_COMPRESSED_BYTES
  ) {
    throw new CatalogUnavailableError("The catalog object is too large.")
  }
  const bytes = await object.arrayBuffer()
  if (bytes.byteLength > SHARD_MAX_COMPRESSED_BYTES) {
    throw new CatalogUnavailableError("The catalog object is too large.")
  }
  let text
  try {
    if (encoding === "gzip") {
      const stream = new Response(bytes).body.pipeThrough(
        new DecompressionStream("gzip")
      )
      text = await new Response(stream).text()
    } else {
      text = new TextDecoder().decode(bytes)
    }
  } catch {
    throw new CatalogUnavailableError("The catalog object could not be read.")
  }
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new CatalogUnavailableError("The catalog object is too large.")
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new CatalogUnavailableError("The catalog object is invalid.")
  }
}

function assertRevisionShard(value, manifest, collection) {
  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.catalogRevision !== manifest.catalogRevision ||
    !Array.isArray(value[collection])
  ) {
    throw new CatalogUnavailableError("The catalog shard is invalid.")
  }
  return value[collection]
}

function validPlaceRecord(record, manifest) {
  return Boolean(
    record &&
      PLACE_ID_PATTERN.test(record.placeId) &&
      ["country", "city", "spot"].includes(record.placeType) &&
      typeof record.name === "string" &&
      record.name.length > 0 &&
      record.name.length <= 512 &&
      record.catalogRevision === manifest.catalogRevision &&
      typeof record.deprecated === "boolean" &&
      (record.placeType !== "spot" ||
        (typeof record.spotCategory === "string" &&
          record.spotCategory.length > 0 &&
          record.spotCategory.length <= 64 &&
          typeof record.spotKind === "string" &&
          record.spotKind.length > 0 &&
          record.spotKind.length <= 64)) &&
      (record.coordinates === null ||
        (Array.isArray(record.coordinates) &&
          record.coordinates.length === 2 &&
          Number.isFinite(record.coordinates[0]) &&
          Number.isFinite(record.coordinates[1]) &&
          record.coordinates[0] >= -180 &&
          record.coordinates[0] <= 180 &&
          record.coordinates[1] >= -90 &&
          record.coordinates[1] <= 90))
  )
}

function searchScore(candidate, query) {
  const record = candidate.record || {}
  const canonicalNames = [...new Set([record.name, record.asciiName])]
    .map(normalizeCatalogSearchText)
    .filter(Boolean)
  const names = Array.isArray(candidate.searchNames)
    ? candidate.searchNames
    : []
  let score = Number.POSITIVE_INFINITY

  for (const name of canonicalNames) {
    if (name === query) score = Math.min(score, 0)
    else if (name.startsWith(query)) score = Math.min(score, 10)
  }
  for (const name of names) {
    if (name === query) score = Math.min(score, 5)
    else if (name.startsWith(query)) score = Math.min(score, 15)
    else if (name.includes(` ${query}`)) score = Math.min(score, 20)
    else if (name.includes(query)) score = Math.min(score, 30)
  }
  return score
}

function formatLabel(record) {
  return record.placeType === "country"
    ? record.name
    : [record.name, record.admin1Name, record.countryName]
        .filter(Boolean)
        .join(", ")
}

export class WorkerPlaceCatalog {
  constructor(environment = {}) {
    this.bucket = assertBucket(environment.MY_ATLAS_CATALOG_R2)
    this.manifestKey = cleanManifestKey(
      environment.MY_ATLAS_CATALOG_MANIFEST_KEY
    )
    this.manifestPromise = null
  }

  async manifest() {
    if (!this.manifestPromise) {
      this.manifestPromise = this.bucket
        .get(this.manifestKey)
        .then(object => decodeObject(object, "identity", MANIFEST_MAX_BYTES))
        .then(assertManifest)
        .catch(error => {
          this.manifestPromise = null
          throw error
        })
    }
    return this.manifestPromise
  }

  async resolve(placeId) {
    return (await this.resolveMany([placeId]))[0] || null
  }

  async resolveMany(placeIds) {
    if (
      !Array.isArray(placeIds) ||
      placeIds.length < 1 ||
      placeIds.length > 300 ||
      placeIds.some(placeId => !PLACE_ID_PATTERN.test(placeId))
    ) {
      throw new CatalogValidationError("Canonical place IDs are invalid.")
    }
    if (new Set(placeIds).size !== placeIds.length) {
      throw new CatalogValidationError("Canonical place IDs must be unique.")
    }
    const manifest = await this.manifest()
    const shardGroups = new Map()
    const hashedIds = await Promise.all(
      placeIds.map(async placeId => ({
        placeId,
        shard: (await sha256(placeId)).slice(
          0,
          manifest.recordShards.hexLength
        ),
      }))
    )
    for (const entry of hashedIds) {
      const group = shardGroups.get(entry.shard) || []
      group.push(entry.placeId)
      shardGroups.set(entry.shard, group)
    }

    const recordsById = new Map()
    const groups = [...shardGroups.entries()]
    for (let offset = 0; offset < groups.length; offset += 8) {
      await Promise.all(
        groups.slice(offset, offset + 8).map(async ([shard, ids]) => {
          const key = manifest.recordShards.keyTemplate.replace(
            "{shard}",
            shard
          )
          const object = await this.bucket.get(key)
          if (!object) return
          const value = await decodeObject(
            object,
            manifest.encoding,
            SHARD_MAX_DECOMPRESSED_BYTES
          )
          const records = assertRevisionShard(value, manifest, "records")
          for (const placeId of ids) {
            const record = records.find(
              candidate => candidate.placeId === placeId
            )
            if (!record) continue
            if (!validPlaceRecord(record, manifest)) {
              throw new CatalogUnavailableError(
                "The catalog record is invalid."
              )
            }
            recordsById.set(placeId, record)
          }
        })
      )
    }
    return Object.freeze(
      placeIds.map(placeId => recordsById.get(placeId) || null)
    )
  }

  async search(query, { limit = 8 } = {}) {
    const normalizedQuery = normalizeCatalogSearchText(query)
    const manifest = await this.manifest()
    const prefixLengths = Array.isArray(manifest.searchShards.prefixCharacters)
      ? manifest.searchShards.prefixCharacters
      : [manifest.searchShards.prefixCharacters]
    const queryCharacters = [...normalizedQuery]
    const minimumCharacters = prefixLengths[0]
    if (
      queryCharacters.length < minimumCharacters ||
      queryCharacters.length > 80
    ) {
      throw new CatalogValidationError(
        `Search query must contain between ${minimumCharacters} and 80 normalized characters.`
      )
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      throw new CatalogValidationError("Search limit must be between 1 and 10.")
    }
    const prefixLength = [...prefixLengths]
      .reverse()
      .find(length => queryCharacters.length >= length)
    const prefix = queryCharacters.slice(0, prefixLength).join("")
    const shard = (await sha256(prefix)).slice(
      0,
      manifest.searchShards.hexLength
    )
    const key = manifest.searchShards.keyTemplate.replace("{shard}", shard)
    const object = await this.bucket.get(key)
    if (!object) {
      return Object.freeze({
        catalogRevision: manifest.catalogRevision,
        attribution: manifest.attribution,
        results: [],
      })
    }
    const value = await decodeObject(
      object,
      manifest.encoding,
      SHARD_MAX_DECOMPRESSED_BYTES
    )
    const candidates = assertRevisionShard(value, manifest, "candidates")
    if (
      candidates.some(
        candidate =>
          !validPlaceRecord(candidate?.record, manifest) ||
          !Array.isArray(candidate.searchNames) ||
          candidate.searchNames.some(
            name => typeof name !== "string" || name.length > 1024
          )
      )
    ) {
      throw new CatalogUnavailableError("The catalog search shard is invalid.")
    }
    const results = candidates
      .map(candidate => ({
        record: candidate.record,
        score: searchScore(candidate, normalizedQuery),
      }))
      .filter(candidate =>
        Boolean(
          candidate.record &&
            !candidate.record.deprecated &&
            Number.isFinite(candidate.score)
        )
      )
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score
        const population =
          Number(right.record.population || 0) -
          Number(left.record.population || 0)
        if (population) return population
        return formatLabel(left.record).localeCompare(formatLabel(right.record))
      })
      .slice(0, limit)
      .map(candidate => candidate.record)

    return Object.freeze({
      catalogRevision: manifest.catalogRevision,
      attribution: manifest.attribution,
      results,
    })
  }
}

export function createCatalogResolver(environment) {
  const catalog = new WorkerPlaceCatalog(environment)
  return placeId => catalog.resolve(placeId)
}
