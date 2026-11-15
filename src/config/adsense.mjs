const CLIENT_ID_PATTERN = /^ca-pub-\d+$/
const SLOT_ID_PATTERN = /^\d+$/

function enabled(value) {
  return String(value || "").trim().toLowerCase() === "true"
}

function clean(value) {
  return String(value || "").trim()
}

export function createAdSenseConfig({
  enabledFlag = "",
  privacyReadyFlag = "",
  autoAdsOffFlag = "",
  clientId = "",
  storySlotId = "",
  nodeEnv = "development",
} = {}) {
  const requested = enabled(enabledFlag)
  const privacyReady = enabled(privacyReadyFlag)
  const autoAdsOffConfirmed = enabled(autoAdsOffFlag)
  const normalizedClientId = clean(clientId)
  const normalizedStorySlotId = clean(storySlotId)
  const issues = []

  if (requested && !privacyReady) {
    issues.push("VUE_APP_ADSENSE_PRIVACY_READY must be true")
  }
  if (requested && !autoAdsOffConfirmed) {
    issues.push("VUE_APP_ADSENSE_AUTO_ADS_OFF_CONFIRMED must be true")
  }
  if (requested && !CLIENT_ID_PATTERN.test(normalizedClientId)) {
    issues.push("VUE_APP_ADSENSE_CLIENT_ID must be a valid ca-pub ID")
  }
  if (requested && !SLOT_ID_PATTERN.test(normalizedStorySlotId)) {
    issues.push("VUE_APP_ADSENSE_STORY_SLOT_ID must be a numeric slot ID")
  }

  return Object.freeze({
    requested,
    privacyReady,
    autoAdsOffConfirmed,
    clientId: normalizedClientId,
    storySlotId: normalizedStorySlotId,
    issues: Object.freeze(issues),
    ready:
      nodeEnv === "production" &&
      requested &&
      privacyReady &&
      autoAdsOffConfirmed &&
      issues.length === 0,
  })
}

export const adSenseConfig = createAdSenseConfig({
  enabledFlag: process.env.VUE_APP_ADSENSE_ENABLED,
  privacyReadyFlag: process.env.VUE_APP_ADSENSE_PRIVACY_READY,
  autoAdsOffFlag: process.env.VUE_APP_ADSENSE_AUTO_ADS_OFF_CONFIRMED,
  clientId: process.env.VUE_APP_ADSENSE_CLIENT_ID,
  storySlotId: process.env.VUE_APP_ADSENSE_STORY_SLOT_ID,
  nodeEnv: process.env.NODE_ENV,
})
