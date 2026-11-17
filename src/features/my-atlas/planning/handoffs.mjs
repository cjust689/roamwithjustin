const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/"
const MAX_MAPS_URL_LENGTH = 2048
const MAX_MAPS_WAYPOINTS_PER_LEG = 3
export const MAX_PLAN_DESTINATIONS = 50

export class MyAtlasHandoffError extends Error {
  constructor(message, code) {
    super(message)
    this.name = "MyAtlasHandoffError"
    this.code = code
  }
}

function validatedLocation(value) {
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    !Array.isArray(value.coordinates) ||
    value.coordinates.length !== 2 ||
    !value.coordinates.every(Number.isFinite) ||
    value.coordinates[0] < -180 ||
    value.coordinates[0] > 180 ||
    value.coordinates[1] < -85.051129 ||
    value.coordinates[1] > 85.051129
  ) {
    throw new MyAtlasHandoffError(
      "A plan location is not valid for handoff.",
      "invalid_location"
    )
  }
  return value
}

function coordinateText(value) {
  const location = validatedLocation(value)
  return `${location.coordinates[1]},${location.coordinates[0]}`
}

function assertRouteReady(location, confirmedCoordinatePlaceIds) {
  if (location.routeReadiness === "route-ready") return
  if (
    location.routeReadiness === "user-coordinate-review" &&
    confirmedCoordinatePlaceIds.has(location.placeId)
  ) {
    return
  }
  throw new MyAtlasHandoffError(
    location.routeReadiness === "needs-entrance-selection"
      ? `${location.name} needs a useful entrance or city before directions can open.`
      : `${location.name} needs coordinate confirmation before directions can open.`,
    location.routeReadiness || "route_not_ready"
  )
}

function validatedPlan(
  plan,
  { confirmedCoordinatePlaceIds = [] } = {}
) {
  if (
    !plan ||
    !Array.isArray(plan.stops) ||
    plan.stops.length < 1 ||
    plan.stops.length > MAX_PLAN_DESTINATIONS ||
    !["return-to-start", "last-stop"].includes(plan.endMode)
  ) {
    throw new MyAtlasHandoffError("The saved plan is invalid.", "invalid_plan")
  }
  const confirmed = new Set(confirmedCoordinatePlaceIds)
  const start = validatedLocation(plan.start)
  const stops = plan.stops.map(validatedLocation)
  for (const location of [start, ...stops]) {
    assertRouteReady(location, confirmed)
  }
  return Object.freeze({ start, stops })
}

function mapsUrlForNodes(nodes) {
  const origin = nodes[0]
  const destination = nodes[nodes.length - 1]
  const waypoints = nodes.slice(1, -1)
  const url = new URL(GOOGLE_MAPS_DIRECTIONS_URL)
  url.searchParams.set("api", "1")
  url.searchParams.set("origin", coordinateText(origin))
  url.searchParams.set("destination", coordinateText(destination))
  url.searchParams.set("travelmode", "driving")
  if (waypoints.length) {
    url.searchParams.set("waypoints", waypoints.map(coordinateText).join("|"))
  }
  const result = url.toString()
  if (result.length > MAX_MAPS_URL_LENGTH) {
    throw new MyAtlasHandoffError(
      "This directions link is too long and needs to be split into legs.",
      "url_too_long"
    )
  }
  return result
}

export function buildGoogleMapsDirectionsUrls(
  plan,
  { confirmedCoordinatePlaceIds = [] } = {}
) {
  const { start, stops } = validatedPlan(plan, {
    confirmedCoordinatePlaceIds,
  })
  const nodes = [
    start,
    ...stops,
    ...(plan.endMode === "return-to-start" ? [start] : []),
  ]
  const maximumNodesPerLeg = MAX_MAPS_WAYPOINTS_PER_LEG + 2
  const legs = []
  for (let startIndex = 0; startIndex < nodes.length - 1; ) {
    const endIndex = Math.min(
      startIndex + maximumNodesPerLeg - 1,
      nodes.length - 1
    )
    const legNodes = nodes.slice(startIndex, endIndex + 1)
    legs.push(
      Object.freeze({
        url: mapsUrlForNodes(legNodes),
        origin: legNodes[0].name,
        destination: legNodes[legNodes.length - 1].name,
        stopCount: legNodes.length - 1,
      })
    )
    startIndex = endIndex
  }
  return Object.freeze(legs)
}

export function buildGoogleMapsDirectionsUrl(
  plan,
  options = {}
) {
  const legs = buildGoogleMapsDirectionsUrls(plan, options)
  if (legs.length !== 1) {
    throw new MyAtlasHandoffError(
      "This plan needs more than one Google Maps directions leg.",
      "multiple_legs"
    )
  }
  return legs[0].url
}

function readableLocation(location, includeCoordinates) {
  validatedLocation(location)
  const context = [location.admin1Name, location.countryName]
    .filter(Boolean)
    .join(", ")
  const label = context ? `${location.name}, ${context}` : location.name
  return includeCoordinates ? `${label} (${coordinateText(location)})` : label
}

export function buildAiPlanningPrompt(plan, { includeCoordinates = false } = {}) {
  if (
    !plan ||
    !Array.isArray(plan.stops) ||
    plan.stops.length < 1 ||
    plan.stops.length > MAX_PLAN_DESTINATIONS ||
    !["return-to-start", "last-stop"].includes(plan.endMode)
  ) {
    throw new MyAtlasHandoffError("The saved plan is invalid.", "invalid_plan")
  }
  const start = readableLocation(plan.start, includeCoordinates)
  const stops = plan.stops.map(location =>
    readableLocation(location, includeCoordinates)
  )
  const finish =
    plan.endMode === "return-to-start"
      ? `Return to ${start}.`
      : `Finish at ${stops[stops.length - 1]}.`
  return [
    "Help me think through a practical driving trip using this chosen order.",
    `Start: ${start}.`,
    "Destinations:",
    ...stops.map((stop, index) => `${index + 1}. ${stop}`),
    finish,
    "Do not assume this order is fastest. Flag seasonal access, permits, closures, and locations that need an entrance selected. Ask me before adding dates, lodging, or activities.",
  ].join("\n")
}
