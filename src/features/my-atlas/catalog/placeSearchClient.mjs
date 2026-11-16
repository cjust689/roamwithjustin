import { searchPlaceCatalog } from "./search.mjs"

function isCanonicalPlace(record) {
  const coordinates = record?.coordinates
  return (
    record &&
    typeof record.placeId === "string" &&
    /^(?:iso-country:[A-Z]{2}|geonames:\d+)$/.test(record.placeId) &&
    ["country", "city"].includes(record.placeType) &&
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
    throw new Error("Place search is unavailable in this browser.")
  }

  const requestUrl = new URL(endpoint)
  requestUrl.searchParams.set("q", query)
  requestUrl.searchParams.set("limit", String(limit))
  const response = await fetchImpl(requestUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!response.ok) {
    throw new Error("Place search request failed.")
  }

  const payload = await response.json()
  if (
    !payload ||
    !Array.isArray(payload.results) ||
    !payload.results.every(isCanonicalPlace)
  ) {
    throw new Error("Place search returned an invalid catalog response.")
  }

  return payload.results.slice(0, Math.max(0, Math.min(10, limit)))
}
