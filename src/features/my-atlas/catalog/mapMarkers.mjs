import {
  buildAtlasMarkerGroups,
  atlasMarkerClusterMaxZoom,
  atlasMarkerClusterRadius,
  atlasMarkerCompactClusterRadius,
} from "../../atlas/config/markerLayout.mjs"

export function groupMyAtlasRouteMarkers(
  route,
  {
    zoom,
    project,
    selectedPlaceId = "",
    selectedCoordinates = null,
    compact = false,
  }
) {
  const locations = new Map()
  for (const node of route) {
    const coordinates = node.location?.coordinates
    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !coordinates.every(Number.isFinite)
    )
      continue
    const id = coordinates.join(",")
    const location = locations.get(id) || { id, coordinates, nodes: [] }
    location.nodes.push(node)
    locations.set(id, location)
  }
  const markers = [...locations.values()].map(location => ({
    ...location,
    name: [...new Set(location.nodes.map(node => node.location.name))].join(
      " / "
    ),
  }))
  const selectedId = selectedCoordinates
    ? selectedCoordinates.join(",")
    : selectedPlaceId
      ? markers.find(marker =>
          marker.nodes.some(node => node.location.placeId === selectedPlaceId)
        )?.id || ""
      : ""
  return buildAtlasMarkerGroups(markers, {
    zoom,
    project,
    selectedId,
    clusterMaxZoom: atlasMarkerClusterMaxZoom,
    clusterRadius: compact
      ? atlasMarkerCompactClusterRadius
      : atlasMarkerClusterRadius,
  })
}
