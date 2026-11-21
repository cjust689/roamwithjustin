import { isMyAtlasPlaceType } from "../catalog/placeTypes.mjs"
import { normalizeImageLocation } from "../../../../shared/my-atlas-image-location.mjs"
import {
  normalizeExperienceChange,
  validStoredExperiences,
} from "../../../../shared/my-atlas-experiences.mjs"
import {
  publicInstagramHandle,
  normalizeInstagramHandle,
} from "../../../../shared/my-atlas-instagram.mjs"
import {
  isNormalizedMyAtlasMemory,
  normalizeMyAtlasMemory,
} from "../catalog/memory.mjs"
import {
  MY_ATLAS_CUSTOM_PLACE_ID_PATTERN,
  isNormalizedMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
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
export const MY_ATLAS_IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024
const MY_ATLAS_IMAGE_MAX_OUTPUT_BYTES = 1024 * 1024

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
  if (
    value.customPlace !== undefined &&
    (!MY_ATLAS_CUSTOM_PLACE_ID_PATTERN.test(value.placeId || "") ||
      !isNormalizedMyAtlasCustomPlace(value.customPlace))
  )
    throw new MyAtlasApiError("The custom location response is invalid.", {
      code: "invalid_response",
    })
  if (!validStoredExperiences(value.experiences))
    throw new MyAtlasApiError("The experience response is invalid.", {
      code: "invalid_response",
    })
  const visitedDates = Array.isArray(value.visitedDates)
    ? value.visitedDates
    : Array.isArray(value.visitedYears)
      ? value.visitedYears.map(year => ({ year }))
      : []
  return Object.freeze({
    ...value,
    ...(value.customPlace
      ? {
          placeType: "custom",
          name: value.customPlace.name,
          coordinates: Object.freeze([...value.customPlace.coordinates]),
        }
      : {}),
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
  const match = response.headers
    .get("ETag")
    ?.match(/^(?:W\/)?"rev-([1-9][0-9]*)"$/)
  const revision = match ? Number(match[1]) : Number(fallback)
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new MyAtlasApiError("The My Atlas revision is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return revision
}

function normalizedAtlasImage(value) {
  if (value === null || value === undefined) return null
  if (
    typeof value !== "object" ||
    !/^image_[a-f0-9]{32}$/.test(value.imageId || "") ||
    value.contentType !== "image/webp" ||
    value.width !== 1200 ||
    value.height !== 1200 ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength < 1 ||
    value.byteLength > MY_ATLAS_IMAGE_MAX_OUTPUT_BYTES ||
    (value.publicProfile !== undefined &&
      typeof value.publicProfile !== "boolean") ||
    (value.location !== undefined &&
      normalizeImageLocation(value.location) !== value.location) ||
    typeof value.updatedAt !== "string"
  ) {
    throw new MyAtlasApiError("The Atlas image response is invalid.", {
      code: "invalid_response",
    })
  }
  return Object.freeze({ ...value })
}

export async function authenticatedJsonRequest({
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

export async function resolveMyAtlasMapLink({
  apiBaseUrl,
  accessToken,
  url,
  fetchImpl = fetch,
}) {
  const { payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/map-links/resolve",
    method: "POST",
    body: { url },
    fetchImpl,
  })
  const candidate = payload.candidate
  if (
    !candidate ||
    !["Google Maps", "Apple Maps"].includes(candidate.provider) ||
    ![
      "unknown",
      "ambiguous",
      "explicit-coordinate",
      "view-center",
      "invalid-coordinate",
    ].includes(candidate.kind) ||
    typeof candidate.label !== "string" ||
    candidate.label.length > 160 ||
    (candidate.coordinates !== null &&
      !normalizeMyAtlasCustomCoordinates(candidate.coordinates)) ||
    (candidate.kind === "explicit-coordinate" && !candidate.coordinates)
  )
    throw new MyAtlasApiError("The map link response is invalid.", {
      code: "invalid_response",
    })
  return {
    provider: candidate.provider,
    kind: candidate.kind,
    label: candidate.label,
    coordinates: candidate.coordinates,
  }
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
    typeof payload.profile?.discoverable !== "boolean" ||
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
    atlasImage: normalizedAtlasImage(payload.atlasImage),
  })
}

export async function fetchMyAtlasImage({
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
    response = await fetchImpl(`${apiBaseUrl}/v1/me/atlas-image`, {
      method: "GET",
      headers: {
        Accept: "image/webp",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })
  } catch {
    throw new MyAtlasApiError("Your Atlas image could not be reached.", {
      code: "unavailable",
    })
  }
  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      // Invalid errors use the generic rejection below.
    }
    throw new MyAtlasApiError("Your Atlas image could not be loaded.", {
      status: response.status,
      code: typeof payload.error === "string" ? payload.error : "rejected",
      requestId: typeof payload.requestId === "string" ? payload.requestId : "",
    })
  }
  const blob = await response.blob()
  if (
    blob.type !== "image/webp" ||
    blob.size < 1 ||
    blob.size > MY_ATLAS_IMAGE_MAX_OUTPUT_BYTES
  ) {
    throw new MyAtlasApiError("The Atlas image response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return blob
}

export async function replaceMyAtlasImage({
  apiBaseUrl,
  accessToken,
  file,
  location,
  revision,
  fetchImpl = fetch,
}) {
  const normalizedLocation = normalizeImageLocation(location)
  if (!normalizedLocation)
    throw new MyAtlasApiError("Enter the photo location before uploading.", {
      code: "atlas_image_location_required",
    })
  if (!(file instanceof Blob) || file.size < 1) {
    throw new MyAtlasApiError("Choose an image to upload.", {
      code: "image_empty",
    })
  }
  if (file.size > MY_ATLAS_IMAGE_MAX_INPUT_BYTES) {
    throw new MyAtlasApiError("The selected image is larger than 10 MiB.", {
      code: "image_too_large",
    })
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new MyAtlasApiError("Choose a JPEG, PNG, or WebP image.", {
      code: "image_type_not_supported",
    })
  }
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/atlas-image",
    method: "POST",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl: async (url, options) =>
      fetchImpl(url, {
        ...options,
        headers: new Headers({
          ...Object.fromEntries(options.headers),
          "Content-Type": file.type,
          "X-Atlas-Image-Location": encodeURIComponent(normalizedLocation),
        }),
        body: file,
      }),
  })
  const atlasImage = normalizedAtlasImage(payload.atlasImage)
  if (!atlasImage || atlasImage.location !== normalizedLocation) {
    throw new MyAtlasApiError(
      "The saved photo location could not be confirmed.",
      {
        code: "invalid_response",
      }
    )
  }
  return Object.freeze({
    atlasImage,
    revision: revisionFromResponse(response),
  })
}

export async function removeMyAtlasImage({
  apiBaseUrl,
  accessToken,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/atlas-image",
    method: "DELETE",
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (payload.deleted !== true) {
    throw new MyAtlasApiError("The Atlas image removal response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return revisionFromResponse(response)
}

export async function updateMyAtlasImageVisibility({
  apiBaseUrl,
  accessToken,
  publicProfile,
  location,
  revision,
  fetchImpl = fetch,
}) {
  const normalizedLocation =
    location === undefined ? undefined : normalizeImageLocation(location)
  if (
    (publicProfile === undefined && location === undefined) ||
    (publicProfile !== undefined && typeof publicProfile !== "boolean") ||
    normalizedLocation === null
  ) {
    throw new MyAtlasApiError("Choose whether to show this image publicly.", {
      code: "invalid_image_visibility",
    })
  }
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/atlas-image",
    method: "PATCH",
    body: {
      ...(publicProfile === undefined ? {} : { publicProfile }),
      ...(normalizedLocation === undefined
        ? {}
        : { location: normalizedLocation }),
    },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  const atlasImage = normalizedAtlasImage(payload.atlasImage)
  if (
    !atlasImage ||
    (normalizedLocation !== undefined &&
      atlasImage.location !== normalizedLocation) ||
    (publicProfile !== undefined && atlasImage.publicProfile !== publicProfile)
  ) {
    throw new MyAtlasApiError("The photo update could not be confirmed.", {
      code: "invalid_response",
    })
  }
  return Object.freeze({
    atlasImage,
    revision: revisionFromResponse(response),
  })
}

export async function fetchMyAtlasProfile({
  apiBaseUrl,
  accessToken,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    fetchImpl,
  })
  if (
    typeof payload.profile?.handle !== "string" ||
    typeof payload.profile?.displayName !== "string" ||
    typeof payload.profile?.public !== "boolean" ||
    typeof payload.profile?.discoverable !== "boolean"
  ) {
    throw new MyAtlasApiError("The My Atlas profile response is invalid.", {
      status: response.status,
      code: "invalid_response",
      requestId: response.headers.get("X-Request-Id") || "",
    })
  }
  return Object.freeze({
    ...payload.profile,
    revision: revisionFromResponse(response, payload.profile.revision),
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
    profile.discoverable !== false ||
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
  customPlace,
  experienceChange,
  idempotencyKey,
  revision,
  fetchImpl = fetch,
}) {
  const normalizedMemory =
    memory === undefined ? undefined : validatedMemory(memory)
  const normalizedPlace =
    customPlace === undefined ? undefined : validatedCustomPlace(customPlace)
  const normalizedChange =
    experienceChange === undefined
      ? undefined
      : normalizeExperienceChange(experienceChange)
  if (normalizedChange === null)
    throw new MyAtlasApiError(
      "Enter a title and valid optional experience details.",
      { code: "invalid_experience" }
    )
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: `/v1/me/pins/${encodeURIComponent(pinId)}`,
    method: "PATCH",
    body: {
      ...(normalizedChange === undefined
        ? {}
        : { experienceChange: normalizedChange }),
      ...(visitedDates === undefined ? {} : { visitedDates }),
      ...(normalizedPlace === undefined
        ? {}
        : { customPlace: normalizedPlace }),
      ...(normalizedMemory === undefined ? {} : { memory: normalizedMemory }),
    },
    revision,
    idempotencyKey: idempotencyKey || newIdempotencyKey(),
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
  const pin = normalizedPin(payload.pin)
  if (
    normalizedPlace &&
    (pin.name !== normalizedPlace.name ||
      !pin.coordinates.every(
        (value, index) => value === normalizedPlace.coordinates[index]
      ))
  )
    throw new MyAtlasApiError("The location change could not be confirmed.", {
      code: "invalid_response",
    })
  if (normalizedChange) {
    const saved = pin.experiences?.find(
      entry => entry.id === normalizedChange.id
    )
    if (
      normalizedChange.action === "remove"
        ? Boolean(saved)
        : !saved ||
          ["title", "operatorName", "operatorWebsite"].some(
            key => saved[key] !== normalizedChange[key]
          )
    ) {
      throw new MyAtlasApiError(
        "The experience change could not be confirmed.",
        { code: "invalid_response" }
      )
    }
  }
  return Object.freeze({
    pin,
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

export async function updateMyAtlasInstagram({
  apiBaseUrl,
  accessToken,
  instagramHandle,
  revision,
  fetchImpl = fetch,
}) {
  const normalized = normalizeInstagramHandle(instagramHandle)
  if (normalized === null)
    throw new MyAtlasApiError("Enter a valid Instagram handle.", {
      code: "invalid_instagram_handle",
    })
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    method: "PATCH",
    body: { instagramHandle: normalized },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    typeof payload.profile?.handle !== "string" ||
    typeof payload.profile.public !== "boolean" ||
    typeof payload.profile.discoverable !== "boolean" ||
    (payload.profile.instagramHandle ?? "") !== normalized
  )
    throw new MyAtlasApiError("The Instagram update response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  return Object.freeze({
    ...payload.profile,
    revision: revisionFromResponse(response, payload.profile.revision),
  })
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

export async function updateMyAtlasDiscovery({
  apiBaseUrl,
  accessToken,
  discoverable,
  revision,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    method: "PATCH",
    body: { discoverable },
    revision,
    idempotencyKey: newIdempotencyKey(),
    fetchImpl,
  })
  if (
    typeof payload.profile?.handle !== "string" ||
    payload.profile.discoverable !== discoverable
  ) {
    throw new MyAtlasApiError("The discovery response is invalid.", {
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

async function fetchMyAtlasPlanningSnapshot({
  apiBaseUrl,
  accessToken,
  fetchImpl = fetch,
}) {
  const { response, payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me/planning",
    fetchImpl,
  })
  if (
    !Array.isArray(payload.wishes) ||
    !Array.isArray(payload.plans) ||
    payload.plans.length > 1
  ) {
    throw new MyAtlasApiError("The planning snapshot response is invalid.", {
      status: response.status,
      code: "invalid_response",
      requestId: response.headers.get("X-Request-Id") || "",
    })
  }
  return Object.freeze({
    revision: validatedPlanningRevision(response),
    wishes: Object.freeze(
      payload.wishes.map(wish => Object.freeze({ ...wish }))
    ),
    plans: Object.freeze(payload.plans.map(plan => Object.freeze({ ...plan }))),
    planError: null,
  })
}

export async function fetchMyAtlasPlanning(options) {
  try {
    return await fetchMyAtlasPlanningSnapshot(options)
  } catch (error) {
    if (!["not_found", "method_not_allowed"].includes(error?.code)) {
      throw error
    }
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const state = await fetchMyAtlasPlanningAttempt(options)
      if (attempt === 0 && state.planError?.code === "revision_conflict") {
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
  accountId,
  idempotencyKey = newIdempotencyKey(),
  fetchImpl = fetch,
}) {
  const { payload } = await authenticatedJsonRequest({
    apiBaseUrl,
    accessToken,
    path: "/v1/me",
    method: "DELETE",
    body: {
      confirmation: "DELETE MY ATLAS",
      ...(accountId ? { accountId } : {}),
    },
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

export async function deleteMyAtlasAccountWithRevisionRecovery({
  apiBaseUrl,
  accessToken,
  revision,
  accountId,
  idempotencyKey = newIdempotencyKey(),
  onRevision,
  fetchImpl = fetch,
}) {
  const deletion = currentRevision =>
    deleteMyAtlasAccount({
      apiBaseUrl,
      accountId,
      accessToken,
      revision: currentRevision,
      idempotencyKey,
      fetchImpl,
    })

  try {
    return await deletion(revision)
  } catch (error) {
    if (error?.code !== "revision_conflict") throw error
  }

  const profile = await fetchMyAtlasProfile({
    apiBaseUrl,
    accessToken,
    fetchImpl,
  })
  if (accountId && profile.userId !== accountId)
    throw new MyAtlasApiError(
      "The account has changed. Confirm deletion again for the current account.",
      { code: "account_changed" }
    )
  if (typeof onRevision === "function") onRevision(profile.revision)
  return deletion(profile.revision)
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
    ![2, 3].includes(payload.schemaVersion) ||
    !Array.isArray(payload.pins) ||
    !Array.isArray(payload.wishlist) ||
    !Array.isArray(payload.plans)
  ) {
    throw new MyAtlasApiError("The account export response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  if (payload.schemaVersion === 3 && !Array.isArray(payload.trips))
    throw new MyAtlasApiError("The account export response is invalid.", {
      code: "invalid_response",
    })
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
    ...(publicInstagramHandle(body.atlas.instagramHandle)
      ? { instagramHandle: body.atlas.instagramHandle }
      : {}),
    favoriteImage: normalizedAtlasImage(body.atlas.favoriteImage),
    places: Object.freeze(body.atlas.places.map(normalizedPin)),
    catalog: Object.freeze({ ...body.catalog }),
  })
}

export async function fetchPublicAtlasDirectory({
  apiBaseUrl,
  cursor = "",
  limit = 12,
  fetchImpl = fetch,
}) {
  if (
    !apiBaseUrl ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 24 ||
    typeof cursor !== "string"
  ) {
    throw new MyAtlasApiError("Atlas discovery is not configured.", {
      code: "not_configured",
    })
  }
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set("cursor", cursor)
  let response
  try {
    response = await fetchImpl(
      `${apiBaseUrl}/v1/public/atlases?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    )
  } catch {
    throw new MyAtlasApiError("Atlas discovery could not be reached.", {
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
    throw new MyAtlasApiError("Atlas discovery is unavailable.", {
      status: response.status,
      code: typeof body.error === "string" ? body.error : "rejected",
    })
  }
  if (
    body.schemaVersion !== 1 ||
    !Array.isArray(body.atlases) ||
    body.atlases.some(
      atlas =>
        !PUBLIC_HANDLE_PATTERN.test(atlas?.handle || "") ||
        typeof atlas.displayName !== "string" ||
        !Number.isInteger(atlas.placeCount) ||
        atlas.placeCount < 1 ||
        typeof atlas.recent !== "boolean"
    ) ||
    (body.nextCursor !== null && typeof body.nextCursor !== "string")
  ) {
    throw new MyAtlasApiError("Atlas discovery response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return Object.freeze({
    atlases: Object.freeze(
      body.atlases.map(atlas =>
        Object.freeze({
          ...atlas,
          favoriteImage: normalizedAtlasImage(atlas.favoriteImage),
        })
      )
    ),
    nextCursor: body.nextCursor,
  })
}

export async function fetchPublicAtlasImage({
  apiBaseUrl,
  handle,
  fetchImpl = fetch,
}) {
  if (!apiBaseUrl || !PUBLIC_HANDLE_PATTERN.test(handle)) {
    throw new MyAtlasApiError("The shared Atlas image is not configured.", {
      code: "not_configured",
    })
  }

  let response
  try {
    response = await fetchImpl(
      `${apiBaseUrl}/v1/public/atlases/${encodeURIComponent(handle)}/image`,
      {
        method: "GET",
        headers: { Accept: "image/webp" },
        cache: "no-store",
      }
    )
  } catch {
    throw new MyAtlasApiError("The shared Atlas image could not be reached.", {
      code: "unavailable",
    })
  }

  if (!response.ok) {
    throw new MyAtlasApiError("The shared Atlas image is unavailable.", {
      status: response.status,
      code: "rejected",
    })
  }
  const blob = await response.blob()
  if (
    blob.type !== "image/webp" ||
    blob.size < 1 ||
    blob.size > MY_ATLAS_IMAGE_MAX_OUTPUT_BYTES
  ) {
    throw new MyAtlasApiError("The shared Atlas image response is invalid.", {
      status: response.status,
      code: "invalid_response",
    })
  }
  return blob
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
