import { searchPlaceCatalog } from "./search.mjs"
export class MyAtlasPlaceSearchError extends Error {
  constructor(
    message,
    { status = 0, code = "search_failed", retryAfter = 0, requestId = "" } = {}
  ) {
    super(message)
    this.name = "MyAtlasPlaceSearchError"
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.requestId = requestId
  }
}

export function formatMyAtlasPlaceSearchError(error) {
  const reference = error?.requestId ? ` Reference: ${error.requestId}.` : ""
  if (error?.status === 429 || error?.code === "rate_limited") {
    const wait = error.retryAfter || 60
    return `Search limit reached. Wait about ${wait} seconds, then retry.${reference}`
  }
  if (
    error?.status === 503 ||
    ["catalog_unavailable", "rate_limit_unavailable"].includes(error?.code)
  ) {
    return `Place search is temporarily unavailable. Retry in a moment.${reference}`
  }
  if (error?.code === "unavailable") {
    return `Place search could not be reached. Check your connection and retry.${reference}`
  }
  return `Place search could not be completed. Please retry.${reference}`
}

function retryAfterSeconds(response) {
  const value = Number(response.headers.get("Retry-After") || 0)
  return Number.isInteger(value) && value > 0 && value <= 3600 ? value : 0
}

function isCanonicalPlace(record) {
  const coordinates = record?.coordinates
  return (
    record &&
    typeof record.placeId === "string" &&
    /^(?:iso-country:[A-Z]{2}|geonames:\d+|park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+)$/.test(
      record.placeId
    ) &&
    ["country", "city", "spot"].includes(record.placeType) &&
    typeof record.name === "string" &&
    record.name.length > 0 &&
    (coordinates === null ||
      (Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        coordinates.every(Number.isFinite)))
  )
}

export async function searchMyAtlasPlaces({
  query,
  catalog,
  endpoint = "",
  limit = 8,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  if (!endpoint) {
    return searchPlaceCatalog(catalog, query, { limit })
  }
  if (typeof fetchImpl !== "function") {
    throw new MyAtlasPlaceSearchError(
      "Place search is unavailable in this browser.",
      { code: "unsupported_browser" }
    )
  }

  const requestUrl = new URL(endpoint)
  requestUrl.searchParams.set("q", query)
  requestUrl.searchParams.set("limit", String(limit))
  let response
  try {
    response = await fetchImpl(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    })
  } catch (error) {
    if (error?.name === "AbortError") throw error
    throw new MyAtlasPlaceSearchError("Place search could not be reached.", {
      code: "unavailable",
    })
  }
  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      // The status remains authoritative when an error body is unavailable.
    }
    throw new MyAtlasPlaceSearchError("Place search request failed.", {
      status: response.status,
      code:
        typeof payload.error === "string" ? payload.error : "search_rejected",
      retryAfter: retryAfterSeconds(response),
      requestId: typeof payload.requestId === "string" ? payload.requestId : "",
    })
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new MyAtlasPlaceSearchError(
      "Place search returned an invalid catalog response.",
      { status: response.status, code: "invalid_response" }
    )
  }
  if (
    !payload ||
    !Array.isArray(payload.results) ||
    !payload.results.every(isCanonicalPlace)
  ) {
    throw new MyAtlasPlaceSearchError(
      "Place search returned an invalid catalog response.",
      { status: response.status, code: "invalid_response" }
    )
  }

  return payload.results.slice(0, Math.max(0, Math.min(10, limit)))
}
