import { WorkerPlaceCatalog } from "../catalog/store.mjs"
import {
  cleanCatalogAttribution,
  projectCatalogPlace,
} from "../catalog/projection.mjs"
import { REGISTRY_OBJECT_NAME } from "../registration/service.mjs"
import { isNormalizedPinMemory } from "../account/memory.mjs"
import {
  CUSTOM_PLACE_ID_PATTERN,
  projectCustomPlace,
} from "../account/custom-place.mjs"

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const DIRECTORY_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000
const DIRECTORY_MAX_REGISTRATIONS = 1000

export class PublicAtlasNotFoundError extends Error {
  constructor() {
    super("The public Atlas is unavailable.")
    this.name = "PublicAtlasNotFoundError"
  }
}

export class PublicAtlasServiceError extends Error {
  constructor(message = "The public Atlas service is unavailable.") {
    super(message)
    this.name = "PublicAtlasServiceError"
  }
}

export class PublicAtlasValidationError extends Error {
  constructor(message = "The public Atlas directory request is invalid.") {
    super(message)
    this.name = "PublicAtlasValidationError"
  }
}

function requireNamespace(environment, name) {
  const namespace = environment[name]
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new PublicAtlasServiceError(`${name} is not bound.`)
  }
  return namespace
}

function publicAtlasImageMetadata(atlasImage) {
  if (!atlasImage) return null
  return Object.freeze({
    imageId: atlasImage.imageId,
    ...(atlasImage.location ? { location: atlasImage.location } : {}),
    contentType: atlasImage.contentType,
    width: atlasImage.width,
    height: atlasImage.height,
    byteLength: atlasImage.byteLength,
    updatedAt: atlasImage.updatedAt,
  })
}

function encodeDirectoryCursor(value) {
  return btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")
}

function decodeDirectoryCursor(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,256}$/.test(value)) {
    throw new PublicAtlasValidationError()
  }
  try {
    const padding = "=".repeat((4 - (value.length % 4)) % 4)
    const parsed = JSON.parse(
      atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding)
    )
    if (
      parsed?.version !== 1 ||
      !Number.isInteger(parsed.offset) ||
      parsed.offset < 0 ||
      parsed.offset > DIRECTORY_MAX_REGISTRATIONS ||
      typeof parsed.asOf !== "string" ||
      !Number.isFinite(Date.parse(parsed.asOf))
    ) {
      throw new Error("invalid cursor")
    }
    return Object.freeze({ offset: parsed.offset, asOf: parsed.asOf })
  } catch {
    throw new PublicAtlasValidationError()
  }
}

export function normalizePublicAtlasDirectoryQuery(url) {
  if (!(url instanceof URL)) throw new PublicAtlasValidationError()
  if (
    [...url.searchParams.keys()].some(key => !["limit", "cursor"].includes(key))
  ) {
    throw new PublicAtlasValidationError()
  }
  const rawLimit = url.searchParams.get("limit")
  const limit = rawLimit === null ? 12 : Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 24) {
    throw new PublicAtlasValidationError()
  }
  const rawCursor = url.searchParams.get("cursor")
  const cursor = rawCursor ? decodeDirectoryCursor(rawCursor) : null
  return Object.freeze({ limit, cursor })
}

function dailyHandleScore(handle, asOf) {
  const input = `${asOf.slice(0, 10)}:${handle}`
  let score = 2166136261
  for (const character of input) {
    score ^= character.codePointAt(0)
    score = Math.imul(score, 16777619)
  }
  return score >>> 0
}

export function rankPublicAtlasDiscoveries(discoveries, asOf) {
  const asOfTime = Date.parse(asOf)
  if (!Number.isFinite(asOfTime)) throw new PublicAtlasValidationError()
  return Object.freeze(
    discoveries
      .map(discovery => {
        const updatedTime = Date.parse(discovery.profile.updatedAt)
        if (!Number.isFinite(updatedTime)) throw new PublicAtlasServiceError()
        return {
          ...discovery,
          recent:
            updatedTime <= asOfTime &&
            asOfTime - updatedTime <= DIRECTORY_RECENT_WINDOW_MS,
          updatedTime,
        }
      })
      .sort((left, right) => {
        if (left.recent !== right.recent) return left.recent ? -1 : 1
        if (left.recent) return right.updatedTime - left.updatedTime
        return (
          dailyHandleScore(left.profile.handle, asOf) -
          dailyHandleScore(right.profile.handle, asOf)
        )
      })
  )
}

export async function getPublicAtlasDirectory({
  environment,
  input,
  now = new Date().toISOString(),
}) {
  const registry = requireNamespace(environment, "MY_ATLAS_REGISTRY").getByName(
    REGISTRY_OBJECT_NAME
  )
  const registrations = []
  let registryCursor = null
  do {
    const page = await registry.listActiveRegistrations({
      limit: 100,
      cursor: registryCursor,
    })
    if (!page?.ok || !Array.isArray(page.registrations)) {
      throw new PublicAtlasServiceError()
    }
    registrations.push(...page.registrations)
    registryCursor = page.nextCursor
  } while (registryCursor && registrations.length < DIRECTORY_MAX_REGISTRATIONS)
  if (registryCursor) throw new PublicAtlasServiceError()

  const namespace = requireNamespace(environment, "MY_ATLAS_USERS")
  const snapshots = await Promise.all(
    registrations.map(async registration => {
      const user = namespace.getByName(registration.userId)
      const snapshot = await user.getPublicAtlasDiscovery()
      if (snapshot?.ok) return snapshot
      if (snapshot?.error === "public_atlas_inconsistent") {
        throw new PublicAtlasServiceError()
      }
      return null
    })
  )
  const asOf = input.cursor?.asOf || now
  const offset = input.cursor?.offset || 0
  const ranked = rankPublicAtlasDiscoveries(snapshots.filter(Boolean), asOf)
  const page = ranked.slice(offset, offset + input.limit)
  const nextOffset = offset + page.length
  return Object.freeze({
    schemaVersion: 1,
    atlases: Object.freeze(
      page.map(snapshot =>
        Object.freeze({
          handle: snapshot.profile.handle,
          displayName: snapshot.profile.displayName,
          placeCount: snapshot.profile.pinCount,
          recent: snapshot.recent,
          favoriteImage: publicAtlasImageMetadata(snapshot.atlasImage),
        })
      )
    ),
    nextCursor:
      nextOffset < ranked.length
        ? encodeDirectoryCursor({ version: 1, offset: nextOffset, asOf })
        : null,
  })
}

