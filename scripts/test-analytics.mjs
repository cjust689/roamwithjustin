import assert from "node:assert/strict"
import { getJourney } from "../src/content/journeys/index.mjs"
import { buildTripViewModel } from "../src/content/selectors/projections.mjs"
import {
  ANALYTICS_OPT_OUT_KEY,
  classifyCampaignContext,
  consumeAtlasEntrySurface,
  getDeviceCategory,
  initializeAnalytics,
  isAnalyticsEnabled,
  isPublicAnalyticsPath,
  resetAnalyticsForTests,
  trackAnalyticsEvent,
  trackAtlasOpen,
} from "../src/utils/analytics.mjs"

function createStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.get(key) || null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
}

function createBrowser({ hostname = "roamwithjustin.com", search = "" } = {}) {
  const scripts = []
  const windowObject = {
    innerWidth: 1280,
    localStorage: createStorage(),
    location: {
      hostname,
      origin: `https://${hostname}`,
      pathname: "/",
      search,
    },
    matchMedia: () => ({ matches: false }),
    navigator: {},
    sessionStorage: createStorage(),
  }
  const documentObject = {
    createElement() {
      return {}
    },
    getElementById() {
      return null
    },
    head: {
      appendChild(script) {
        scripts.push(script)
      },
    },
    title: "Interactive Travel Atlas | Roam With Justin",
  }
  let beforeEach = null
  let afterEach = null
  const router = {
    currentRoute: { meta: {}, path: "/" },
    beforeEach(callback) {
      beforeEach = callback
    },
    afterEach(callback) {
      afterEach = callback
    },
  }

  return {
    documentObject,
    navigate(route) {
      assert.ok(beforeEach, "analytics should register one route guard")
      assert.ok(afterEach, "analytics should register one router hook")
      let continued = false
      beforeEach(route, {}, () => {
        continued = true
      })
      assert.equal(continued, true, "analytics must never block navigation")
      windowObject.location.pathname = route.path
      const fullPath = route.fullPath || route.path
      windowObject.location.search = fullPath.includes("?")
        ? `?${fullPath.split("?").slice(1).join("?")}`
        : ""
      router.currentRoute = route
      afterEach(route)
    },
    router,
    scripts,
    windowObject,
  }
}

assert.equal(
  isAnalyticsEnabled({ windowObject: createBrowser().windowObject }),
  true,
  "the production Roam hostname should enable analytics"
)
assert.equal(
  isAnalyticsEnabled({
    windowObject: createBrowser({ hostname: "localhost" }).windowObject,
  }),
  false,
  "local development should not pollute production analytics"
)

const optedOut = createBrowser().windowObject
optedOut.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, "true")
assert.equal(isAnalyticsEnabled({ windowObject: optedOut }), false)

const globalPrivacyControl = createBrowser().windowObject
globalPrivacyControl.navigator.globalPrivacyControl = true
assert.equal(isAnalyticsEnabled({ windowObject: globalPrivacyControl }), false)

const blockedStorage = createBrowser().windowObject
Object.defineProperty(blockedStorage, "localStorage", {
  get() {
    throw new Error("storage blocked")
  },
})
assert.equal(
  isAnalyticsEnabled({ windowObject: blockedStorage }),
  true,
  "blocked storage should not break the production-host decision"
)

assert.equal(isPublicAnalyticsPath("/atlas/utah?source=test"), true)
assert.equal(isPublicAnalyticsPath("/my-atlas/callback?code=secret"), false)
assert.equal(
  classifyCampaignContext("?utm_source=ig&utm_medium=paid_social"),
  "paid_social"
)
assert.equal(
  classifyCampaignContext("?utm_source=instagram&utm_medium=social"),
  "organic_social"
)
assert.equal(classifyCampaignContext(""), "unattributed")

const stJohnTrip = buildTripViewModel(getJourney("usvi-st-john-2025"))
const natesCustomCharters = stJohnTrip.days
  .flatMap(day => day.partners)
  .find(partner => partner.id === "nates-custom-charters")
assert.deepEqual(
  {
    id: natesCustomCharters?.id,
    linkType: natesCustomCharters?.linkType,
  },
  {
    id: "nates-custom-charters",
    linkType: "website",
  },
  "the first partner slice should resolve from the canonical Partner registry"
)

resetAnalyticsForTests()
const automaticBrowser = createBrowser()
assert.equal(
  initializeAnalytics({
    documentObject: automaticBrowser.documentObject,
    nextTick: callback => callback(),
    router: automaticBrowser.router,
    windowObject: automaticBrowser.windowObject,
  }),
  true
)
let automaticCalls = automaticBrowser.windowObject.dataLayer.map(entry =>
  Array.from(entry)
)
assert.deepEqual(automaticCalls.find(call => call[0] === "config").slice(1), [
  "G-1NKNN94JT3",
  {
    page_location: "https://roamwithjustin.com/",
    page_title: "Interactive Travel Atlas | Roam With Justin",
    send_page_view: true,
  },
])
automaticBrowser.navigate({ meta: {}, path: "/atlas" })
automaticCalls = automaticBrowser.windowObject.dataLayer.map(entry =>
  Array.from(entry)
)
assert.equal(
  automaticCalls.filter(
    call => call[0] === "event" && call[1] === "page_view"
  ).length,
  0,
  "automatic mode should leave history page views to Enhanced Measurement"
)

