export const MY_ATLAS_PLACE_TYPES = Object.freeze(["country", "city", "spot"])

export function isMyAtlasPlaceType(value) {
  return MY_ATLAS_PLACE_TYPES.includes(value)
}

export function formatPlaceTypeLabel(place) {
  if (place?.placeType === "spot") return place.spotKind || "Spot"
  if (place?.placeType === "country") return "Country"
  if (place?.placeType === "city") return "City"
  return "Place"
}
