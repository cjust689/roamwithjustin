import { normalizeMyAtlasCustomPlace } from "./customPlace.mjs"

export function emptyDestinationDraft() {
  return {
    query: "",
    name: "",
    candidate: null,
    place: null,
    coordinates: null,
    reviewed: false,
  }
}

export function destinationSelection(draft) {
  if (draft?.place?.placeId) return { placeId: draft.place.placeId }
  if (!draft?.reviewed) return null
  const customPlace = normalizeMyAtlasCustomPlace({
    name: draft.name,
    coordinates: draft.coordinates,
  })
  return customPlace ? { customPlace } : null
}

// Shared by private trip endpoints and stays after the destination picker.
export function destinationPlaceSelection(place) {
  if (place?.placeType === "custom") {
    const customPlace = normalizeMyAtlasCustomPlace({
      name: place.name,
      coordinates: place.coordinates,
    })
    return customPlace ? { customPlace } : null
  }
  return place?.placeId ? { placeId: place.placeId } : null
}
