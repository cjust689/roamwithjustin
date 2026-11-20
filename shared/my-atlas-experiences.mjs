export const MAX_VISIT_EXPERIENCES = 10
export const EXPERIENCE_ID_PATTERN = /^exp_[a-f0-9]{32}$/

function text(value, max, required = false) {
  if (value === undefined && !required) return ""
  if (typeof value !== "string") return null
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ")
  if (
    (required && !normalized) ||
    Array.from(normalized).length > max ||
    /[<>\u200b-\u200f\u202a-\u202e\u2060-\u2069]/u.test(normalized) ||
    Array.from(normalized).some(char => {
      const n = char.codePointAt(0)
      return n < 32 || (n >= 127 && n <= 159) || (n >= 0xd800 && n <= 0xdfff)
    })
  )
    return null
  return normalized
}

export function normalizeExperienceWebsite(value) {
  if (value === undefined || value === "") return ""
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return ""
  if (raw.length > 2048 || /\s|\\/u.test(raw)) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes(".") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
    )
      return null
    return raw
  } catch {
    return null
  }
}

export function normalizeExperienceChange(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !EXPERIENCE_ID_PATTERN.test(value.id) ||
    !["add", "edit", "remove"].includes(value.action)
  )
    return null
  const fields =
    value.action === "remove"
      ? ["action", "id"]
      : ["action", "id", "title", "operatorName", "operatorWebsite"]
  if (Object.keys(value).some(key => !fields.includes(key))) return null
  if (value.action === "remove")
    return Object.freeze({ action: value.action, id: value.id })
  const title = text(value.title, 120, true)
  const operatorName = text(value.operatorName, 140)
  const operatorWebsite = normalizeExperienceWebsite(value.operatorWebsite)
  if (title === null || operatorName === null || operatorWebsite === null)
    return null
  return Object.freeze({
    action: value.action,
    id: value.id,
    title,
    operatorName,
    operatorWebsite,
  })
}

export function validStoredExperiences(value) {
  if (value === undefined) return true
  return (
    Array.isArray(value) &&
    value.length <= MAX_VISIT_EXPERIENCES &&
    new Set(value.map(entry => entry?.id)).size === value.length &&
    value.every(entry => {
      if (
        !entry ||
        entry.visibility !== "private" ||
        entry.source !== "user-recap" ||
        !Number.isFinite(Date.parse(entry.createdAt)) ||
        !Number.isFinite(Date.parse(entry.updatedAt)) ||
        Object.keys(entry).some(
          key =>
            ![
              "id",
              "title",
              "operatorName",
              "operatorWebsite",
              "visibility",
              "source",
              "createdAt",
              "updatedAt",
            ].includes(key)
        )
      )
        return false
      const normalized = normalizeExperienceChange({
        action: "add",
        id: entry.id,
        title: entry.title,
        operatorName: entry.operatorName,
        operatorWebsite: entry.operatorWebsite,
      })
      return (
        normalized &&
        ["title", "operatorName", "operatorWebsite"].every(
          key => normalized[key] === entry[key]
        )
      )
    })
  )
}

export function applyExperienceChange(existing = [], change, now) {
  if (!validStoredExperiences(existing))
    return { error: "experience_state_invalid" }
  const normalized = normalizeExperienceChange(change)
  if (!normalized) return { error: "invalid_experience" }
  const current = existing.find(entry => entry.id === normalized.id)
  if (normalized.action === "add" && current)
    return { error: "duplicate_experience" }
  if (normalized.action !== "add" && !current)
    return { error: "experience_not_found" }
  if (normalized.action === "add" && existing.length >= MAX_VISIT_EXPERIENCES)
    return { error: "experience_limit" }
  if (normalized.action === "remove")
    return { experiences: existing.filter(entry => entry.id !== normalized.id) }
  const { action, ...fields } = normalized
  const entry = {
    ...fields,
    visibility: "private",
    source: "user-recap",
    createdAt: current?.createdAt || now,
    updatedAt: now,
  }
  return {
    experiences:
      action === "add"
        ? [...existing, entry]
        : existing.map(item => (item.id === entry.id ? entry : item)),
  }
}
