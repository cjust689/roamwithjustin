import { adSenseConfig } from "../config/adsense.mjs"

const SCRIPT_ID = "roam-adsense-loader"
const SCRIPT_SOURCE =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"

export function ensureAdSenseLoader() {
  if (!adSenseConfig.ready || typeof document === "undefined") return null

  const existing =
    document.getElementById(SCRIPT_ID) ||
    document.querySelector(`script[src^="${SCRIPT_SOURCE}"]`)
  if (existing) return existing

  const script = document.createElement("script")
  script.id = SCRIPT_ID
  script.async = true
  script.crossOrigin = "anonymous"
  script.dataset.roamAdsenseState = "loading"
  script.addEventListener(
    "load",
    () => {
      script.dataset.roamAdsenseState = "loaded"
    },
    { once: true }
  )
  script.addEventListener(
    "error",
    () => {
      script.dataset.roamAdsenseState = "error"
    },
    { once: true }
  )
  script.src = `${SCRIPT_SOURCE}?client=${encodeURIComponent(
    adSenseConfig.clientId
  )}`
  document.head.appendChild(script)
  return script
}

export function initializeAdSenseUnit(unit) {
  if (
    !adSenseConfig.ready ||
    !unit ||
    typeof window === "undefined" ||
    unit.dataset.adsbygoogleStatus
  ) {
    return false
  }

  ensureAdSenseLoader()

  try {
    window.adsbygoogle = window.adsbygoogle || []
    window.adsbygoogle.push({})
    return true
  } catch (error) {
    console.warn("AdSense unit could not be initialized", error)
    return false
  }
}
