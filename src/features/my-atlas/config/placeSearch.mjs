function cleanValue(value) {
  return typeof value === "string" ? value.trim() : ""
}

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1"
}

export function getMyAtlasPlaceSearchEndpoint(environment = {}, origin) {
  const configured = cleanValue(environment.VUE_APP_MY_ATLAS_PLACE_SEARCH_URL)
  if (!configured) return ""

  const endpoint = new URL(configured, origin)
  const localHttp =
    endpoint.protocol === "http:" && isLocalHostname(endpoint.hostname)
  if (endpoint.protocol !== "https:" && !localHttp) {
    throw new Error("My Atlas place search requires HTTPS outside localhost.")
  }
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error("My Atlas place search URL is invalid.")
  }

  return endpoint.toString()
}