async function resolvePublicUser(environment, handle) {
  if (!HANDLE_PATTERN.test(handle)) throw new PublicAtlasNotFoundError()

  const registry = requireNamespace(environment, "MY_ATLAS_REGISTRY").getByName(
    REGISTRY_OBJECT_NAME
  )
  const registration = await registry.getActiveRegistrationByHandle(handle)
  if (!registration?.ok) {
    if (registration?.error === "registration_inconsistent") {
      throw new PublicAtlasServiceError()
    }
    throw new PublicAtlasNotFoundError()
  }

  return requireNamespace(environment, "MY_ATLAS_USERS").getByName(
    registration.userId
  )
}

function publicPlace(record, pin) {
  if (pin.memory !== undefined && !isNormalizedPinMemory(pin.memory)) {
    throw new PublicAtlasServiceError("A public Atlas memory is invalid.")
  }
  let place
  try {
    place = CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
      ? projectCustomPlace(pin.placeId, pin.customPlace)
      : projectCatalogPlace(record)
  } catch {
    throw new PublicAtlasServiceError("A public Atlas place is unavailable.")
  }
  const visitedDates = Array.isArray(pin.visitedDates)
    ? pin.visitedDates
    : (pin.visitedYears || []).map(year => ({ year }))
  return Object.freeze({
    ...place,
    visitedDates: Object.freeze(
      visitedDates.map(date =>
        Object.freeze({
          year: date.year,
          ...(date.month === undefined ? {} : { month: date.month }),
        })
      )
    ),
    visitedYears: Object.freeze([
      ...new Set(visitedDates.map(date => date.year)),
    ]),
    ...(pin.memory ? { memory: pin.memory } : {}),
  })
}

export async function getPublicAtlas({ environment, handle, placeCatalog }) {
  const user = await resolvePublicUser(environment, handle)
  const snapshot = await user.getPublicAtlas()
  if (!snapshot?.ok) {
    if (snapshot?.error === "public_atlas_inconsistent") {
      throw new PublicAtlasServiceError()
    }
    throw new PublicAtlasNotFoundError()
  }

  const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
  const catalogPins = snapshot.pins.filter(
    pin => !CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
  )
  const placeIds = catalogPins.map(pin => pin.placeId)
  const records = placeIds.length
    ? typeof catalog.resolveMany === "function"
      ? await catalog.resolveMany(placeIds)
      : await Promise.all(placeIds.map(placeId => catalog.resolve(placeId)))
    : []
  const recordsByPlaceId = new Map(
    catalogPins.map((pin, index) => [pin.placeId, records[index]])
  )
  const manifest = await catalog.manifest()
  const places = snapshot.pins
    .map(pin => publicPlace(recordsByPlaceId.get(pin.placeId), pin))
    .sort((left, right) => {
      const country = (left.countryName || "").localeCompare(
        right.countryName || ""
      )
      if (country) return country
      return left.name.localeCompare(right.name)
    })

  return Object.freeze({
    schemaVersion: 1,
    atlas: Object.freeze({
      handle: snapshot.profile.handle,
      displayName: snapshot.profile.displayName,
      ...(snapshot.profile.instagramHandle
        ? { instagramHandle: snapshot.profile.instagramHandle }
        : {}),
      favoriteImage: publicAtlasImageMetadata(snapshot.atlasImage),
      places: Object.freeze(places),
    }),
    catalog: Object.freeze({
      revision: manifest.catalogRevision,
      attribution: (() => {
        try {
          return cleanCatalogAttribution(manifest.attribution)
        } catch {
          throw new PublicAtlasServiceError("Catalog attribution is invalid.")
        }
      })(),
    }),
  })
}

export async function getPublicAtlasImage({ environment, handle }) {
  const user = await resolvePublicUser(environment, handle)
  const snapshot = await user.getPublicAtlasImage()
  if (!snapshot?.ok) {
    if (snapshot?.error === "public_atlas_inconsistent") {
      throw new PublicAtlasServiceError()
    }
    throw new PublicAtlasNotFoundError()
  }

  const bucket = environment.MY_ATLAS_MEDIA_R2
  if (!bucket || typeof bucket.get !== "function") {
    throw new PublicAtlasServiceError()
  }
  let object
  try {
    object = await bucket.get(snapshot.atlasImage.storageKey)
  } catch {
    throw new PublicAtlasServiceError()
  }
  if (
    !object ||
    !object.body ||
    object.size !== snapshot.atlasImage.byteLength ||
    object.httpMetadata?.contentType !== "image/webp"
  ) {
    throw new PublicAtlasServiceError()
  }
  return Object.freeze({
    atlasImage: publicAtlasImageMetadata(snapshot.atlasImage),
    object,
  })
}