resetAnalyticsForTests()
const browser = createBrowser({
  search: "?utm_source=ig&utm_medium=paid_social&token=private",
})
assert.equal(
  initializeAnalytics({
    documentObject: browser.documentObject,
    env: { VUE_APP_GA4_PAGE_VIEW_MODE: "manual" },
    nextTick: callback => callback(),
    router: browser.router,
    windowObject: browser.windowObject,
  }),
  true
)
assert.equal(browser.scripts.length, 1, "GA4 should install one script loader")
assert.match(browser.scripts[0].src, /G-1NKNN94JT3/)

browser.navigate({
  fullPath: "/atlas/utah?utm_source=ig&token=private",
  meta: {},
  path: "/atlas/utah",
})

let calls = browser.windowObject.dataLayer.map(entry => Array.from(entry))
const configuration = calls.find(call => call[0] === "config")
assert.deepEqual(configuration.slice(1), [
  "G-1NKNN94JT3",
  {
    page_location:
      "https://roamwithjustin.com/?utm_source=ig&utm_medium=paid_social",
    page_title: "Interactive Travel Atlas | Roam With Justin",
    send_page_view: false,
  },
])
const pageViews = calls.filter(
  call => call[0] === "event" && call[1] === "page_view"
)
assert.equal(
  pageViews.length,
  2,
  "manual mode should emit one initial and one navigation page view"
)
assert.deepEqual(pageViews[1][2], {
  page_location: "https://roamwithjustin.com/atlas/utah?utm_source=ig",
  page_path: "/atlas/utah",
  page_title: "Interactive Travel Atlas | Roam With Justin",
})

browser.navigate({
  fullPath: "/my-atlas/callback?code=private",
  meta: {},
  path: "/my-atlas/callback",
})
calls = browser.windowObject.dataLayer.map(entry => Array.from(entry))
assert.equal(browser.windowObject["ga-disable-G-1NKNN94JT3"], true)
assert.equal(
  calls.filter(call => call[0] === "event" && call[1] === "page_view")
    .length,
  2,
  "private My Atlas routes should not emit GA4 page views"
)
assert.equal(
  trackAnalyticsEvent("atlas_loaded", {
    device_category: "desktop",
    entry_surface: "atlas_direct",
  }),
  false,
  "custom events must also stop while a private route is active"
)

browser.navigate({ meta: {}, path: "/atlas" })
assert.equal(browser.windowObject["ga-disable-G-1NKNN94JT3"], false)

assert.equal(
  trackAtlasOpen({ entrySurface: "trip_story" }),
  true,
  "a Journey story Atlas link should emit its bounded event"
)
assert.equal(consumeAtlasEntrySurface(browser.windowObject), "trip_story")
assert.equal(consumeAtlasEntrySurface(browser.windowObject), "atlas_direct")

assert.equal(
  trackAnalyticsEvent("atlas_destination_opened", {
    content_type: "place",
    public_destination_id: "cruz-bay",
    surface: "map_marker",
  }),
  true
)
assert.equal(
  trackAnalyticsEvent("atlas_destination_opened", {
    content_type: "place",
    private_note: "must-not-send",
    public_destination_id: "cruz-bay",
    surface: "map_marker",
  }),
  false,
  "unknown parameters must reject the whole event"
)
assert.equal(
  trackAnalyticsEvent("partner_click", {
    gear_id: "confirmed-test-camera",
    link_type: "website",
    partner_id: "nates-custom-charters",
    placement: "trip_itinerary_partner",
  }),
  true
)
assert.equal(
  trackAnalyticsEvent("partner_click", {
    link_type: "website",
    partner_id: "Nate's Custom Charters",
    placement: "trip_itinerary_partner",
  }),
  false,
  "display names must not be accepted as analytics identifiers"
)

assert.equal(
  initializeAnalytics({
    documentObject: browser.documentObject,
    router: browser.router,
    windowObject: browser.windowObject,
  }),
  true
)
assert.equal(browser.scripts.length, 1, "reinitialization must not add a loader")

resetAnalyticsForTests()
const privateBrowser = createBrowser()
privateBrowser.windowObject.location.pathname = "/my-atlas/callback"
assert.equal(
  initializeAnalytics({
    documentObject: privateBrowser.documentObject,
    router: privateBrowser.router,
    windowObject: privateBrowser.windowObject,
  }),
  false,
  "a direct private route must not initialize GA4"
)
assert.equal(privateBrowser.scripts.length, 0)

browser.windowObject.innerWidth = 390
assert.equal(getDeviceCategory(browser.windowObject), "mobile")

console.log("Analytics adapter tests passed.")
