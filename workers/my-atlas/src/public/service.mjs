import { WorkerPlaceCatalog } from "../catalog/store.mjs"
import {
  cleanCatalogAttribution,
  projectCatalogPlace,
} from "../catalog/projection.mjs"
import { REGISTRY_OBJECT_NAME } from "../registration/service.mjs"

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

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

function requireNamespace(environment, name) {
  const namespace = environment[name]
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new PublicAtlasServiceError(`${name} is not bound.`)
  }
  return namespace
}

function publicPlace(record, pin) {
  let place
  try {
    place = projectCatalogPlace(record)
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
  })
}

export async function getPublicAtlas({ environment, handle, placeCatalog }) {
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

  const user = requireNamespace(environment, "MY_ATLAS_USERS").getByName(
    registration.userId
  )
  const snapshot = await user.getPublicAtlas()
  if (!snapshot?.ok) {
    if (snapshot?.error === "public_atlas_inconsistent") {
      throw new PublicAtlasServiceError()
    }
    throw new PublicAtlasNotFoundError()
  }

  const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
  const placeIds = snapshot.pins.map(pin => pin.placeId)
  const records =
    typeof catalog.resolveMany === "function"
      ? await catalog.resolveMany(placeIds)
      : await Promise.all(placeIds.map(placeId => catalog.resolve(placeId)))
  const manifest = await catalog.manifest()
  const places = snapshot.pins
    .map((pin, index) => publicPlace(records[index], pin))
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
