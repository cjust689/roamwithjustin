const SHARED_TRIP_VERSION = 1
const MAX_SHARED_STOPS = 50
const MAX_SHARED_VALUE_LENGTH = 12000

export class SharedTripError extends Error {
  constructor(message, code = "invalid_shared_trip") {
    super(message)
    this.name = "SharedTripError"
    this.code = code
  }
}

function normalizedText(value, maximum = 120) {
  if (typeof value !== "string") return ""
  return value.trim().replace(/\s+/g, " ").slice(0, maximum)
}

function sharedLocation(value) {
  const name = normalizedText(value?.name, 120)
  const coordinates = Array.isArray(value?.coordinates)
    ? [...value.coordinates]
    : []
  if (
    !name ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    coordinates[0] < -180 ||
    coordinates[0] > 180 ||
    coordinates[1] < -85.051129 ||
    coordinates[1] > 85.051129
  ) {
    throw new SharedTripError("A shared trip location is invalid.")
  }
  return Object.freeze({
    name,
    admin1Name: normalizedText(value.admin1Name, 80),
    countryName: normalizedText(value.countryName, 80),
    coordinates: Object.freeze(coordinates),
    routeReadiness: normalizedText(value.routeReadiness, 40),
  })
}

export function sharedTripSnapshot(plan) {
  if (plan?.version === 2 || (plan?.schemaVersion === 1 && plan?.tripId)) {
    if (
      !["planned", "past"].includes(plan.lifecycle) ||
      !Array.isArray(plan.stops) ||
      plan.stops.length < 1 ||
      plan.stops.length > MAX_SHARED_STOPS
    )
      throw new SharedTripError("The saved trip cannot be shared.")
    return Object.freeze({
      version: 2,
      title: normalizedText(plan.title, 80) || "Shared trip",
      lifecycle: plan.lifecycle,
      stops: Object.freeze(
        plan.stops.map(stop => sharedLocation(stop.place || stop))
      ),
    })
  }
  if (
    !plan ||
    !Array.isArray(plan.stops) ||
    plan.stops.length < 1 ||
    plan.stops.length > MAX_SHARED_STOPS ||
    !["return-to-start", "last-stop", "selected-end"].includes(plan.endMode) ||
    (plan.endMode === "selected-end") !== Boolean(plan.end)
  ) {
    throw new SharedTripError("The saved trip cannot be shared.")
  }
  const desiredYear = Number(plan.desiredYear)
  return Object.freeze({
    version: SHARED_TRIP_VERSION,
    title: normalizedText(plan.title, 80) || "Shared trip",
    desiredYear:
      Number.isInteger(desiredYear) &&
      desiredYear >= 1900 &&
      desiredYear <= 2200
        ? desiredYear
        : null,
    start: sharedLocation(plan.start),
    stops: Object.freeze(plan.stops.map(sharedLocation)),
    endMode: plan.endMode,
    ...(plan.endMode === "selected-end"
      ? { end: sharedLocation(plan.end) }
      : {}),
  })
}

function bytesToBase64Url(bytes) {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlToBytes(value) {
  if (
    !/^[A-Za-z0-9_-]+$/.test(value) ||
    value.length > MAX_SHARED_VALUE_LENGTH
  ) {
    throw new SharedTripError("The shared trip link is invalid.")
  }
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=")
  let binary
  try {
    binary = atob(padded)
  } catch {
    throw new SharedTripError("The shared trip link is invalid.")
  }
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export function encodeSharedTrip(plan) {
  const value = JSON.stringify(sharedTripSnapshot(plan))
  const encoded = bytesToBase64Url(new TextEncoder().encode(value))
  if (encoded.length > MAX_SHARED_VALUE_LENGTH)
    throw new SharedTripError(
      "This trip is too large for a shared link.",
      "shared_trip_too_large"
    )
  return encoded
}

export function decodeSharedTrip(value) {
  let parsed
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        base64UrlToBytes(String(value || ""))
      )
    )
  } catch (error) {
    if (error instanceof SharedTripError) throw error
    throw new SharedTripError("The shared trip link is invalid.")
  }
  if (![SHARED_TRIP_VERSION, 2].includes(parsed?.version)) {
    throw new SharedTripError("This shared trip version is not supported.")
  }
  return sharedTripSnapshot(parsed)
}

export function buildSharedTripUrl(plan, origin = window.location.origin) {
  return `${String(origin).replace(/\/$/, "")}/my-atlas/trip/${encodeSharedTrip(plan)}`
}
