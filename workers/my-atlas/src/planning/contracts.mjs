import {
  RegistrationValidationError,
  normalizeIdempotencyKey,
} from "../registration/contracts.mjs"
import {
  normalizeExpectedRevision,
  normalizePlaceId,
} from "../account/contracts.mjs"
import { normalizePinMemory } from "../account/memory.mjs"
import { normalizeCustomPlace } from "../account/custom-place.mjs"
import { MAX_PLAN_DESTINATIONS } from "./constants.mjs"

export const WISH_ID_PATTERN = /^wish_[a-f0-9]{24}$/
export const PLAN_ID_PATTERN = /^plan_[a-f0-9]{24}$/
export const WISH_PRIORITIES = Object.freeze(["low", "normal", "high"])
export const PLAN_STATUSES = Object.freeze(["draft", "saved", "archived"])
export const PLAN_END_MODES = Object.freeze(["return-to-start", "last-stop"])

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

function normalizedShortText(value, name, { required = false, maximum = 255 } = {}) {
  if (value === undefined && !required) return ""
  const normalized = normalizePinMemory(value)
  if (
    normalized === null ||
    (required && !normalized) ||
    Array.from(normalized).length > maximum
  ) {
    throw new RegistrationValidationError(`${name} is invalid.`)
  }
  return normalized
}

function normalizePriority(value) {
  const priority = value === undefined ? "normal" : cleanString(value)
  if (!WISH_PRIORITIES.includes(priority)) {
    throw new RegistrationValidationError("Wishlist priority is invalid.")
  }
  return priority
}

function normalizeDesiredYear(value, currentYear) {
  if (value === undefined || value === null || value === "") return null
  if (
    !Number.isInteger(value) ||
    value < currentYear ||
    value > currentYear + 20
  ) {
    throw new RegistrationValidationError("Desired travel year is invalid.")
  }
  return value
}

function mutationHeaders(headers) {
  return Object.freeze({
    expectedRevision: normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey: normalizeIdempotencyKey(headers.get("Idempotency-Key")),
  })
}

export function normalizeWishId(value) {
  const wishId = cleanString(value)
  if (!WISH_ID_PATTERN.test(wishId)) {
    throw new RegistrationValidationError("Wishlist ID is invalid.")
  }
  return wishId
}

export function normalizePlanId(value) {
  const planId = cleanString(value)
  if (!PLAN_ID_PATTERN.test(planId)) {
    throw new RegistrationValidationError("Plan ID is invalid.")
  }
  return planId
}

export function normalizeCreateWish(value, headers, currentYear) {
  assertObject(
    value,
    new Set(["placeId", "customPlace", "note", "priority", "desiredYear"]),
    "Wishlist item"
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
    note: normalizedShortText(value.note, "Wishlist note"),
    priority: normalizePriority(value.priority),
    desiredYear: normalizeDesiredYear(value.desiredYear, currentYear),
    ...mutationHeaders(headers),
  })
}

export function normalizePatchWish(value, wishId, headers, currentYear) {
  assertObject(
    value,
    new Set(["note", "priority", "desiredYear"]),
    "Wishlist item patch"
  )
  if (!Object.keys(value).length) {
    throw new RegistrationValidationError("Wishlist item patch cannot be empty.")
  }
  return Object.freeze({
    wishId: normalizeWishId(wishId),
    patch: Object.freeze({
      ...(value.note === undefined
        ? {}
        : { note: normalizedShortText(value.note, "Wishlist note") }),
      ...(value.priority === undefined
        ? {}
        : { priority: normalizePriority(value.priority) }),
      ...(value.desiredYear === undefined
        ? {}
        : { desiredYear: normalizeDesiredYear(value.desiredYear, currentYear) }),
    }),
    ...mutationHeaders(headers),
  })
}

export function normalizeDeleteWish(wishId, headers) {
  return Object.freeze({
    wishId: normalizeWishId(wishId),
    ...mutationHeaders(headers),
  })
}

export function normalizeWishQuery(url) {
  const limit = Number(url.searchParams.get("limit") || 50)
  const cursor = cleanString(url.searchParams.get("cursor"))
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RegistrationValidationError(
      "Wishlist limit must be between 1 and 100."
    )
  }
  if (cursor) normalizeWishId(cursor)
  for (const key of url.searchParams.keys()) {
    if (!["limit", "cursor"].includes(key)) {
      throw new RegistrationValidationError(
        "Wishlist query contains unknown fields."
      )
    }
  }
  return Object.freeze({ limit, cursor })
}

function normalizePlanBody(value, headers, currentYear) {
  assertObject(
    value,
    new Set([
      "title",
      "status",
      "desiredYear",
      "note",
      "startWishId",
      "stopWishIds",
      "endMode",
    ]),
    "Trip plan"
  )
  const title = normalizedShortText(value.title, "Plan title", {
    required: true,
    maximum: 80,
  })
  const status = cleanString(value.status || "saved")
  if (!PLAN_STATUSES.includes(status)) {
    throw new RegistrationValidationError("Plan status is invalid.")
  }
  const startWishId = normalizeWishId(value.startWishId)
  if (
    !Array.isArray(value.stopWishIds) ||
    value.stopWishIds.length < 1 ||
    value.stopWishIds.length > MAX_PLAN_DESTINATIONS
  ) {
    throw new RegistrationValidationError(
      `A plan requires between one and ${MAX_PLAN_DESTINATIONS} destinations.`
    )
  }
  const stopWishIds = value.stopWishIds.map(normalizeWishId)
  if (new Set(stopWishIds).size !== stopWishIds.length) {
    throw new RegistrationValidationError("Plan destinations must be unique.")
  }
  const endMode = cleanString(value.endMode || "last-stop")
  if (!PLAN_END_MODES.includes(endMode)) {
    throw new RegistrationValidationError("Plan end mode is invalid.")
  }
  return Object.freeze({
    title,
    status,
    desiredYear: normalizeDesiredYear(value.desiredYear, currentYear),
    note: normalizedShortText(value.note, "Plan note"),
    startWishId,
    stopWishIds: Object.freeze(stopWishIds),
    endMode,
    ...mutationHeaders(headers),
  })
}

export function normalizeCreatePlan(value, headers, currentYear) {
  return normalizePlanBody(value, headers, currentYear)
}

export function normalizeReplacePlan(value, planId, headers, currentYear) {
  return Object.freeze({
    planId: normalizePlanId(planId),
    ...normalizePlanBody(value, headers, currentYear),
  })
}

export function normalizePlanMutation(planId, headers) {
  return Object.freeze({
    planId: normalizePlanId(planId),
    ...mutationHeaders(headers),
  })
}

export function normalizeDeleteAccount(value, headers) {
  assertObject(value, new Set(["confirmation"]), "Account deletion")
  if (value.confirmation !== "DELETE MY ATLAS") {
    throw new RegistrationValidationError(
      "Account deletion confirmation is invalid."
    )
  }
  return Object.freeze({
    confirmation: value.confirmation,
    ...mutationHeaders(headers),
  })
}
