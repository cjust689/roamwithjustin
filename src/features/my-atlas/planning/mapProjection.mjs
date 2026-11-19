function hasCoordinates(location) {
  return Boolean(
    location &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length === 2 &&
      location.coordinates.every(Number.isFinite)
  )
}

function sameCoordinates(left, right) {
  return Boolean(
    hasCoordinates(left) &&
      hasCoordinates(right) &&
      left.coordinates[0] === right.coordinates[0] &&
      left.coordinates[1] === right.coordinates[1]
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

export function buildPlannerMapSegments(route = []) {
  if (!Array.isArray(route)) return Object.freeze([])

  const physicalNodes = []
  route.forEach(node => {
    if (!hasCoordinates(node?.location)) return
    const previous = physicalNodes[physicalNodes.length - 1]
    if (previous && sameCoordinates(previous.location, node.location)) {
      previous.roles.add(node.role)
      return
    }
    physicalNodes.push({
      location: node.location,
      roles: new Set([node.role]),
    })
  })

  const start = physicalNodes.find(node => node.roles.has("start"))
  return Object.freeze(
    physicalNodes.slice(0, -1).map((node, index) => {
      const next = physicalNodes[index + 1]
      const isFinalSegment = index === physicalNodes.length - 2
      let kind = node.roles.has("start") ? "departure" : "route"
      if (isFinalSegment && next.roles.has("finish")) {
        kind = sameCoordinates(start?.location, next.location)
          ? "return"
          : "finish"
      }
      return Object.freeze({
        key: `segment:${index}`,
        kind,
        from: node.location,
        to: next.location,
      })
    })
  )
}
