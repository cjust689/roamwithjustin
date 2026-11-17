export const DASH_PUNCTUATION = /[-\u2010-\u2015]/u

export const EDITORIAL_WORKFLOW_LANGUAGE =
  /\b(?:coming soon|confirmed|unconfirmed|verified|unverified|placeholder|in progress|pending|not confirmed|needs verification|date to be confirmed)\b|\bstill being\b|\bremain(?:s|ing)? (?:unverified|open)\b|\b(?:the creator|editorial order|media review)\b/i

export function publicCopyProblem(value) {
  const copy = String(value || "").trim()
  if (!copy) return null
  if (DASH_PUNCTUATION.test(copy)) return "uses dash punctuation"
  if (EDITORIAL_WORKFLOW_LANGUAGE.test(copy)) {
    return "exposes editorial workflow language"
  }
  return null
}

export function requirePublicCopy(
  value,
  label,
  { optional = false, maxLength = null } = {}
) {
  const copy = String(value || "").trim()
  if (!copy && !optional) throw new Error(`${label} is required`)
  if (copy && maxLength && copy.length > maxLength) {
    throw new Error(`${label} exceeds ${maxLength} characters`)
  }
  const problem = publicCopyProblem(copy)
  if (problem) throw new Error(`${label} ${problem} in public prose`)
  return copy
}
