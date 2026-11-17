export const MY_ATLAS_PLACE_TYPES = Object.freeze([
  "country",
  "city",
  "spot",
  "custom",
])

export function isMyAtlasPlaceType(value) {
  return MY_ATLAS_PLACE_TYPES.includes(value)
}

export function formatPlaceTypeLabel(place) {
  if (place?.placeType === "spot") return place.spotKind || "Spot"
  if (place?.placeType === "country") return "Country"
  if (place?.placeType === "city") return "City"
  if (place?.placeType === "custom") return "Custom pin"
  return "Place"
}
