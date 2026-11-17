export function shouldShowMyAtlasMapMemory(
  place,
  { selectedPlaceId = "", showAll = false } = {}
) {
  return Boolean(
    place?.memory && (showAll || place.placeId === selectedPlaceId)
  )
}
