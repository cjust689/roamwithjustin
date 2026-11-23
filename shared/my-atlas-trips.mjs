import { validStoredExperiences } from "./my-atlas-experiences.mjs"

export const TRIP_SCHEMA_VERSION = 1
export const TRIP_RETENTION_POLICY = "my-atlas-trips-retention-1"
export const TRIP_LIFECYCLES = Object.freeze(["planned", "past"])
export const TRIP_ID_PATTERN = /^(?:trip|plan)_[a-f0-9]{24}$/
export const STOP_ID_PATTERN = /^stop_[a-f0-9]{32}$/
export const MEMORY_ID_PATTERN = /^memory_[a-f0-9]{32}$/
export const MAX_TRIP_STOPS = 50

export class TripContractError extends Error {
  constructor(code) {
    super("The trip change could not be applied.")
    this.code = code
  }
}
const fail = code => {
  throw new TripContractError(code)
}
const plain = value =>
  value !== null && typeof value === "object" && !Array.isArray(value)
const text = (value, max) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[<>\p{Cf}]/u.test(value) &&
  !Array.from(value).some(character => {
    const code = character.codePointAt(0)
    return (
      (code < 32 && ![9, 10, 13].includes(code)) || (code >= 127 && code <= 159)
    )
  })
const instant = value =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value

