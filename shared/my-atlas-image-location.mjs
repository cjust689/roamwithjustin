export const IMAGE_LOCATION_MAX_LENGTH = 120

export function normalizeImageLocation(value) {
  if (typeof value !== "string") return null
  const location = value.trim().replace(/\s+/gu, " ")
  if (
    !location ||
    Array.from(location).length > IMAGE_LOCATION_MAX_LENGTH ||
    /[<>\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069]/u.test(
      location
    )
  )
    return null
  for (const char of location) {
    const point = char.codePointAt(0)
    if (point < 32 || point === 127 || (point >= 0xd800 && point <= 0xdfff))
      return null
  }
  return location
}
