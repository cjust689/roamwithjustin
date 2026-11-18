import assert from "node:assert/strict"
import { auditLodgingRecords } from "./audit-lodging-links.mjs"
import { getJourney } from "../src/content/journeys/index.mjs"
import {
  getJourneyCommercialOffers,
  getPartner,
} from "../src/content/partners/index.mjs"
import { buildTripViewModel } from "../src/content/selectors/projections.mjs"
import {
  EXPEDIA_BANNER_SCRIPT_ID,
  EXPEDIA_BANNER_SCRIPT_URL,
  loadExpediaBannerScript,
} from "../src/services/expediaBanners.mjs"

const { candidates, issues, rows } = auditLodgingRecords()
assert.deepEqual(issues, [])
assert.equal(rows.length, 6)
assert.equal(new Set(rows.map(row => row.trackingSlug)).size, rows.length)
assert.ok(rows.every(row => row.status === "ready"))
assert.deepEqual(
  candidates.map(candidate => candidate.sourceId),
  ["experience-costa-rica-2025-la-fortuna-airbnb"]
)
assert.equal(
  rows.find(row => row.trackingSlug === "hacienda-florecer-moca")?.url,
  "https://www.discoverpuertorico.com/profile/hacienda-florecer/16790"
)

const offers = getJourneyCommercialOffers("utah-winter-2025")
assert.equal(offers.length, 2)
assert.deepEqual(
  offers.map(offer => offer.banner.product),
  ["stays", "flights"]
)
assert.ok(
  offers.every(offer => offer.banner.campaignReference === "1101l6yKm4")
)
assert.equal(
  new Set(offers.map(offer => offer.banner.publisherReference)).size,
  offers.length
)
assert.equal(getPartner(offers[0].partnerId)?.id, "expedia")

const trip = buildTripViewModel(getJourney("utah-winter-2025"))
assert.equal(trip.commercialOffers.length, 2)
assert.equal(trip.lodging[1].id, "hyatt-place-moab")
assert.equal(trip.lodging[1].linkType, "website")
assert.equal(
  trip.lodging[1].link,
  "https://www.hyatt.com/hyatt-place/en-US/slczm-hyatt-place-moab"
)

const scripts = new Map()
const dispatchedEvents = []
const windowObject = {
  Event: class BrowserEvent {
    constructor(type) {
      this.type = type
    }
  },
  dispatchEvent(event) {
    dispatchedEvents.push(event.type)
    this.eg.affiliate.banners.loaded = true
  },
  eg: {
    affiliate: {
      banners: {
        initialized: false,
        loaded: false,
      },
    },
  },
}
const target = {
  appendChild(script) {
    script.parentNode = target
    scripts.set(script.id, script)
    queueMicrotask(() => {
      windowObject.eg.affiliate.banners.initialized = true
      script.onload()
    })
  },
  removeChild(script) {
    scripts.delete(script.id)
    script.parentNode = null
  },
}
const documentObject = {
  body: target,
  readyState: "complete",
  createElement(tagName) {
    assert.equal(tagName, "script")
    return {}
  },
  getElementById(id) {
    return scripts.get(id) || null
  },
}

const firstScript = await loadExpediaBannerScript({ documentObject, windowObject })
assert.equal(firstScript.id, EXPEDIA_BANNER_SCRIPT_ID)
assert.equal(firstScript.src, EXPEDIA_BANNER_SCRIPT_URL)
assert.equal(firstScript.className, "eg-affiliate-banners-script")
assert.equal(firstScript.async, true)
assert.deepEqual(dispatchedEvents, ["DOMContentLoaded"])
assert.equal(windowObject.eg.affiliate.banners.loaded, true)

const secondScript = await loadExpediaBannerScript({ documentObject, windowObject })
assert.notEqual(secondScript, firstScript)
assert.equal(scripts.size, 1, "banner retries must keep only one loader")
assert.deepEqual(
  dispatchedEvents,
  ["DOMContentLoaded"],
  "an initialized Expedia banner must not receive a duplicate ready event"
)

console.log("Commercial content tests passed.")
