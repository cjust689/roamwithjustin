import { getPartner } from "../content/partners/index.mjs"

export function isApprovedExpediaUrl(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    value.length > 4096 ||
    /\s|\\/u.test(value)
  )
    return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      getPartner("expedia").commercialHosts.some(
        host => url.hostname === host || url.hostname === "www." + host
      )
    )
  } catch {
    return false
  }
}

export function resolveExpediaFlightLink(
  destinationId,
  placement,
  registry,
  { privatePlacementApproved = false } = {}
) {
  if (!["public", "private"].includes(placement)) return undefined
  const ordinary = {
    href: "https://www.expedia.com/Flights",
    provider: "expedia",
    product: "flights",
    resolution: "ordinary",
    destinationPrefilled: false,
    tracked: false,
  }
  if (placement === "private" && !privatePlacementApproved)
    return Object.freeze(ordinary)
  const allowed =
    placement === "public"
      ? ["public", "both-approved"]
      : ["private-approved", "both-approved"]
  const eligible = (registry?.links || []).filter(
    link =>
      link.enabled &&
      allowed.includes(link.placementScope) &&
      isApprovedExpediaUrl(link.affiliateUrl)
  )
  const destination = destinationId
    ? eligible.filter(
        link =>
          link.kind === "destination" && link.destinationId === destinationId
      )
    : []
  const generic = eligible.filter(link => link.kind === "generic")
  if (destination.length > 1 || generic.length > 1)
    return Object.freeze(ordinary)
  const link = destination[0] || generic[0]
  return Object.freeze(
    link
      ? {
          ...ordinary,
          href: link.affiliateUrl,
          resolution: link.kind,
          tracked: true,
          destinationPrefilled: false,
        }
      : ordinary
  )
}
