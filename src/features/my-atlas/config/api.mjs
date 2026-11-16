function cleanValue(value) {
  return typeof value === "string" ? value.trim() : ""
}

export function getMyAtlasApiBaseUrl(environment = {}, currentOrigin = "") {
  const configuredValue = cleanValue(environment.VUE_APP_MY_ATLAS_API_URL)
  if (!configuredValue) return ""

  const parsed = new URL(configuredValue, currentOrigin || undefined)
  const localHttp =
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname)

  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error("The My Atlas API requires HTTPS outside localhost.")
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !["", "/"].includes(parsed.pathname)
  ) {
    throw new Error("The My Atlas API URL must be an origin.")
  }

  return parsed.origin
}
