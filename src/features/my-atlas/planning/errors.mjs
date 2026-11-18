function requestReference(error) {
  return error?.requestId ? ` Reference: ${error.requestId}.` : ""
}

export function formatMyAtlasPlannerError(error) {
  const reference = requestReference(error)
  if (error?.code === "revision_conflict") {
    return `Your Atlas changed in another request. Refresh the planner and retry.${reference}`
  }
  if (error?.code === "duplicate_wish") {
    return `That destination is already in your private bucket list. Refresh the planner to load it.${reference}`
  }
  if (error?.code === "wishlist_limit_reached") {
    return `Your private bucket list has reached its current limit. Remove an item before adding another.${reference}`
  }
  if (error?.code === "place_unavailable") {
    return `That destination is no longer available in the current catalog. Search again before retrying.${reference}`
  }
  if (error?.code === "account_conflict") {
    return `This change conflicts with saved planner data. Refresh and retry.${reference}`
  }
  if (error?.code === "catalog_unavailable") {
    return `The destination catalog is temporarily unavailable. Retry in a moment.${reference}`
  }
  if (
    error?.code === "account_service_unavailable" ||
    error?.code === "service_configuration_error" ||
    error?.code === "unavailable"
  ) {
    return `Your private planner is temporarily unavailable. Retry in a moment.${reference}`
  }
  if (error?.code === "rate_limited") {
    return `The planner is receiving too many requests. Wait a moment, then retry.${reference}`
  }
  if (error?.code === "unauthorized") {
    return `Your My Atlas session needs to be renewed. Sign out, then sign in again.${reference}`
  }
  if (error?.code === "insufficient_permissions") {
    return `Your current My Atlas session cannot save planner changes. Sign out, then sign in again to renew its access.${reference}`
  }
  if (error?.code === "invalid_response") {
    return `The planner received an unexpected API response. Reload the page before retrying.${reference}`
  }
  if (error?.code === "not_configured") {
    return "The private planner API is not configured for this site."
  }
  if (error?.code === "not_found") {
    return `That saved planner item is no longer available. Refresh the planner and retry.${reference}`
  }
  if (
    ["invalid_request", "invalid_registration", "rejected"].includes(
      error?.code
    )
  ) {
    return `The planner could not save that selection. Reload the page and retry.${reference}`
  }
  return `The private planner could not complete that request. Retry in a moment.${reference}`
}

export function formatMyAtlasPlannerRefreshError(error) {
  const reference = requestReference(error)
  return `Your change was saved, but the planner could not refresh its latest state. Select Refresh before making another change.${reference}`
}

export function formatMyAtlasPlannerConflictRecovered(error) {
  const reference = requestReference(error)
  return `Your Atlas changed in another request. The latest account version is loaded, and your itinerary draft was kept where possible. Review it, then save again.${reference}`
}

export function formatMyAtlasPlanLoadError(error) {
  const reference = requestReference(error)
  return `Your bucket list loaded, but your saved trip could not be loaded. Your destinations remain available below. Select Refresh to retry the saved trip.${reference}`
}
