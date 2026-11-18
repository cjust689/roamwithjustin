export const GA4_MEASUREMENT_ID = "G-1NKNN94JT3"

export const ANALYTICS_OPT_OUT_KEY = "rwj.analytics.disabled"

const ATLAS_ENTRY_SURFACE_KEY = "rwj.analytics.atlas-entry-surface"
const PRODUCTION_HOSTS = new Set([
  "roamwithjustin.com",
  "www.roamwithjustin.com",
])

const eventContracts = Object.freeze({
  atlas_open_clicked: {
    required: ["entry_surface", "campaign_context"],
    optional: [],
  },
  atlas_loaded: {
    required: ["entry_surface", "device_category"],
    optional: [],
  },
  atlas_destination_opened: {
    required: ["content_type", "public_destination_id", "surface"],
    optional: [],
  },
  atlas_journey_opened: {
    required: ["public_journey_id", "surface"],
    optional: [],
  },
  atlas_story_opened: {
    required: ["public_story_id", "surface"],
    optional: [],
  },
  maps_handoff_clicked: {
    required: ["content_type", "surface"],
    optional: [],
  },
  partner_click: {
    required: ["partner_id", "link_type", "placement"],
    optional: [
      "gear_id",
      "experience_id",
      "public_destination_id",
      "public_journey_id",
    ],
  },
})

const controlledValues = Object.freeze({
  campaign_context: new Set([
    "paid_social",
    "organic_social",
    "paid_search",
    "organic_search",
    "email",
    "referral",
    "unattributed",
  ]),
  content_type: new Set(["journey", "place", "story"]),
  device_category: new Set(["desktop", "mobile"]),
  entry_surface: new Set([
    "atlas_direct",
    "homepage_atlas_card",
    "homepage_primary",
    "trip_story",
  ]),
  link_type: new Set(["affiliate", "booking", "maps", "phone", "website"]),
  surface: new Set([
    "atlas_toolbar",
    "breadcrumbs",
    "detail_panel",
    "guided_journey",
    "itinerary_route",
    "journey_explorer",
    "map_marker",
    "saved_drawer",
    "surprise",
    "trip_story",
  ]),
})

const safeIdentifierPattern = /^[a-z0-9][a-z0-9._-]{0,99}$/

let runtime = {
  debugMode: false,
  documentObject: null,
  enabled: false,
  measurementId: GA4_MEASUREMENT_ID,
  pageViewMode: "automatic",
  windowObject: null,
}

function browserStorage(windowObject, storageName) {
  try {
    return windowObject?.[storageName] || null
  } catch (error) {
    return null
  }
}

function readStorage(storage, key) {
  try {
    return storage?.getItem(key) || ""
  } catch (error) {
    return ""
  }
}

function writeStorage(storage, key, value) {
  try {
    storage?.setItem(key, value)
  } catch (error) {
    // Analytics state must never block navigation when storage is unavailable.
  }
}

function removeStorage(storage, key) {
  try {
    storage?.removeItem(key)
  } catch (error) {
    // Analytics state must never block navigation when storage is unavailable.
  }
}

function environmentFlag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

export function isAnalyticsEnabled({
  env = {},
  windowObject = typeof window === "undefined" ? null : window,
} = {}) {
  if (!windowObject?.location) return false

  const configured = environmentFlag(env.VUE_APP_GA4_ENABLED)
  if (["false", "0", "off"].includes(configured)) return false
  if (
    readStorage(
      browserStorage(windowObject, "localStorage"),
      ANALYTICS_OPT_OUT_KEY
    ) === "true"
  ) {
    return false
  }
  if (windowObject.navigator?.globalPrivacyControl === true) return false
  if (String(windowObject.navigator?.doNotTrack || "") === "1") return false

  if (["true", "1", "on"].includes(configured)) return true
  return PRODUCTION_HOSTS.has(windowObject.location.hostname.toLowerCase())
}

