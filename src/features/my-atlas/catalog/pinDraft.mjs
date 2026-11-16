import { resolveCatalogPlace } from "./search.mjs"

export const MY_ATLAS_PIN_LIMIT = 300

function pinError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function addDraftPin(
  pins,
  placeId,
  catalog,
  { limit = MY_ATLAS_PIN_LIMIT } = {}
) {
  const currentPins = Array.isArray(pins) ? pins : []
  const place = resolveCatalogPlace(catalog, placeId)

  if (!place || !["city", "country"].includes(place.placeType)) {
    throw pinError("unsupported_place", "Choose a supported catalog place.")
  }
  if (place.deprecated) {
    throw pinError(
      "deprecated_place",
      "This catalog place remains resolvable but cannot be newly pinned."
    )
  }
  if (currentPins.some(pin => pin.placeId === placeId)) {
    throw pinError("duplicate_pin", "That place is already pinned.")
  }
  if (currentPins.length >= limit) {
    throw pinError("pin_limit", "The beta destination limit has been reached.")
  }

  return [...currentPins, { placeId }]
}

export function removeDraftPin(pins, placeId) {
  return (Array.isArray(pins) ? pins : []).filter(
    pin => pin.placeId !== placeId
  )
}
