export const ATLAS_AD_MINIMUM_JOURNEY_STOPS = 5
export const ATLAS_AD_MINIMUM_VISITED_STOPS = 3
export const ATLAS_AD_MINIMUM_COPY_LENGTH = 180
export const ATLAS_AD_MINIMUM_MEDIA_ITEMS = 1

const SESSION_KEY_PREFIX = "roamwithjustin.adsense.atlas.v1"

function uniqueStringCount(values) {
  if (!values || typeof values[Symbol.iterator] !== "function") return 0
  return new Set([...values].filter(value => typeof value === "string")).size
}

export function atlasAdSessionKey(journeyId) {
  const normalizedJourneyId = String(journeyId || "").trim()
  return normalizedJourneyId
    ? `${SESSION_KEY_PREFIX}.${normalizedJourneyId}`
    : ""
}

export function isAtlasStopContentRich(stop) {
  if (!stop || stop.comingSoon) return false

  const copy = `${stop.summary || ""} ${stop.personalNote || ""}`.trim()
  const mediaCount = Array.isArray(stop.media) ? stop.media.length : 0

  return (
    copy.length >= ATLAS_AD_MINIMUM_COPY_LENGTH &&
    mediaCount >= ATLAS_AD_MINIMUM_MEDIA_ITEMS
  )
}

export function isAtlasAdEligible({
  atlasReady = false,
  journey = null,
  currentStop = null,
  guidedStatus = "idle",
  visitedStopIds = [],
} = {}) {
  return Boolean(
    atlasReady &&
      journey?.id &&
      journey.stopCount >= ATLAS_AD_MINIMUM_JOURNEY_STOPS &&
      guidedStatus === "at-stop" &&
      currentStop?.id &&
      uniqueStringCount(visitedStopIds) >= ATLAS_AD_MINIMUM_VISITED_STOPS &&
      isAtlasStopContentRich(currentStop)
  )
}

export function reserveAtlasAdRequest(storage, journeyId) {
  const key = atlasAdSessionKey(journeyId)
  if (!storage || !key) return false

  try {
    if (storage.getItem(key)) return false
    storage.setItem(key, "requested")
    return storage.getItem(key) === "requested"
  } catch (error) {
    // If the tab-scoped cap cannot be guaranteed, do not request an Atlas ad.
    return false
  }
}