export function isPublicAnalyticsPath(path = "") {
  const normalized = String(path || "/").split(/[?#]/, 1)[0] || "/"
  return !normalized.startsWith("/my-atlas")
}

export function classifyCampaignContext(search = "") {
  const parameters = new URLSearchParams(String(search || ""))
  const source = (parameters.get("utm_source") || "").toLowerCase()
  const medium = (parameters.get("utm_medium") || "").toLowerCase()

  if (/paid|cpc|ppc/.test(medium) && /ig|instagram|facebook|meta/.test(source)) {
    return "paid_social"
  }
  if (/social/.test(medium) || /ig|instagram|facebook|meta/.test(source)) {
    return "organic_social"
  }
  if (/paid|cpc|ppc/.test(medium)) return "paid_search"
  if (/organic|search|seo/.test(medium)) return "organic_search"
  if (/email|newsletter/.test(medium)) return "email"
  if (/referral/.test(medium)) return "referral"
  return "unattributed"
}

export function getDeviceCategory(
  windowObject = runtime.windowObject ||
    (typeof window === "undefined" ? null : window)
) {
  if (!windowObject) return "desktop"
  const coarsePointer = Boolean(
    windowObject.matchMedia?.("(pointer: coarse)")?.matches
  )
  return coarsePointer || Number(windowObject.innerWidth || 0) <= 760
    ? "mobile"
    : "desktop"
}

function normalizeEventParameters(eventName, parameters = {}) {
  const contract = eventContracts[eventName]
  if (!contract || !parameters || typeof parameters !== "object") return null

  const allowedKeys = new Set([...contract.required, ...contract.optional])
  if (Object.keys(parameters).some(key => !allowedKeys.has(key))) return null
  if (contract.required.some(key => !parameters[key])) return null

  const normalized = {}
  for (const key of allowedKeys) {
    if (parameters[key] == null || parameters[key] === "") continue
    const value = String(parameters[key]).trim().toLowerCase()
    if (!safeIdentifierPattern.test(value)) return null
    if (controlledValues[key] && !controlledValues[key].has(value)) return null
    normalized[key] = value
  }

  return normalized
}

export function trackAnalyticsEvent(eventName, parameters = {}) {
  if (!runtime.enabled || typeof runtime.windowObject?.gtag !== "function") {
    return false
  }
  if (!isPublicAnalyticsPath(runtime.windowObject?.location?.pathname)) {
    return false
  }

  const normalized = normalizeEventParameters(eventName, parameters)
  if (!normalized) return false
  if (runtime.debugMode) normalized.debug_mode = true

  runtime.windowObject.gtag("event", eventName, normalized)
  return true
}

function sanitizedCampaignSearch(search = "") {
  const input = new URLSearchParams(String(search || ""))
  const output = new URLSearchParams()
  ;["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
    key => {
      const value = String(input.get(key) || "").trim()
      if (value && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value)) {
        output.set(key, value)
      }
    }
  )
  const serialized = output.toString()
  return serialized ? `?${serialized}` : ""
}

function sanitizedPageLocation(windowObject, path) {
  const origin = String(windowObject?.location?.origin || "").replace(/\/$/, "")
  return `${origin}${path}${sanitizedCampaignSearch(
    windowObject?.location?.search
  )}`
}

export function trackPageView(
  route,
  {
    documentObject = runtime.documentObject,
    windowObject = runtime.windowObject,
  } = {}
) {
  if (!runtime.enabled || typeof windowObject?.gtag !== "function") return false

  const path = String(route?.path || "/").split(/[?#]/, 1)[0] || "/"
  if (!isPublicAnalyticsPath(path)) return false

  const pageTitle =
    String(route?.meta?.analyticsTitle || documentObject?.title || "").trim() ||
    "Roam With Justin"
  const parameters = {
    page_location: sanitizedPageLocation(windowObject, path),
    page_path: path,
    page_title: pageTitle,
  }
  if (runtime.debugMode) parameters.debug_mode = true

  windowObject.gtag("event", "page_view", parameters)
  return true
}

function installGtag({ documentObject, measurementId, windowObject }) {
  windowObject.dataLayer = windowObject.dataLayer || []
  windowObject.gtag =
    windowObject.gtag ||
    function gtag() {
      windowObject.dataLayer.push(arguments)
    }

  windowObject.gtag("js", new Date())
  const currentPath =
    String(windowObject.location?.pathname || "/").split(/[?#]/, 1)[0] || "/"
  const configuration = {
    page_location: sanitizedPageLocation(windowObject, currentPath),
    page_title: documentObject.title || "Roam With Justin",
    send_page_view: runtime.pageViewMode === "automatic",
  }
  if (runtime.debugMode) configuration.debug_mode = true
  windowObject.gtag("config", measurementId, configuration)

  if (documentObject.getElementById?.("rwj-ga4-loader")) return
  const script = documentObject.createElement("script")
  script.id = "rwj-ga4-loader"
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId
  )}`
  documentObject.head.appendChild(script)
}

export function initializeAnalytics({
  documentObject = typeof document === "undefined" ? null : document,
  env = {},
  measurementId = GA4_MEASUREMENT_ID,
  nextTick = callback => Promise.resolve().then(callback),
  router,
  windowObject = typeof window === "undefined" ? null : window,
} = {}) {
  if (!documentObject || !windowObject || !router) return false
  if (!isAnalyticsEnabled({ env, windowObject })) return false
  if (!isPublicAnalyticsPath(windowObject.location?.pathname)) return false
  if (windowObject.__rwjAnalyticsInitialized) return true

  const pageViewMode =
    environmentFlag(env.VUE_APP_GA4_PAGE_VIEW_MODE) === "manual"
      ? "manual"
      : "automatic"
  runtime = {
    debugMode: environmentFlag(env.VUE_APP_GA4_DEBUG) === "true",
    documentObject,
    enabled: true,
    measurementId,
    pageViewMode,
    windowObject,
  }
  windowObject.__rwjAnalyticsInitialized = true
  const disableProperty = `ga-disable-${measurementId}`
  windowObject[disableProperty] = false

  installGtag({ documentObject, measurementId, windowObject })
  router.beforeEach((to, from, next) => {
    const isPrivateRoute = !isPublicAnalyticsPath(to?.path)
    windowObject[disableProperty] = isPrivateRoute
    next()
  })
  router.afterEach(to => {
    windowObject[disableProperty] = !isPublicAnalyticsPath(to?.path)
    if (runtime.pageViewMode !== "manual") return
    nextTick(() => {
      nextTick(() => trackPageView(to, { documentObject, windowObject }))
    })
  })
  if (runtime.pageViewMode === "manual" && router.currentRoute) {
    nextTick(() => {
      nextTick(() =>
        trackPageView(router.currentRoute, { documentObject, windowObject })
      )
    })
  }

  return true
}

export function trackAtlasOpen({ entrySurface }) {
  if (!runtime.enabled) return false
  writeStorage(
    browserStorage(runtime.windowObject, "sessionStorage"),
    ATLAS_ENTRY_SURFACE_KEY,
    entrySurface
  )
  return trackAnalyticsEvent("atlas_open_clicked", {
    campaign_context: classifyCampaignContext(
      runtime.windowObject?.location?.search
    ),
    entry_surface: entrySurface,
  })
}

export function consumeAtlasEntrySurface(
  windowObject = runtime.windowObject ||
    (typeof window === "undefined" ? null : window)
) {
  const stored = readStorage(
    browserStorage(windowObject, "sessionStorage"),
    ATLAS_ENTRY_SURFACE_KEY
  )
  removeStorage(
    browserStorage(windowObject, "sessionStorage"),
    ATLAS_ENTRY_SURFACE_KEY
  )
  return controlledValues.entry_surface.has(stored) ? stored : "atlas_direct"
}

export function resetAnalyticsForTests() {
  runtime = {
    debugMode: false,
    documentObject: null,
    enabled: false,
    measurementId: GA4_MEASUREMENT_ID,
    pageViewMode: "automatic",
    windowObject: null,
  }
}
