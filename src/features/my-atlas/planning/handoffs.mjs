const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/"
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/"
const EXPEDIA_FLIGHT_SEARCH_URL = "https://www.expedia.com/go/flight/search/oneway/"
const MAX_MAPS_URL_LENGTH = 2048
const MAX_MAPS_WAYPOINTS_PER_LEG = 3
export const MAX_PLAN_DESTINATIONS = 50
export const GOOGLE_MAPS_TRAVEL_MODES = Object.freeze([
  "driving",
  "walking",
  "bicycling",
  "transit",
])
export const ROUTE_HANDOFF_MODES = Object.freeze([
  ...GOOGLE_MAPS_TRAVEL_MODES,
  "fly",
  "ferry",
])

export class MyAtlasHandoffError extends Error {
  constructor(message, code) {
    super(message)
    this.name = "MyAtlasHandoffError"
    this.code = code
  }
}

export function buildExpediaFlightSearchUrl({
  origin,
  destination,
  departureDate,
}) {
  const from = String(origin || "").trim()
  const to = String(destination || "").trim()
  const date = String(departureDate || "").trim()
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new MyAtlasHandoffError(
      "Choose a departure date before opening the flight search.",
      "flight_date_required"
    )
  }
  const parsed = new Date(`${date}T00:00:00Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new MyAtlasHandoffError(
      "The flight departure date is invalid.",
      "invalid_flight_date"
    )
  }
  const url = new URL(`${EXPEDIA_FLIGHT_SEARCH_URL}${date}/${date}`)
  url.searchParams.set("load", "1")
  url.searchParams.set("FromAirport", from)
  url.searchParams.set("ToAirport", to)
  url.searchParams.set("NumAdult", "1")
  return url.toString()
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

function validatedPlanShape(plan) {
  if (
    !plan ||
    !Array.isArray(plan.stops) ||
    plan.stops.length < 1 ||
    plan.stops.length > MAX_PLAN_DESTINATIONS ||
    !["return-to-start", "last-stop", "selected-end"].includes(plan.endMode) ||
    (plan.endMode === "selected-end") !== Boolean(plan.end)
  ) {
    throw new MyAtlasHandoffError("The saved plan is invalid.", "invalid_plan")
  }
  const start = validatedLocation(plan.start)
  const stops = plan.stops.map(validatedLocation)
  const end =
    plan.endMode === "selected-end" ? validatedLocation(plan.end) : null
  return Object.freeze({ start, stops, ...(end ? { end } : {}) })
}

function validatedPlan(plan, { confirmedCoordinatePlaceIds = [] } = {}) {
  const { start, stops, end } = validatedPlanShape(plan)
  const confirmed = new Set(confirmedCoordinatePlaceIds)
  for (const location of [start, ...stops, ...(end ? [end] : [])]) {
    assertRouteReady(location, confirmed)
  }
  return Object.freeze({ start, stops, ...(end ? { end } : {}) })
}

function validatedMapsMode(mode) {
  if (!GOOGLE_MAPS_TRAVEL_MODES.includes(mode)) {
    throw new MyAtlasHandoffError(
      "The selected Google Maps travel mode is invalid.",
      "invalid_travel_mode"
    )
  }
  return mode
}

function mapsUrlForNodes(nodes, mode = "driving") {
  const origin = nodes[0]
  const destination = nodes[nodes.length - 1]
  const waypoints = nodes.slice(1, -1)
  const url = new URL(GOOGLE_MAPS_DIRECTIONS_URL)
  url.searchParams.set("api", "1")
  url.searchParams.set("origin", coordinateText(origin))
  url.searchParams.set("destination", coordinateText(destination))
  url.searchParams.set("travelmode", validatedMapsMode(mode))
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
  const { start, stops, end } = validatedPlan(plan, {
    confirmedCoordinatePlaceIds,
  })
  const nodes = [
    start,
    ...stops,
    ...(plan.endMode === "return-to-start" ? [start] : []),
    ...(plan.endMode === "selected-end" ? [end] : []),
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

export function buildGoogleMapsDirectionsUrl(plan, options = {}) {
  const legs = buildGoogleMapsDirectionsUrls(plan, options)
  if (legs.length !== 1) {
    throw new MyAtlasHandoffError(
      "This plan needs more than one Google Maps directions leg.",
      "multiple_legs"
    )
  }
  return legs[0].url
}

function samePhysicalLocation(first, second) {
  return (
    first.location.placeId === second.location.placeId ||
    (first.location.coordinates[0] === second.location.coordinates[0] &&
      first.location.coordinates[1] === second.location.coordinates[1])
  )
}

function stopPointKey(stop, index) {
  return `stop:${stop.sourceWishId || stop.placeId || index}`
}

export function buildPlanRoutePoints(plan) {
  const { start, stops, end } = validatedPlanShape(plan)
  const stopPoints = stops.map((location, index) =>
    Object.freeze({
      pointKey: stopPointKey(location, index),
      kind: "stop",
      position: index + 1,
      isFinish: plan.endMode === "last-stop" && index === stops.length - 1,
      location,
    })
  )
  return Object.freeze([
    Object.freeze({
      pointKey: "start",
      kind: "start",
      position: 0,
      isFinish: false,
      location: start,
    }),
    ...stopPoints,
    ...(plan.endMode === "return-to-start"
      ? [
          Object.freeze({
            pointKey: "finish",
            kind: "finish",
            position: stops.length + 1,
            isFinish: true,
            location: start,
          }),
        ]
      : []),
    ...(plan.endMode === "selected-end"
      ? [
          Object.freeze({
            pointKey: "finish",
            kind: "finish",
            position: stops.length + 1,
            isFinish: true,
            location: end,
          }),
        ]
      : []),
  ])
}

export function routePairKey(firstPoint, secondPoint) {
  if (!firstPoint?.pointKey || !secondPoint?.pointKey) {
    throw new MyAtlasHandoffError(
      "A route pair is not valid.",
      "invalid_route_pair"
    )
  }
  return `${firstPoint.pointKey}>${secondPoint.pointKey}`
}

function collapsedRoutePoints(points) {
  const collapsed = []
  for (const point of points) {
    const prior = collapsed[collapsed.length - 1]
    if (!prior || !samePhysicalLocation(prior, point)) collapsed.push(point)
  }
  return collapsed
}

export function buildPlanRoutePairs(
  points,
  { defaultMode = "driving", pairModes = {} } = {}
) {
  validatedMapsMode(defaultMode)
  if (!Array.isArray(points)) {
    throw new MyAtlasHandoffError(
      "Route points are invalid.",
      "invalid_route_points"
    )
  }
  const routePoints = collapsedRoutePoints(points)
  const pairs = []
  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const from = routePoints[index]
    const to = routePoints[index + 1]
    const pairKey = routePairKey(from, to)
    const explicit = Object.prototype.hasOwnProperty.call(pairModes, pairKey)
    const mode = explicit ? pairModes[pairKey] : defaultMode
    if (!ROUTE_HANDOFF_MODES.includes(mode)) {
      throw new MyAtlasHandoffError(
        "A route leg travel mode is invalid.",
        "invalid_travel_mode"
      )
    }
    pairs.push(
      Object.freeze({
        pairKey,
        from,
        to,
        mode,
        explicit,
      })
    )
  }
  return Object.freeze({
    routePoints: Object.freeze(routePoints),
    pairs: Object.freeze(pairs),
  })
}

function mapsSearchUrl(point, confirmedCoordinatePlaceIds) {
  const location = validatedLocation(point.location)
  const customCoordinates = location.routeReadiness === "user-coordinate-review"
  if (customCoordinates) {
    assertRouteReady(location, confirmedCoordinatePlaceIds)
  }
  const query = customCoordinates
    ? coordinateText(location)
    : readableLocation(location, false)
  const url = new URL(GOOGLE_MAPS_SEARCH_URL)
  url.searchParams.set("api", "1")
  url.searchParams.set("query", query)
  const result = url.toString()
  if (result.length > MAX_MAPS_URL_LENGTH) {
    throw new MyAtlasHandoffError(
      "This Google Maps search link is too long.",
      "url_too_long"
    )
  }
  return result
}

function directionsActions(nodes, mode, confirmedCoordinatePlaceIds) {
  nodes.forEach(node =>
    assertRouteReady(node.location, confirmedCoordinatePlaceIds)
  )
  const maximumNodesPerLeg = MAX_MAPS_WAYPOINTS_PER_LEG + 2
  const actions = []
  for (let startIndex = 0; startIndex < nodes.length - 1; ) {
    const endIndex = Math.min(
      startIndex + maximumNodesPerLeg - 1,
      nodes.length - 1
    )
    const actionNodes = nodes.slice(startIndex, endIndex + 1)
    actions.push(
      Object.freeze({
        kind: "directions",
        mode,
        url: mapsUrlForNodes(
          actionNodes.map(node => node.location),
          mode
        ),
        origin: actionNodes[0].location.name,
        destination: actionNodes[actionNodes.length - 1].location.name,
        stopCount: actionNodes.length - 1,
        pointKeys: Object.freeze(actionNodes.map(node => node.pointKey)),
      })
    )
    startIndex = endIndex
  }
  return actions
}

export function buildGoogleMapsRouteHandoffs(
  plan,
  {
    includedPointKeys,
    defaultMode = "driving",
    pairModes = {},
    confirmedCoordinatePlaceIds = [],
  } = {}
) {
  const points = buildPlanRoutePoints(plan)
  const included =
    includedPointKeys === undefined ? null : new Set(includedPointKeys)
  const selectedPoints = points.filter(
    point => included === null || included.has(point.pointKey)
  )
  const { routePoints, pairs } = buildPlanRoutePairs(selectedPoints, {
    defaultMode,
    pairModes,
  })
  const confirmed = new Set(confirmedCoordinatePlaceIds)
  const actions = []

  if (routePoints.length === 1) {
    const point = routePoints[0]
    actions.push(
      Object.freeze({
        kind: "search",
        url: mapsSearchUrl(point, confirmed),
        location: point.location.name,
        pointKey: point.pointKey,
      })
    )
  }

  let currentMode = ""
  let currentNodes = []
  const flushDirections = () => {
    if (currentNodes.length > 1) {
      actions.push(...directionsActions(currentNodes, currentMode, confirmed))
    }
    currentMode = ""
    currentNodes = []
  }

  for (const pair of pairs) {
    if (pair.mode === "fly" || pair.mode === "ferry") {
      flushDirections()
      actions.push(
        Object.freeze({
          kind: "boundary",
          mode: pair.mode,
          origin: pair.from.location.name,
          destination: pair.to.location.name,
          pairKey: pair.pairKey,
        })
      )
      continue
    }
    if (currentMode && currentMode !== pair.mode) flushDirections()
    if (!currentMode) {
      currentMode = pair.mode
      currentNodes = [pair.from, pair.to]
    } else {
      currentNodes.push(pair.to)
    }
  }
  flushDirections()

  return Object.freeze({
    points: Object.freeze(selectedPoints),
    routePoints,
    pairs,
    actions: Object.freeze(actions),
  })
}

function readableLocation(location, includeCoordinates) {
  validatedLocation(location)
  const context = [location.admin1Name, location.countryName]
    .filter(Boolean)
    .join(", ")
  const label = context ? `${location.name}, ${context}` : location.name
  return includeCoordinates ? `${label} (${coordinateText(location)})` : label
}

export function buildAiPlanningPrompt(
  plan,
  { includeCoordinates = false, includeNearbySuggestions = false } = {}
) {
  if (
    !plan ||
    !Array.isArray(plan.stops) ||
    plan.stops.length < 1 ||
    plan.stops.length > MAX_PLAN_DESTINATIONS ||
    !["return-to-start", "last-stop", "selected-end"].includes(plan.endMode) ||
    (plan.endMode === "selected-end") !== Boolean(plan.end)
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
      : plan.endMode === "selected-end"
        ? `Finish at ${readableLocation(plan.end, includeCoordinates)}.`
        : `Finish at ${stops[stops.length - 1]}.`
  return [
    "Help me think through a practical driving trip using this chosen order.",
    `Start: ${start}.`,
    "Destinations:",
    ...stops.map((stop, index) => `${index + 1}. ${stop}`),
    finish,
    includeNearbySuggestions
      ? "Suggest a short list of optional stops and activities near this route. Keep them separate from my chosen destinations and explain why each is practical."
      : "Do not add stops or activities unless I ask.",
    "Do not assume this order is fastest. Flag seasonal access, permits, closures, and locations that need an entrance selected. Ask me before adding dates or lodging.",
  ].join("\n")
}