export function validTripCalendarDate(value) {
  if (value === null) return true
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(value + "T00:00:00.000Z")
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function validTripPlace(place) {
  return Boolean(
    plain(place) &&
      /^(?:iso-country:[A-Z]{2}|geonames:[1-9][0-9]{0,11}|park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+|custom:[a-f0-9]{24})$/.test(
        place.placeId || ""
      ) &&
      ["country", "city", "spot", "custom"].includes(place.placeType) &&
      text(place.name, 240) &&
      place.name.trim() &&
      Array.isArray(place.coordinates) &&
      place.coordinates.length === 2 &&
      place.coordinates.every(Number.isFinite) &&
      Math.abs(place.coordinates[0]) <= 180 &&
      Math.abs(place.coordinates[1]) <= 85.051129
  )
}
export function tripPlaceProjection(place) {
  if (!validTripPlace(place)) fail("invalid_place")
  const fields = [
    "placeId",
    "placeType",
    "name",
    "coordinates",
    "countryCode",
    "countryName",
    "admin1Name",
    "continent",
    "featureCode",
    "spotCategory",
    "spotKind",
    "routeReadiness",
  ]
  return Object.fromEntries(
    fields
      .filter(field => place[field] !== undefined)
      .map(field => [
        field,
        field === "coordinates" ? [...place.coordinates] : place[field],
      ])
  )
}

function validDates(dates) {
  return (
    plain(dates) &&
    validTripCalendarDate(dates.arrival) &&
    validTripCalendarDate(dates.departure) &&
    (!dates.arrival || !dates.departure || dates.arrival <= dates.departure)
  )
}

// Optional private travel endpoints do not create visits or change stop IDs.
export function normalizeTripRouteEndpoints(
  value = { start: null, finish: null }
) {
  if (
    !plain(value) ||
    Object.keys(value).some(key => !["start", "finish"].includes(key))
  )
    fail("invalid_route_endpoints")
  const result = {}
  for (const role of ["start", "finish"]) {
    const endpoint = value[role]
    if (endpoint === null) {
      result[role] = null
      continue
    }
    if (
      !plain(endpoint) ||
      Object.keys(endpoint).some(
        key => !["place", "plannedDates"].includes(key)
      ) ||
      !validTripPlace(endpoint.place) ||
      !validDates(endpoint.plannedDates)
    )
      fail("invalid_route_endpoints")
    result[role] = {
      place: tripPlaceProjection(endpoint.place),
      plannedDates: {
        arrival: endpoint.plannedDates.arrival,
        departure: endpoint.plannedDates.departure,
      },
    }
  }
  const departure =
    result.start?.plannedDates.departure || result.start?.plannedDates.arrival
  const arrival =
    result.finish?.plannedDates.arrival || result.finish?.plannedDates.departure
  if (departure && arrival && departure > arrival)
    fail("invalid_route_endpoints")
  return result
}
function validLegacyDates(dates) {
  return (
    Array.isArray(dates) &&
    dates.every(
      date =>
        plain(date) &&
        Number.isInteger(date.year) &&
        date.year >= 1900 &&
        date.year <= 2200 &&
        (date.month === undefined ||
          (Number.isInteger(date.month) && date.month >= 1 && date.month <= 12))
    )
  )
}

export function assertCanonicalTrip(trip) {
  if (
    !plain(trip) ||
    trip.schemaVersion !== TRIP_SCHEMA_VERSION ||
    !TRIP_ID_PATTERN.test(trip.tripId || "") ||
    !TRIP_LIFECYCLES.includes(trip.lifecycle) ||
    !["draft", "saved", "archived"].includes(trip.workflow) ||
    !text(trip.title, 240) ||
    !trip.title.trim() ||
    !text(trip.description, 8000) ||
    !Number.isInteger(trip.version) ||
    trip.version < 1 ||
    !instant(trip.createdAt) ||
    !instant(trip.updatedAt) ||
    !(trip.statusChangedAt === null || instant(trip.statusChangedAt))
  )
    fail("invalid_trip")
  if (
    !Array.isArray(trip.stops) ||
    trip.stops.length > MAX_TRIP_STOPS ||
    (trip.workflow !== "draft" && !trip.stops.length) ||
    !Array.isArray(trip.memories)
  )
    fail("invalid_stops")
  const ids = new Set(),
    memoryIds = new Set()
  const checkMemories = memories => {
    if (!Array.isArray(memories) || memories.length > 100)
      fail("invalid_memories")
    for (const memory of memories) {
      if (
        !plain(memory) ||
        !MEMORY_ID_PATTERN.test(memory.memoryId || "") ||
        memoryIds.has(memory.memoryId) ||
        !["note", "highlight", "photo", "video"].includes(memory.kind) ||
        !text(memory.text, 8000) ||
        !(
          memory.mediaId === null ||
          (text(memory.mediaId, 120) && memory.mediaId.trim())
        ) ||
        (["photo", "video"].includes(memory.kind) && !memory.mediaId) ||
        !instant(memory.createdAt) ||
        !instant(memory.updatedAt)
      )
        fail("invalid_memory")
      memoryIds.add(memory.memoryId)
    }
  }
  checkMemories(trip.memories)
  for (const stop of trip.stops) {
    if (
      !plain(stop) ||
      !STOP_ID_PATTERN.test(stop.stopId || "") ||
      ids.has(stop.stopId) ||
      !validTripPlace(stop.place) ||
      !validDates(stop.plannedDates) ||
      !validDates(stop.actualDates) ||
      !validLegacyDates(stop.visitedDates) ||
      !text(stop.planNote, 8000) ||
      !validStoredExperiences(stop.experiences) ||
      !instant(stop.createdAt) ||
      !instant(stop.updatedAt)
    )
      fail("invalid_stop")
    ids.add(stop.stopId)
    checkMemories(stop.memories)
  }
  if (
    !plain(trip.logistics) ||
    !Array.isArray(trip.logistics.flights) ||
    !Array.isArray(trip.logistics.rentals) ||
    !plain(trip.sharing) ||
    typeof trip.sharing.publicAtlas !== "boolean"
  )
    fail("invalid_trip_details")
  if (trip.routeEndpoints !== undefined)
    normalizeTripRouteEndpoints(trip.routeEndpoints)
  return trip
}

function precondition(trip, { expectedVersion, now }) {
  assertCanonicalTrip(trip)
  if (trip.version !== expectedVersion) fail("revision_conflict")
  if (!instant(now)) fail("invalid_time")
}

export function transitionTripLifecycle(trip, lifecycle, options) {
  precondition(trip, options)
  if (!TRIP_LIFECYCLES.includes(lifecycle)) fail("invalid_lifecycle")
  if (trip.lifecycle === lifecycle) return trip
  // The lifecycle is independent of dates and never recreates stops or memories.
  return {
    ...trip,
    lifecycle,
    version: trip.version + 1,
    updatedAt: options.now,
    statusChangedAt: options.now,
  }
}

export function reorderTripStops(trip, stopIds, options) {
  precondition(trip, options)
  if (
    !Array.isArray(stopIds) ||
    stopIds.length !== trip.stops.length ||
    new Set(stopIds).size !== stopIds.length ||
    stopIds.some(id => !trip.stops.some(stop => stop.stopId === id))
  )
    fail("invalid_stop_order")
  if (stopIds.every((id, index) => trip.stops[index].stopId === id)) return trip
  return {
    ...trip,
    stops: stopIds.map(id => trip.stops.find(stop => stop.stopId === id)),
    version: trip.version + 1,
    updatedAt: options.now,
  }
}

export function removeEmptyTripStop(trip, stopId, options) {
  precondition(trip, options)
  const stop = trip.stops.find(stop => stop.stopId === stopId)
  if (!stop) fail("stop_not_found")
  if (
    stop.memories.length ||
    stop.experiences?.length ||
    stop.planNote ||
    stop.visitedDates.length
  )
    fail("stop_has_content")
  if (trip.stops.length === 1 && trip.workflow !== "draft")
    fail("trip_needs_stop")
  return {
    ...trip,
    stops: trip.stops.filter(stop => stop.stopId !== stopId),
    version: trip.version + 1,
    updatedAt: options.now,
  }
}

export function buildCanonicalTripMapRoute(trip) {
  assertCanonicalTrip(trip)
  const route = trip.stops.map((stop, index) => ({
    key: stop.stopId,
    role: "stop",
    label: String(index + 1),
    location: { ...stop.place, coordinates: [...stop.place.coordinates] },
  }))
  if (trip.routeEndpoints?.start)
    route.unshift({
      key: "trip-start",
      role: "start",
      label: "S",
      location: tripPlaceProjection(trip.routeEndpoints.start.place),
    })
  if (trip.routeEndpoints?.finish)
    route.push({
      key: "trip-finish",
      role: "finish",
      label: "F",
      location: tripPlaceProjection(trip.routeEndpoints.finish.place),
    })
  return route
}
