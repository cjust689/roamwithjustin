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
      officialUrl: "https://stthomasboatcharters.com/",
      evidenceStatus: "confirmed",
      relationship: "trip-operator",
      disclosure:
        "Independent operator used for this trip; no sponsorship or affiliate relationship is asserted.",
    },
  ],
  "Partner registry"
)

export const partnerRecords = registry.records
export const partnersById = registry.byId

export function getPartner(id) {
  return id ? partnersById[id] || null : null
}
