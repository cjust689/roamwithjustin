function hasCoordinates(location) {
  return Boolean(
    location &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length === 2 &&
      location.coordinates.every(Number.isFinite)
  )
}

function routeNode({ key, role, label, location }) {
  if (!hasCoordinates(location)) return null
  return Object.freeze({
    key,
    role,
    label,
    location: Object.freeze({
      placeId: location.placeId || "",
      placeType: location.placeType || "",
      name: location.name || "Destination",
      countryCode: location.countryCode || "",
      admin1Name: location.admin1Name || "",
      countryName: location.countryName || "",
      routeReadiness: location.routeReadiness || "",
      coordinates: Object.freeze([...location.coordinates]),
    }),
  })
}

export function buildPlannerMapRoute({
  start = null,
  stops = [],
  endMode = "last-stop",
  end = null,
} = {}) {
  const route = []
  const startNode = routeNode({
    key: "start",
    role: "start",
    label: "S",
    location: start,
  })
  if (startNode) route.push(startNode)

  stops.forEach((location, index) => {
    const stopNode = routeNode({
      key: `stop:${index}`,
      role: "stop",
      label: String(index + 1),
      location,
    })
    if (stopNode) route.push(stopNode)
  })

  const finishLocation =
    endMode === "selected-end"
      ? end
      : endMode === "return-to-start"
        ? start
        : stops[stops.length - 1]
  const finishNode = routeNode({
    key: "finish",
    role: "finish",
    label: "F",
    location: finishLocation,
  })
  if (finishNode) route.push(finishNode)

  return Object.freeze(route)
}
