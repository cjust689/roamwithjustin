export const MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS = 80
export const MY_ATLAS_CUSTOM_PLACE_MAX_UTF8_BYTES = 320
export const MY_ATLAS_CUSTOM_PLACE_ID_PATTERN = /^custom:[a-f0-9]{24}$/
export const MY_ATLAS_CUSTOM_PLACE_MAX_LATITUDE = 85.051129

const DISALLOWED_NAME_CHARACTERS =
  /[<>\u00ad\u061c\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069]/u

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) return true
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

function hasDisallowedCodePoint(value) {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0)
    return (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      (codePoint & 0xffff) === 0xfffe ||
      (codePoint & 0xffff) === 0xffff
    )
  })
}

export function normalizeMyAtlasCustomPlaceName(value) {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) return null
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim()
  if (
    !normalized ||
    DISALLOWED_NAME_CHARACTERS.test(normalized) ||
    hasDisallowedCodePoint(normalized) ||
    Array.from(normalized).length > MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS ||
    new TextEncoder().encode(normalized).byteLength >
      MY_ATLAS_CUSTOM_PLACE_MAX_UTF8_BYTES
  ) {
    return null
  }
  return normalized
}

export function normalizeMyAtlasCustomCoordinates(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] < -180 ||
    value[0] > 180 ||
    value[1] < -MY_ATLAS_CUSTOM_PLACE_MAX_LATITUDE ||
    value[1] > MY_ATLAS_CUSTOM_PLACE_MAX_LATITUDE
  ) {
    return null
  }
  return Object.freeze(
    value.map(coordinate => {
      const rounded = Math.round(coordinate * 1_000_000) / 1_000_000
      return Object.is(rounded, -0) ? 0 : rounded
    })
  )
}

export function normalizeMyAtlasCustomPlace(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(key => !["name", "coordinates"].includes(key))
  ) {
    return null
  }
  const name = normalizeMyAtlasCustomPlaceName(value.name)
  const coordinates = normalizeMyAtlasCustomCoordinates(value.coordinates)
  if (!name || !coordinates) return null
  return Object.freeze({ name, coordinates })
}

export function isNormalizedMyAtlasCustomPlace(value) {
  const normalized = normalizeMyAtlasCustomPlace(value)
  return Boolean(
    normalized &&
      normalized.name === value.name &&
      normalized.coordinates.every(
        (coordinate, index) => coordinate === value.coordinates[index]
      )
  )
}
