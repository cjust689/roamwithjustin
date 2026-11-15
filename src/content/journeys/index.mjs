import { createIdRegistry } from "../contracts.mjs"
import { costaRica2025Journey } from "./costa-rica-2025.mjs"
import { miamiJourney } from "./miami.mjs"
import { nextDestinationJourneys } from "./next-destinations.mjs"
import { puertoRico2024Journey } from "./puerto-rico-2024.mjs"
import { upcomingJourneys } from "./upcoming.mjs"
import { usviStJohn2025Journey } from "./usvi-st-john-2025.mjs"
import { utah2026Journey } from "./utah-2026.mjs"
import { utahWinter2025Journey } from "./utah-winter-2025.mjs"

// Canonical IDs and public slugs both carry the trip year so repeat visits can
// coexist. Previous slugs remain lookup-only aliases for existing links.
const registry = createIdRegistry(
  [
    utahWinter2025Journey,
    puertoRico2024Journey,
    usviStJohn2025Journey,
    miamiJourney,
    ...upcomingJourneys,
    ...nextDestinationJourneys,
    costaRica2025Journey,
    utah2026Journey,
  ],
  "Journey registry"
)

export const journeyRecords = registry.records
export const journeysById = registry.byId

export function getJourney(id) {
  return id ? journeysById[id] || null : null
}

export function getJourneyBySlug(slug) {
  return (
    journeyRecords.find(
      journey =>
        journey.slug === slug || (journey.legacySlugs || []).includes(slug)
    ) || null
  )
}

export function getJourneyVisit(journeyId, placeId) {
  const journey = getJourney(journeyId)
  return journey?.visits.find(visit => visit.placeId === placeId) || null
}

export function getJourneyVisitById(journeyId, visitId) {
  const journey = getJourney(journeyId)
  return journey?.visits.find(visit => visit.id === visitId) || null
}
