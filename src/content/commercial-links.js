const LINK_TYPES = Object.freeze([
  "affiliate",
  "booking",
  "maps",
  "phone",
  "website",
])
const TRACKING_MODES = Object.freeze(["custom", "approved-rule", "none"])
const GEAR_SURFACES = Object.freeze(["public-gear", "public-journey"])

const safeIdentifierPattern = /^[a-z0-9][a-z0-9._-]{0,99}$/

function safeIdentifier(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
  return safeIdentifierPattern.test(normalized) ? normalized : ""
}

function buildPartnerClickParameters({
  partnerId,
  linkType,
  placement,
  gearId,
  experienceId,
  publicDestinationId,
  publicJourneyId,
} = {}) {
  const normalizedPartnerId = safeIdentifier(partnerId)
  const normalizedLinkType = safeIdentifier(linkType)
  const normalizedPlacement = safeIdentifier(placement)

  if (
    !normalizedPartnerId ||
    !LINK_TYPES.includes(normalizedLinkType) ||
    !normalizedPlacement
  ) {
    return null
  }

  const parameters = {
    partner_id: normalizedPartnerId,
    link_type: normalizedLinkType,
    placement: normalizedPlacement,
  }
  const optionalIdentifiers = [
    ["gear_id", gearId],
    ["experience_id", experienceId],
    ["public_destination_id", publicDestinationId],
    ["public_journey_id", publicJourneyId],
  ]
  for (const [key, value] of optionalIdentifiers) {
    if (value == null || value === "") continue
    const normalized = safeIdentifier(value)
    if (!normalized) return null
    parameters[key] = normalized
  }

  return parameters
}

module.exports = Object.freeze({
  LINK_TYPES,
  TRACKING_MODES,
  GEAR_SURFACES,
  buildPartnerClickParameters,
})
