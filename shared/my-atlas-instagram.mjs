// Local handle contract only. This does not verify Instagram ownership or existence.
export function normalizeInstagramHandle(value) {
  if (typeof value !== "string") return null
  const input = value.trim()
  if (!input) return ""
  const handle = input.replace(/^@/, "").toLowerCase()
  if (
    !/^[a-z0-9_](?:[a-z0-9._]{0,28}[a-z0-9_])?$/.test(handle) ||
    handle.includes("..")
  )
    return null
  return handle
}

export function publicInstagramHandle(value) {
  const normalized = normalizeInstagramHandle(value)
  return normalized && normalized === value ? normalized : ""
}

export function instagramProfileUrl(value) {
  const handle = publicInstagramHandle(value)
  return handle ? `https://www.instagram.com/${handle}/` : ""
}
