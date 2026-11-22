// Local decoding only. Coordinates are always [longitude, latitude] internally.
import olc from "open-location-code"
import { parseMapLinkCandidate } from "./my-atlas-map-links.mjs"

const plusCodes = new olc.OpenLocationCode()
const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)"
const PAIR = new RegExp(`^\\s*(${NUMBER})(?:\\s*[,;]\\s*|\\s+)(${NUMBER})\\s*$`)

export function locationCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 85.051129 &&
    Math.abs(longitude) <= 180
    ? [longitude, latitude]
    : null
}

function coordinateCandidate(latitude, longitude, provider = "Coordinates") {
  const coordinates = locationCoordinates(latitude, longitude)
  return {
    provider,
    kind: coordinates ? "explicit-coordinate" : "invalid-coordinate",
    label: "",
    coordinates,
  }
}

export function parseCoordinateText(value) {
  if (value.trim().startsWith("(") !== value.trim().endsWith(")")) return null
  const text = value
    .trim()
    .replace(/^\(\s*|\s*\)$/g, "")
    .replace(/\u2212/g, "-")
  const pair = text.match(PAIR)
  if (pair) return coordinateCandidate(Number(pair[1]), Number(pair[2]))
  const labeled = text.match(
    new RegExp(
      `^lat(?:itude)?\\s*[:=]?\\s*(${NUMBER})\\s*[,;]?\\s*(?:lon(?:gitude)?|lng)\\s*[:=]?\\s*(${NUMBER})$`,
      "i"
    )
  )
  if (labeled)
    return coordinateCandidate(Number(labeled[1]), Number(labeled[2]))
  // Decimal degrees, degrees/minutes, and degrees/minutes/seconds with hemispheres.
  const angle =
    "(\\d+(?:\\.\\d+)?)\\s*[°º]?\\s*(?:(\\d+(?:\\.\\d+)?)\\s*['′]\\s*)?(?:(\\d+(?:\\.\\d+)?)\\s*[\"″]\\s*)?"
  const compass = text.match(
    new RegExp(`^${angle}([NS])\\s*[,;]?\\s*${angle}([EW])$`, "i")
  )
  if (!compass) return null
  const parts = [1, 5].map(index => {
    const degrees = Number(compass[index]),
      minutes = Number(compass[index + 1] || 0),
      seconds = Number(compass[index + 2] || 0)
    if (
      minutes >= 60 ||
      seconds >= 60 ||
      (seconds && !compass[index + 1]) ||
      (minutes && degrees % 1) ||
      (seconds && minutes % 1)
    )
      return NaN
    return (
      (degrees + minutes / 60 + seconds / 3600) *
      (/[SW]/i.test(compass[index + 3]) ? -1 : 1)
    )
  })
  return coordinateCandidate(...parts)
}

export function parsePlusCode(value, reference = null) {
  const match = value
    .trim()
    .match(
      /^([23456789CFGHJMPQRVWX0]{0,8}\+[23456789CFGHJMPQRVWX]{0,7})(?:\s+(.+))?$/i
    )
  if (!match || !plusCodes.isValid(match[1])) return null
  const code = match[1].toUpperCase(),
    referenceQuery = (match[2] || "").trim()
  if (referenceQuery.length > 160) return null
  if (plusCodes.isShort(code) && !reference)
    return {
      provider: "Plus Code",
      kind: "short-plus-code",
      code,
      referenceQuery,
      label: "",
      coordinates: null,
    }
  if (
    reference &&
    (!Array.isArray(reference) ||
      !locationCoordinates(reference[1], reference[0]))
  )
    return null
  const full = plusCodes.isShort(code)
    ? plusCodes.recoverNearest(code, reference[1], reference[0])
    : code
  if (!plusCodes.isFull(full)) return null
  const area = plusCodes.decode(full)
  return {
    ...coordinateCandidate(
      area.latitudeCenter,
      area.longitudeCenter,
      "Plus Code"
    ),
    code: full,
    label: "",
  }
}

export function parseLocationInput(value, { reference = null } = {}) {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    /[\p{Cc}\p{Cf}]/u.test(value.replace(/[\r\n\t]/g, ""))
  )
    return { kind: "unsupported", label: "", coordinates: null }
  const text = value.trim()
  const direct = parseCoordinateText(text) || parsePlusCode(text, reference)
  if (direct) return direct
  // Sharing text may contain one URL; never choose between multiple links.
  const urls = text.match(/https:\/\/[^\s<>]+/g) || []
  if (urls.length > 1)
    return { kind: "ambiguous", label: "", coordinates: null }
  const urlText = urls.length === 1 ? urls[0] : text
  let url
  try {
    url = new URL(urlText)
  } catch {
    return { kind: "unsupported", label: "", coordinates: null }
  }
  if (
    url.protocol === "https:" &&
    ["plus.codes", "www.plus.codes"].includes(url.hostname) &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.hash &&
    !url.search
  ) {
    try {
      return (
        parsePlusCode(decodeURIComponent(url.pathname.slice(1)), reference) || {
          kind: "unsupported",
          label: "",
          coordinates: null,
        }
      )
    } catch {
      return { kind: "unsupported", label: "", coordinates: null }
    }
  }
  const candidate = parseMapLinkCandidate(urlText)
  if (candidate.kind === "unknown" || candidate.kind === "view-center") {
    const query =
      url.searchParams.get("query") || url.searchParams.get("q") || ""
    let pathCode = ""
    try {
      pathCode = decodeURIComponent(
        url.pathname.match(/\/(?:place|search)\/([^/]+)/)?.[1] || ""
      )
    } catch {
      /* Keep malformed links as unknown. */
    }
    const code =
      parsePlusCode(query, reference) || parsePlusCode(pathCode, reference)
    if (code) return { ...code, provider: candidate.provider }
  }
  return candidate
}
