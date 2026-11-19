import {
  RegistrationValidationError,
  normalizeDisplayName,
  normalizeIdempotencyKey,
} from "../registration/contracts.mjs"
import { normalizePinMemory } from "./memory.mjs"
import { normalizeCustomPlace } from "./custom-place.mjs"

const PIN_ID_PATTERN = /^pin_[a-f0-9]{24}$/
const USER_ID_PATTERN = /^usr_[0-9a-f-]{36}$/
const COUNTRY_PLACE_ID_PATTERN = /^iso-country:[A-Z]{2}$/
const GEONAMES_PLACE_ID_PATTERN = /^geonames:[1-9][0-9]{0,11}$/
const OFFICIAL_PARK_PLACE_ID_PATTERN =
  /^park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+$/

function cleanString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function assertObject(value, allowedKeys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistrationValidationError(`${name} must be an object.`)
  }
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    throw new RegistrationValidationError(`${name} contains unknown fields.`)
  }
}

export function formatRevisionEtag(revision) {
  return `"rev-${revision}"`
}

export function normalizeExpectedRevision(value) {
  const match = cleanString(value).match(/^"rev-([1-9][0-9]*)"$/)
  if (!match) {
    throw new RegistrationValidationError(
      "A strong If-Match profile revision is required."
    )
  }
  const revision = Number(match[1])
  if (!Number.isSafeInteger(revision)) {
    throw new RegistrationValidationError("Profile revision is invalid.")
  }
  return revision
}

export function normalizePlaceId(value) {
  const placeId = cleanString(value)
  if (
    !COUNTRY_PLACE_ID_PATTERN.test(placeId) &&
    !GEONAMES_PLACE_ID_PATTERN.test(placeId) &&
    !OFFICIAL_PARK_PLACE_ID_PATTERN.test(placeId)
  ) {
    throw new RegistrationValidationError("Canonical place ID is invalid.")
  }
  return placeId
}

export function normalizeVisitedYears(value, currentYear) {
  if (value === undefined) return Object.freeze([])
  if (!Array.isArray(value) || value.length > 100) {
    throw new RegistrationValidationError("Visited years are invalid.")
  }
  const years = [...new Set(value)]
  if (
    years.some(
      year => !Number.isInteger(year) || year < 1900 || year > currentYear
    )
  ) {
    throw new RegistrationValidationError("Visited years are invalid.")
  }
  return Object.freeze(years.sort((left, right) => left - right))
}

export function normalizeVisitedDates(value, currentYear) {
  if (value === undefined) return Object.freeze([])
  if (!Array.isArray(value) || value.length > 100) {
    throw new RegistrationValidationError("Visited dates are invalid.")
  }
  const dates = value.map(date => {
    assertObject(date, new Set(["year", "month"]), "Visited date")
    if (
      !Number.isInteger(date.year) ||
      date.year < 1900 ||
      date.year > currentYear ||
      (date.month !== undefined &&
        (!Number.isInteger(date.month) || date.month < 1 || date.month > 12))
    ) {
      throw new RegistrationValidationError("Visited dates are invalid.")
    }
    return Object.freeze({
      year: date.year,
      ...(date.month === undefined ? {} : { month: date.month }),
    })
  })
  const keys = dates.map(date => `${date.year}:${date.month || 0}`)
  if (new Set(keys).size !== keys.length) {
    throw new RegistrationValidationError("Visited dates are invalid.")
  }
  return Object.freeze(
    [...dates].sort(
      (left, right) =>
        left.year - right.year || (left.month || 0) - (right.month || 0)
    )
  )
}

export function normalizeVisitTiming(value, currentYear) {
  if (value.visitedYears !== undefined && value.visitedDates !== undefined) {
    throw new RegistrationValidationError(
      "Supply visited dates or legacy visited years, not both."
    )
  }
  const visitedDates =
    value.visitedDates === undefined
      ? Object.freeze(
          normalizeVisitedYears(value.visitedYears, currentYear).map(year =>
            Object.freeze({ year })
          )
        )
      : normalizeVisitedDates(value.visitedDates, currentYear)
  const visitedYears = Object.freeze([
    ...new Set(visitedDates.map(date => date.year)),
  ])
  return Object.freeze({ visitedDates, visitedYears })
}

