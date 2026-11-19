import { isMyAtlasPlaceType } from "../catalog/placeTypes.mjs"
import {
  isNormalizedMyAtlasMemory,
  normalizeMyAtlasMemory,
} from "../catalog/memory.mjs"
import {
  MY_ATLAS_CUSTOM_PLACE_ID_PATTERN,
  isNormalizedMyAtlasCustomPlace,
  normalizeMyAtlasCustomPlace,
} from "../catalog/customPlace.mjs"

export class MyAtlasApiError extends Error {
  constructor(
    message,
    { status = 0, code = "request_failed", requestId = "" } = {}
  ) {
    super(message)
    this.name = "MyAtlasApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

const PUBLIC_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const CATALOG_PLACE_ID_PATTERN =
  /^(?:iso-country:[A-Z]{2}|geonames:[1-9][0-9]{0,11}|park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+)$/

function isVisitedDate(value) {
  return Boolean(
    value &&
      Number.isInteger(value.year) &&
      value.year >= 1900 &&
      (value.month === undefined ||
        (Number.isInteger(value.month) &&
          value.month >= 1 &&
          value.month <= 12))
  )
}

function normalizedPin(value) {
  const visitedDates = Array.isArray(value.visitedDates)
    ? value.visitedDates
    : Array.isArray(value.visitedYears)
      ? value.visitedYears.map(year => ({ year }))
      : []
  return Object.freeze({
    ...value,
    memory: typeof value.memory === "string" ? value.memory : "",
    visitedDates: Object.freeze(
      visitedDates.map(date => Object.freeze({ ...date }))
    ),
    visitedYears: Object.freeze([
      ...new Set(visitedDates.map(date => date.year)),
    ]),
  })
}

function isPublicPlace(value) {
  const visitedDates = Array.isArray(value?.visitedDates)
    ? value.visitedDates
    : Array.isArray(value?.visitedYears)
      ? value.visitedYears.map(year => ({ year }))
      : null
  const customPlaceIsValid =
    value?.placeType === "custom"
      ? MY_ATLAS_CUSTOM_PLACE_ID_PATTERN.test(value.placeId) &&
        isNormalizedMyAtlasCustomPlace({
          name: value.name,
          coordinates: value.coordinates,
        })
      : CATALOG_PLACE_ID_PATTERN.test(value?.placeId || "")
  return Boolean(
    value &&
      typeof value.placeId === "string" &&
      isMyAtlasPlaceType(value.placeType) &&
      typeof value.name === "string" &&
      Array.isArray(value.coordinates) &&
      value.coordinates.length === 2 &&
      value.coordinates.every(Number.isFinite) &&
      customPlaceIsValid &&
      (value.memory === undefined || isNormalizedMyAtlasMemory(value.memory)) &&
      visitedDates &&
      visitedDates.every(isVisitedDate)
  )
}

function revisionFromResponse(response, fallback = 0) {
  const match = response.headers.get("ETag")?.match(/^"rev-([1-9][0-9]*)"$/)
  const revision = match ? Number(match[1]) : Number(fallback)
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new MyAtlasApiError("The My Atlas revision is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return revision
}

async function authenticatedJsonRequest({
  apiBaseUrl,
  accessToken,
  path,
  method = "GET",
  body,
  revision,
  idempotencyKey,
  fetchImpl = fetch,
}) {
  if (!apiBaseUrl || typeof accessToken !== "string" || !accessToken) {
    throw new MyAtlasApiError("My Atlas API access is not configured.", {
      code: "not_configured",
    })
  }
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  })
  if (body !== undefined) headers.set("Content-Type", "application/json")
  if (revision !== undefined) headers.set("If-Match", `"rev-${revision}"`)
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey)

  let response
  const request = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  }
  const attempts = method === "GET" ? 2 : 1
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await fetchImpl(`${apiBaseUrl}${path}`, request)
      break
    } catch {
      if (attempt === attempts - 1) {
        throw new MyAtlasApiError("The My Atlas API could not be reached.", {
          code: "unavailable",
        })
      }
    }
  }
  let payload = {}
  try {
    payload = await response.json()
  } catch {
    // Invalid responses are rejected below.
  }
  if (!response.ok) {
    throw new MyAtlasApiError("The My Atlas request was rejected.", {
      status: response.status,
      code: typeof payload.error === "string" ? payload.error : "rejected",
      requestId: typeof payload.requestId === "string" ? payload.requestId : "",
    })
  }
  return { response, payload }
}

function newIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new MyAtlasApiError("This browser cannot safely update My Atlas.", {
      code: "unsupported_browser",
    })
  }
  return globalThis.crypto.randomUUID()
}

function validatedMemory(value) {
  const memory = normalizeMyAtlasMemory(value)
  if (memory === null) {
    throw new MyAtlasApiError("Favorite memory is invalid.", {
      code: "invalid_memory",
    })
  }
  return memory
}

function validatedCustomPlace(value) {
  const customPlace = normalizeMyAtlasCustomPlace(value)
  if (!customPlace) {
    throw new MyAtlasApiError("Custom place is invalid.", {
      code: "invalid_custom_place",
    })
  }
  return customPlace
}

export async function fetchMyAtlasState({
  apiBaseUrl,
  accessToken,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/atlas",
    fetchImpl,
  })
  if (
    typeof payload.profile?.handle !== "string" ||
    typeof payload.profile?.displayName !== "string" ||
    typeof payload.profile?.public !== "boolean" ||
    !Array.isArray(payload.pins) ||
    payload.pins.some(
      pin =>
        typeof pin.pinId !== "string" ||
        !isPublicPlace(pin) ||
        pin.visitedYears.some(year => !Number.isInteger(year))
    )
  ) {
    throw new MyAtlasApiError("The My Atlas state response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  const revision = revisionFromResponse(response, payload.profile.revision)
  return Object.freeze({
    profile: Object.freeze({ ...payload.profile, revision }),
    pins: Object.freeze(payload.pins.map(normalizedPin)),
  })
}

export async function registerMyAtlasAccount({
  apiBaseUrl,
  accessToken,
  registration,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/beta/register",
    method: "POST",
    body: registration,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  const profile = payload.profile
  if (
    payload.registered !== true ||
    typeof profile?.handle !== "string" ||
    typeof profile?.displayName !== "string" ||
    profile.public !== false ||
    profile.status !== "active" ||
    !Number.isSafeInteger(profile.revision) ||
    profile.revision < 1
  ) {
    throw new MyAtlasApiError("The registration response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({ ...profile })
}

export async function createMyAtlasPin({
  apiBaseUrl,
  accessToken,
  placeId,
  customPlace,
  visitedDates = [],
  memory = "",
  revision,
  fetchImpl = fetch,
}) {
  const normalizedMemory = validatedMemory(memory)
  const hasPlaceId = typeof placeId === "string" && Boolean(placeId)
  const hasCustomPlace = customPlace !== undefined
  if (hasPlaceId === hasCustomPlace) {
    throw new MyAtlasApiError("Choose one catalog place or one custom place.", {
      code: "invalid_place",
    })
  }
  const normalizedCustomPlace = hasCustomPlace
    ? validatedCustomPlace(customPlace)
    : null
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/pins",
    method: "POST",
    body: {
      ...(hasPlaceId ? { placeId } : { customPlace: normalizedCustomPlace }),
      visitedDates,
      memory: normalizedMemory,
    },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    typeof payload.pin?.pinId !== "string" ||
    (hasPlaceId
      ? payload.pin.placeId !== placeId
      : payload.pin.placeType !== "custom" ||
        payload.pin.name !== normalizedCustomPlace.name ||
        payload.pin.coordinates?.some(
          (coordinate, index) =>
            coordinate !== normalizedCustomPlace.coordinates[index]
        )) ||
    !isPublicPlace(payload.pin) ||
    payload.pin.memory !== normalizedMemory
  ) {
    throw new MyAtlasApiError("The created pin response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    pin: normalizedPin(payload.pin),
    revision: revisionFromResponse(response),
  })
}

export async function updateMyAtlasPin({
  apiBaseUrl,
  accessToken,
  pinId,
  visitedDates,
  memory,
  revision,
  fetchImpl = fetch,
}) {
  const normalizedMemory =
    memory === undefined ? undefined : validatedMemory(memory)
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/pins/${encodeURIComponent(pinId)}`,
    method: "PATCH",
    body: {
      ...(visitedDates === undefined ? {} : { visitedDates }),
      ...(normalizedMemory === undefined ? {} : { memory: normalizedMemory }),
    },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    payload.pin?.pinId !== pinId ||
    !Array.isArray(payload.pin.visitedDates) ||
    !payload.pin.visitedDates.every(isVisitedDate) ||
    !isNormalizedMyAtlasMemory(payload.pin.memory)
  ) {
    throw new MyAtlasApiError("The updated pin response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    pin: normalizedPin(payload.pin),
    revision: revisionFromResponse(response),
  })
}

export async function deleteMyAtlasPin({
  apiBaseUrl,
  accessToken,
  pinId,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/pins/${encodeURIComponent(pinId)}`,
    method: "DELETE",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.deleted !== true) {
    throw new MyAtlasApiError("The deleted pin response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return revisionFromResponse(response)
}

export async function updateMyAtlasSharing({
  apiBaseUrl,
  accessToken,
  public: publish,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    method: "PATCH",
    body: { public: publish },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    typeof payload.profile?.handle !== "string" ||
    payload.profile.public !== publish
  ) {
    throw new MyAtlasApiError("The sharing response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    ...payload.profile,
    revision: revisionFromResponse(response, payload.profile.revision),
  })
}

function validatedPlanningRevision(response) {
  return revisionFromResponse(response)
}

async function fetchMyAtlasPlanningAttempt({
  apiBaseUrl,
  accessToken,
  allowPartial = false,
  fetchImpl = fetch,
}) {
  const wishes = []
  let cursor = ""
  let revision = 0
  do {
    const query = new URLSearchParams({ limit: "100" })
    if (cursor) query.set("cursor", cursor)
    const { response, payload } = await authenticatedJsonRequest({
      apiBaseUrl,
      accessToken,
      path: `/v1/me/bucket-list?${query.toString()}`,
      fetchImpl,
    })
    if (!Array.isArray(payload.wishes)) {
      throw new MyAtlasApiError("The wishlist response is invalid.", {
        status: response.status,
        code: "invalid_response",
      })
    }
    const pageRevision = validatedPlanningRevision(response)
    if (revision && revision !== pageRevision) {
      throw new MyAtlasApiError("My Atlas changed while it was loading.", {
        status: 412,
        code: "revision_conflict",
      })
    }
    revision = pageRevision
    wishes.push(...payload.wishes)
    cursor = typeof payload.nextCursor === "string" ? payload.nextCursor : ""
  } while (cursor)

  try {
    const { response, payload } = await authenticatedJsonRequest({
      apiBaseUrl,
      accessToken,
      path: "/v1/me/trip-plans",
      fetchImpl,
    })
    if (!Array.isArray(payload.plans) || payload.plans.length > 1) {
      throw new MyAtlasApiError("The trip-plan response is invalid.", {
        status: response.status,
        code: "invalid_response",
        requestId: response.headers.get("X-Request-Id") || "",
      })
    }
    const planRevision = validatedPlanningRevision(response)
    if (revision && revision !== planRevision) {
      throw new MyAtlasApiError("My Atlas changed while it was loading.", {
        status: 412,
        code: "revision_conflict",
        requestId: response.headers.get("X-Request-Id") || "",
      })
    }
    return Object.freeze({
      revision: planRevision,
      wishes: Object.freeze(wishes.map(wish => Object.freeze({ ...wish }))),
      plans: Object.freeze(
        payload.plans.map(plan => Object.freeze({ ...plan }))
      ),
      planError: null,
    })
  } catch (error) {
    if (!allowPartial) throw error
    return Object.freeze({
      revision,
      wishes: Object.freeze(wishes.map(wish => Object.freeze({ ...wish }))),
      plans: Object.freeze([]),
      planError: error,
    })
  }
}

export async function fetchMyAtlasPlanning(options) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const state = await fetchMyAtlasPlanningAttempt(options)
      if (
        attempt === 0 &&
        state.planError?.code === "revision_conflict"
      ) {
        continue
      }
      return state
    } catch (error) {
      if (attempt === 0 && error?.code === "revision_conflict") continue
      throw error
    }
  }
  throw new MyAtlasApiError("My Atlas changed while it was loading.", {
    status: 412,
    code: "revision_conflict",
  })
}

export async function createMyAtlasWish({
  apiBaseUrl,
  accessToken,
  value,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/bucket-list",
    method: "POST",
    body: value,
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (typeof payload.wish?.wishId !== "string") {
    throw new MyAtlasApiError("The created wishlist response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    wish: Object.freeze({ ...payload.wish }),
    revision: validatedPlanningRevision(response),
  })
}

export async function updateMyAtlasWish({
  apiBaseUrl,
  accessToken,
  wishId,
  patch,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/bucket-list/${encodeURIComponent(wishId)}`,
    method: "PATCH",
    body: patch,
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.wish?.wishId !== wishId) {
    throw new MyAtlasApiError("The updated wishlist response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return validatedPlanningRevision(response)
}

export async function deleteMyAtlasWish({
  apiBaseUrl,
  accessToken,
  wishId,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/bucket-list/${encodeURIComponent(wishId)}`,
    method: "DELETE",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.deleted !== true) {
    throw new MyAtlasApiError("The deleted wishlist response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return validatedPlanningRevision(response)
}

export async function saveMyAtlasPlan({
  apiBaseUrl,
  accessToken,
  planId = "",
  value,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: planId
      ? `/v1/me/trip-plans/${encodeURIComponent(planId)}`
      : "/v1/me/trip-plans",
    method: planId ? "PATCH" : "POST",
    body: value,
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  const savedRevision = validatedPlanningRevision(response)
  if (
    typeof payload.plan?.planId !== "string" ||
    !Array.isArray(payload.plan?.stops)
  ) {
    try {
      const refreshed = await fetchMyAtlasPlanning({
        apiBaseUrl,
        accessToken,
        allowPartial: false,
        fetchImpl,
      })
      const recoveredPlan = planId
        ? refreshed.plans.find(plan => plan.planId === planId)
        : refreshed.plans[0]
      if (recoveredPlan && refreshed.revision >= savedRevision) {
        return Object.freeze({
          plan: Object.freeze({ ...recoveredPlan }),
          revision: refreshed.revision,
          recovered: true,
        })
      }
    } catch {
      // The mutation returned success. Preserve its request reference below
      // when the authoritative recovery read cannot confirm the saved plan.
    }
    throw new MyAtlasApiError("The saved trip-plan response is invalid.", {
      status: response.status,
      code: "invalid_response",
      requestId: response.headers.get("X-Request-Id") || "",
    })
  }
  return Object.freeze({
    plan: Object.freeze({ ...payload.plan }),
    revision: savedRevision,
  })
}

export async function keepMyAtlasPlan({
  apiBaseUrl,
  accessToken,
  planId,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/trip-plans/${encodeURIComponent(planId)}/keep`,
    method: "POST",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.plan?.planId !== planId) {
    throw new MyAtlasApiError("The retained trip-plan response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    plan: Object.freeze({ ...payload.plan }),
    revision: validatedPlanningRevision(response),
  })
}

export async function markMyAtlasPlanVisited({
  apiBaseUrl,
  accessToken,
  planId,
  visits,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/trip-plans/${encodeURIComponent(planId)}/visited`,
    method: "POST",
    body: { visits },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    !Array.isArray(payload.pins) ||
    payload.pins.length !== visits.length ||
    payload.pins.some(
      pin => typeof pin.pinId !== "string" || !isPublicPlace(pin)
    )
  ) {
    throw new MyAtlasApiError("The visited-plan response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    pins: Object.freeze(payload.pins.map(normalizedPin)),
    revision: validatedPlanningRevision(response),
  })
}

export async function deleteMyAtlasPlan({
  apiBaseUrl,
  accessToken,
  planId,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/trip-plans/${encodeURIComponent(planId)}`,
    method: "DELETE",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.deleted !== true) {
    throw new MyAtlasApiError("The deleted trip-plan response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return validatedPlanningRevision(response)
}

export async function deleteMyAtlasAccount({
  apiBaseUrl,
  accessToken,
  revision,
  idempotencyKey = newIdempotencyKey(),
  fetchImpl = fetch,
}) {
  const { payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    method: "DELETE",
    body: { confirmation: "DELETE MY ATLAS" },
    revision,
    idempotencyKey,
    fetchImpl,
  })
  if (payload.deleted !== true) {
    throw new MyAtlasApiError("The account deletion response is invalid.", {
      code: "invalid_response",
    })
  }
  return Object.freeze({ deleted: true, deletedAt: payload.deletedAt })
}

export async function fetchMyAtlasAccountExport({
  apiBaseUrl,
  accessToken,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/export?format=json",
    fetchImpl,
  })
  if (
    payload.schemaVersion !== 2 ||
    !Array.isArray(payload.pins) ||
    !Array.isArray(payload.wishlist) ||
    !Array.isArray(payload.plans)
  ) {
    throw new MyAtlasApiError("The account export response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return payload
}

export async function fetchPublicAtlas({
  apiBaseUrl,
  handle,
  fetchImpl = fetch,
}) {
  if (!apiBaseUrl || !PUBLIC_HANDLE_PATTERN.test(handle)) {
    throw new MyAtlasApiError("The shared Atlas is not configured.", {
      code: "not_configured",
    })
  }

  let response
  try {
    response = await fetchImpl(
      `${apiBaseUrl}/v1/public/atlases/${encodeURIComponent(handle)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    )
  } catch {
    throw new MyAtlasApiError("The shared Atlas could not be reached.", {
      code: "unavailable",
    })
  }

  let body = {}
  try {
    body = await response.json()
  } catch {
    // Invalid responses are rejected by the contract check below.
  }

  if (!response.ok) {
    throw new MyAtlasApiError("The shared Atlas is unavailable.", {
      status: response.status,
      code: typeof body.error === "string" ? body.error : "rejected",
    })
  }
  if (
    body.schemaVersion !== 1 ||
    body.atlas?.handle !== handle ||
    typeof body.atlas?.displayName !== "string" ||
    !Array.isArray(body.atlas?.places) ||
    !body.atlas.places.every(isPublicPlace) ||
    typeof body.catalog?.revision !== "string" ||
    typeof body.catalog?.attribution?.provider !== "string" ||
    typeof body.catalog?.attribution?.license !== "string"
  ) {
    throw new MyAtlasApiError("The shared Atlas response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }

  return Object.freeze({
    handle: body.atlas.handle,
    displayName: body.atlas.displayName,
    places: Object.freeze(body.atlas.places.map(normalizedPin)),
    catalog: Object.freeze({ ...body.catalog }),
  })
}

export async function verifyMyAtlasApiAccess({
  apiBaseUrl,
  accessToken,
  fetchImpl = fetch,
}) {
  if (!apiBaseUrl || typeof accessToken !== "string" || !accessToken) {
    throw new MyAtlasApiError("My Atlas API access is not configured.", {
      code: "not_configured",
    })
  }

  let response
  try {
    response = await fetchImpl(`${apiBaseUrl}/v1/auth/check`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })
  } catch {
    throw new MyAtlasApiError("The My Atlas API could not be reached.", {
      code: "unavailable",
    })
  }

  let body = {}
  try {
    body = await response.json()
  } catch {
    // A malformed response is handled as a generic API rejection below.
  }

  if (!response.ok || body.authenticated !== true) {
    throw new MyAtlasApiError("The My Atlas API rejected this session.", {
      status: response.status,
      code: typeof body.error === "string" ? body.error : "rejected",
      requestId: typeof body.requestId === "string" ? body.requestId : "",
    })
  }

  if (
    typeof body.identity?.issuer !== "string" ||
    typeof body.identity?.subject !== "string" ||
    !Array.isArray(body.permissions)
  ) {
    throw new MyAtlasApiError(
      "The My Atlas API returned an invalid response.",
      {
        status: response.status,
        code: "invalid_response",
      }
    )
  }

  return Object.freeze({
    issuer: body.identity.issuer,
    subject: body.identity.subject,
    permissions: Object.freeze([...body.permissions]),
  })
}
