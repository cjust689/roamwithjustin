export const PIN_MEMORY_MAX_CHARACTERS = 255
export const PIN_MEMORY_MAX_UTF8_BYTES = 1020

const DISALLOWED_MEMORY_CHARACTERS =
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

export function normalizePinMemory(value) {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) return null
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim()
  if (
    DISALLOWED_MEMORY_CHARACTERS.test(normalized) ||
    hasDisallowedCodePoint(normalized) ||
    Array.from(normalized).length > PIN_MEMORY_MAX_CHARACTERS ||
    new TextEncoder().encode(normalized).byteLength > PIN_MEMORY_MAX_UTF8_BYTES
  ) {
    return null
  }
  return normalized
}

export function isNormalizedPinMemory(value) {
  const normalized = normalizePinMemory(value)
  return normalized !== null && normalized === value
}