export function normalizeMemory(value) {
  const memory = normalizePinMemory(value)
  if (memory === null) {
    throw new RegistrationValidationError("Favorite memory is invalid.")
  }
  return memory
}

export function normalizeProfilePatch(value, headers) {
  assertObject(value, new Set(["displayName", "public"]), "Profile patch")
  if (Object.keys(value).length === 0) {
    throw new RegistrationValidationError("Profile patch cannot be empty.")
  }
  if (value.public !== undefined && typeof value.public !== "boolean") {
    throw new RegistrationValidationError("Profile visibility is invalid.")
  }
  return Object.freeze({
    patch: Object.freeze({
      ...(value.displayName === undefined
        ? {}
        : { displayName: normalizeDisplayName(value.displayName) }),
      ...(value.public === undefined ? {} : { public: value.public }),
    }),
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizeAtlasImageMutation(headers) {
  return Object.freeze({
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizeCreatePin(value, headers, currentYear) {
  assertObject(
    value,
    new Set([
      "placeId",
      "customPlace",
      "visitedYears",
      "visitedDates",
      "memory",
    ]),
    "Pin"
  )
  const hasPlaceId = value.placeId !== undefined
  const hasCustomPlace = value.customPlace !== undefined
  if (hasPlaceId === hasCustomPlace) {
    throw new RegistrationValidationError(
      "Supply one canonical place or one custom place."
    )
  }
  const customPlace = hasCustomPlace
    ? normalizeCustomPlace(value.customPlace)
    : null
  if (hasCustomPlace && !customPlace) {
    throw new RegistrationValidationError("Custom place is invalid.")
  }
  return Object.freeze({
    ...(hasPlaceId
      ? { placeId: normalizePlaceId(value.placeId) }
      : { customPlace }),
    ...normalizeVisitTiming(value, currentYear),
    memory: normalizeMemory(value.memory === undefined ? "" : value.memory),
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizePatchPin(value, pinId, headers, currentYear) {
  assertObject(
    value,
    new Set(["placeId", "visitedYears", "visitedDates", "memory"]),
    "Pin patch"
  )
  if (Object.keys(value).length === 0) {
    throw new RegistrationValidationError("Pin patch cannot be empty.")
  }
  return Object.freeze({
    pinId: normalizePinId(pinId),
    patch: Object.freeze({
      ...(value.placeId === undefined
        ? {}
        : { placeId: normalizePlaceId(value.placeId) }),
      ...(value.visitedYears === undefined
        ? value.visitedDates === undefined
          ? {}
          : normalizeVisitTiming(value, currentYear)
        : {
            ...normalizeVisitTiming(value, currentYear),
          }),
      ...(value.memory === undefined
        ? {}
        : { memory: normalizeMemory(value.memory) }),
    }),
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizeDeletePin(pinId, headers) {
  return Object.freeze({
    pinId: normalizePinId(pinId),
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizePinId(value) {
  const pinId = cleanString(value)
  if (!PIN_ID_PATTERN.test(pinId)) {
    throw new RegistrationValidationError("Pin ID is invalid.")
  }
  return pinId
}

export function normalizePinQuery(url) {
  const limit = Number(url.searchParams.get("limit") || 50)
  const cursor = cleanString(url.searchParams.get("cursor"))
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RegistrationValidationError(
      "Pin limit must be between 1 and 100."
    )
  }
  if (cursor) normalizePinId(cursor)
  for (const key of url.searchParams.keys()) {
    if (!["limit", "cursor"].includes(key)) {
      throw new RegistrationValidationError(
        "Pin query contains unknown fields."
      )
    }
  }
  return Object.freeze({ limit, cursor })
}

export function normalizeExportQuery(url) {
  const format = cleanString(url.searchParams.get("format")) || "json"
  if (!["json", "csv"].includes(format)) {
    throw new RegistrationValidationError("Export format is invalid.")
  }
  for (const key of url.searchParams.keys()) {
    if (key !== "format") {
      throw new RegistrationValidationError(
        "Export query contains unknown fields."
      )
    }
  }
  return format
}

export function assertUserId(value) {
  if (!USER_ID_PATTERN.test(value)) {
    throw new RegistrationValidationError("User ID is invalid.")
  }
  return value
}
