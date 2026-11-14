import { createIdRegistry } from "../contracts.mjs"

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
  ],
  "Partner registry"
)

export const partnerRecords = registry.records
export const partnersById = registry.byId

export function getPartner(id) {
  return id ? partnersById[id] || null : null
}
