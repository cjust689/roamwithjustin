import { createIdRegistry } from "../contracts.mjs"
import { placeAliases } from "./aliases.mjs"
import { puertoRicoPlaces } from "./puerto-rico.mjs"
import { upcomingPlaces } from "./upcoming.mjs"
import { usviPlaces } from "./usvi.mjs"
import { utahPlaces } from "./utah.mjs"

const registry = createIdRegistry(
  [...utahPlaces, ...puertoRicoPlaces, ...usviPlaces, ...upcomingPlaces],
  "Place registry"
)

export const placeRecords = registry.records
export const placesById = registry.byId

// Resolve aliases once at this boundary so components and future Experience
// selectors never need to understand historical IDs.
export function resolvePlaceId(id) {
  if (!id) return null
  if (placesById[id]) return id
  return placeAliases[id] || null
}

export function getPlace(id) {
  const canonicalId = resolvePlaceId(id)
  return canonicalId ? placesById[canonicalId] || null : null
}
