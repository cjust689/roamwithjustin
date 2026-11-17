export const PLAN_RETENTION_MONTHS = 6
export const PLAN_RETENTION_GRACE_DAYS = 30

function requireIsoDate(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new TypeError("A valid ISO timestamp is required.")
  }
  return new Date(value)
}

export function addUtcCalendarMonths(value, months) {
  const source = requireIsoDate(value)
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new TypeError("A valid calendar month count is required.")
  }
  const targetYear =
    source.getUTCFullYear() +
    Math.floor((source.getUTCMonth() + months) / 12)
  const targetMonth = (source.getUTCMonth() + months) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const target = new Date(source.getTime())
  target.setUTCFullYear(targetYear, targetMonth, Math.min(source.getUTCDate(), lastDay))
  return target.toISOString()
}

export function retentionDeadline(confirmedAt) {
  return addUtcCalendarMonths(confirmedAt, PLAN_RETENTION_MONTHS)
}

export function deletionDeadline(pendingAt) {
  const source = requireIsoDate(pendingAt)
  source.setUTCDate(source.getUTCDate() + PLAN_RETENTION_GRACE_DAYS)
  return source.toISOString()
}

export function nextRetentionAlarm(plan) {
  if (!plan) return null
  if (plan.retentionState === "active") return plan.retentionExpiresAt
  if (plan.retentionState === "deletion-pending") return plan.deleteAfter
  return null
}
