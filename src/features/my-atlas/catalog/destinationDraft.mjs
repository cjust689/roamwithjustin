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
