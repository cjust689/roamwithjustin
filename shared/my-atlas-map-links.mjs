// Read only data present in a Maps URL. No geocoding, scraping or persistence.
const FULL_HOSTS = new Set([
  "www.google.com",
  "google.com",
  "maps.google.com",
  "maps.apple.com",
])
const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)"
const PAIR = new RegExp(`^\\s*(${NUMBER})\\s*,\\s*(${NUMBER})\\s*$`)

export function mapLinkUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    /[\\\p{Cc}\s]/u.test(value.trim())
  )
    return null
  try {
    const url = new URL(value.trim())
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return null
    if (
      url.hostname === "maps.app.goo.gl" &&
      /^\/[A-Za-z0-9_-]{1,200}\/?$/.test(url.pathname)
    )
      return url
    if (
      url.hostname === "maps.apple" &&
      /^\/p\/[A-Za-z0-9_-]{1,200}\/?$/.test(url.pathname)
    )
      return url
    if (
      url.hostname === "goo.gl" &&
      /^\/maps\/[A-Za-z0-9_-]{1,200}\/?$/.test(url.pathname)
    )
      return url
    if (!FULL_HOSTS.has(url.hostname)) return null
    if (
      ["google.com", "www.google.com"].includes(url.hostname) &&
      !/^\/maps(?:\/|$)/.test(url.pathname)
    )
      return null
    return url
  } catch {
    return null
  }
}

export function isShortMapLink(url) {
  return (
    url?.hostname === "maps.app.goo.gl" ||
    url?.hostname === "maps.apple" ||
    url?.hostname === "goo.gl"
  )
}

function coordinates(value) {
  const match = typeof value === "string" && value.match(PAIR)
  if (!match) return null
  const latitude = Number(match[1]),
    longitude = Number(match[2])
  return Math.abs(latitude) <= 85.051129 && Math.abs(longitude) <= 180
    ? [longitude, latitude]
    : null
}

function label(value) {
  if (!value || coordinates(value)) return ""
  const text = value.normalize("NFC").replace(/\s+/gu, " ").trim()
  return /[<>\p{Cc}\p{Cf}]/u.test(text)
    ? ""
    : Array.from(text).slice(0, 80).join("")
}

export function parseMapLinkCandidate(value) {
  const url = mapLinkUrl(value)
  if (!url) return { kind: "unsupported", label: "", coordinates: null }
  const provider = url.hostname.startsWith("maps.apple")
    ? "Apple Maps"
    : "Google Maps"
  const result = { provider, kind: "unknown", label: "", coordinates: null }
  if (isShortMapLink(url)) return { ...result, kind: "short-link" }
  const params = url.searchParams
  // Duplicate fields and route endpoints must never select an arbitrary point.
  if ([...new Set(params.keys())].some(key => params.getAll(key).length > 1))
    return { ...result, kind: "ambiguous" }
  if (
    /\/(?:dir|directions)(?:\/|$)/.test(url.pathname) ||
    ["origin", "destination", "saddr", "daddr", "waypoints", "source"].some(
      key => params.has(key)
    )
  )
    return { ...result, kind: "ambiguous" }
  let point, center
  if (provider === "Apple Maps") {
    result.label = label(
      params.get("name") ||
        params.get("q") ||
        params.get("query") ||
        params.get("address")
    )
    const place = url.pathname === "/place" || url.pathname === "/place/"
    const legacy = url.pathname === "/"
    point = place
      ? params.get("coordinate")
      : legacy && params.has("q")
        ? params.get("ll") || params.get("q")
        : null
    center = params.get("center") || (legacy ? params.get("ll") : null)
  } else {
    let pathName = ""
    try {
      pathName = decodeURIComponent(
        url.pathname.match(/\/place\/([^/]+)/)?.[1] || ""
      ).replace(/\+/g, " ")
    } catch {
      /* Ignore malformed labels. */
    }
    const query = params.get("query") || params.get("q")
    result.label = label(query || pathName)
    point = query
    // A shared place URL may carry the actual pin after a separate camera
    // position. Read only complete location pairs; multiple distinct pins
    // are ambiguous and must not silently select the first result.
    let decodedPath
    try {
      decodedPath = decodeURIComponent(url.pathname)
    } catch {
      decodedPath = url.pathname
    }
    const embedded = [
      ...decodedPath.matchAll(
        new RegExp(`!3d(${NUMBER})!4d(${NUMBER})(?=!|/|$)`, "g")
      ),
    ].map(match => `${match[1]},${match[2]}`)
    const pathPoint = decodedPath.match(
      /\/(?:place|search)\/([^/]+)(?:\/|$)/
    )?.[1]
    const points = [
      params.get("q"),
      params.get("query"),
      pathPoint,
      ...embedded,
    ].filter(value => value && PAIR.test(value))
    if (points.length) {
      const parsed = points.map(coordinates)
      if (parsed.some(value => !value))
        return { ...result, kind: "invalid-coordinate" }
      if (new Set(parsed.map(value => value.join(","))).size > 1)
        return { ...result, kind: "ambiguous" }
      point = points[0]
    }
    center =
      params.get("center") ||
      params.get("ll") ||
      url.pathname.match(/@([^/]+?)(?:,\d+(?:\.\d+)?[a-z]|\/|$)/)?.[1]
  }
  if (point && PAIR.test(point)) {
    const parsed = coordinates(point)
    return {
      ...result,
      kind: parsed ? "explicit-coordinate" : "invalid-coordinate",
      coordinates: parsed,
    }
  }
  if (center) {
    const parsed = coordinates(center)
    return {
      ...result,
      kind: parsed ? "view-center" : "invalid-coordinate",
      coordinates: parsed,
    }
  }
  return result
}
