import { createIdRegistry } from "../contracts.mjs"
import { generatedLodgingPartners } from "../lodging/index.mjs"

// Operators and commercial providers are separate from Places and Media.
// A record here identifies a real trip relationship without implying that
// Roam With Justin sponsors, endorses, or is affiliated with the provider.
const registry = createIdRegistry(
  [
    {
      id: "nates-custom-charters",
      name: "Nate's Custom Charters",
      kind: "operator",
      label: "Charter operator",
      externalLinks: {
        official: "https://stthomasboatcharters.com/",
      },
      evidenceStatus: "confirmed",
      relationship: "trip-operator",
      disclosure:
        "Independent operator used for this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "high-tide-st-john",
      name: "High Tide Bar & Seafood Grill",
      kind: "restaurant",
      label: "Restaurant",
      externalLinks: {
        official: "https://www.hightidevi.com/restaurant",
      },
      evidenceStatus: "confirmed",
      relationship: "dined-at",
      disclosure:
        "Visited during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "reef2peak",
      name: "Reef2Peak",
      kind: "rental-provider",
      label: "Beach rentals",
      externalLinks: {
        platform: "https://reservestj.com/reef-2-peak",
      },
      evidenceStatus: "confirmed",
      relationship: "available-at-visited-place",
      disclosure:
        "Available at Maho during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "mercado-la-carreta",
      name: "Mercado La Carreta",
      kind: "restaurant",
      label: "Restaurant",
      externalLinks: {
        platform:
          "https://www.google.com/maps/search/?api=1&query=Mercado+La+Carreta%2C+279+Calle+Luna%2C+Old+San+Juan%2C+Puerto+Rico",
      },
      evidenceStatus: "confirmed",
      relationship: "dined-at",
      disclosure:
        "Visited during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "montego-bay-hotel-casino-resort",
      name: "Montego Bay Hotel Casino Resort",
      kind: "lodging",
      label: "Hotel",
      externalLinks: {
        official: "https://www.wendoverfun.com/",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "hyatt-place-moab",
      name: "Hyatt Place Moab",
      kind: "lodging",
      label: "Hotel",
      externalLinks: {
        official:
          "https://www.hyatt.com/hyatt-place/en-US/slczm-hyatt-place-moab",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "hyatt-centric-park-city",
      name: "Hyatt Centric Park City",
      kind: "lodging",
      label: "Hotel",
      externalLinks: {
        official:
          "https://www.hyatt.com/en-US/hotel/utah/hyatt-centric-park-city/parkc",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "don-rafa-boutique-hotel",
      name: "Don Rafa Boutique Hotel",
      kind: "lodging",
      label: "Hotel",
      externalLinks: {
        official: "https://donrafaboutiquehotel.com/",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "hacienda-florecer-moca",
      name: "Hacienda Florecer",
      kind: "lodging",
      label: "Vacation rental",
      externalLinks: {
        directory:
          "https://www.discoverpuertorico.com/profile/hacienda-florecer/16790",
        maps: "https://www.google.com/maps?q=18.3882008,-67.0752792",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; the linked tourism profile is an ordinary reference, not an affiliate link.",
    },
    {
      id: "oceana-villa-st-john",
      name: "Oceana Villa",
      kind: "lodging",
      label: "Vacation rental",
      externalLinks: {
        official: "https://oceanastjohn.com/",
      },
      evidenceStatus: "confirmed",
      relationship: "stayed-at",
      disclosure:
        "Stayed at during this trip; no sponsorship or affiliate relationship is asserted.",
    },
    {
      id: "expedia",
      name: "Expedia",
      kind: "travel-platform",
      label: "Travel booking platform",
      externalLinks: {
        official: "https://www.expedia.com/",
      },
      evidenceStatus: "owner-supplied",
      relationship: "affiliate-program",
      commercialHosts: ["expedia.com", "expediagroup.com"],
      disclosure:
        "Roam With Justin may earn a commission from qualifying bookings made through Expedia affiliate tools, at no additional cost to the traveler.",
    },
    {
      id: "amazon-associates",
      name: "Amazon",
      kind: "retailer",
      label: "Online retailer",
      externalLinks: {
        official: "https://www.amazon.com/",
      },
      evidenceStatus: "owner-supplied",
      relationship: "affiliate-program",
      commercialHosts: ["amazon.com", "amzn.to", "a.co"],
      disclosure: "As an Amazon Associate I earn from qualifying purchases.",
    },
    ...generatedLodgingPartners,
  ],
  "Partner registry"
)

const commercialOfferRegistry = createIdRegistry(
  [
    {
      id: "expedia-utah-winter-2025-stays",
      partnerId: "expedia",
      journeyId: "utah-winter-2025",
      kind: "affiliate-banner",
      linkType: "affiliate",
      allowedSurface: "public-journey",
      isEnabled: true,
      evidenceStatus: "owner-supplied-code",
      banner: {
        program: "us-expedia",
        network: "pz",
        layout: "leaderboard",
        image: "nature",
        message: "none",
        campaignReference: "1101l6yKm4",
        publisherReference: "rwj-utah-winter-2025-stays",
        product: "stays",
      },
    },
    {
      id: "expedia-utah-winter-2025-flights",
      partnerId: "expedia",
      journeyId: "utah-winter-2025",
      kind: "affiliate-banner",
      linkType: "affiliate",
      allowedSurface: "public-journey",
      isEnabled: true,
      evidenceStatus: "owner-supplied-code",
      banner: {
        program: "us-expedia",
        network: "pz",
        layout: "leaderboard",
        image: "resort",
        message: "bye-bye-bucket-list-hello-adventure",
        campaignReference: "1101l6yKm4",
        publisherReference: "rwj-utah-winter-2025-flights",
        product: "flights",
      },
    },
  ],
  "Commercial offer registry"
)

export const partnerRecords = registry.records
export const partnersById = registry.byId
export const commercialOfferRecords = commercialOfferRegistry.records
export const commercialOffersById = commercialOfferRegistry.byId

export function getPartner(id) {
  return id ? partnersById[id] || null : null
}

export function getCommercialOffer(id) {
  return id ? commercialOffersById[id] || null : null
}

export function getJourneyCommercialOffers(
  journeyId,
  surface = "public-journey"
) {
  return commercialOfferRecords.filter(
    offer =>
      offer.isEnabled &&
      offer.journeyId === journeyId &&
      offer.allowedSurface === surface
  )
}
