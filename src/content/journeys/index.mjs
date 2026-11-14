import { createIdRegistry } from "../contracts.mjs"
import { puertoRico2024Journey } from "./puerto-rico-2024.mjs"
import { upcomingJourneys } from "./upcoming.mjs"
import { utahWinter2025Journey } from "./utah-winter-2025.mjs"

// Public URLs remain slug-based, allowing stable /trips/:slug routes while
// canonical Journey IDs carry the specific trip identity and approximate year.
const registry = createIdRegistry(
  [utahWinter2025Journey, puertoRico2024Journey, ...upcomingJourneys],
  "Journey registry"
)

export const journeyRecords = registry.records
export const journeysById = registry.byId

export function getJourney(id) {
  return id ? journeysById[id] || null : null
}

export function getJourneyBySlug(slug) {
  return journeyRecords.find(journey => journey.slug === slug) || null
}

export function getJourneyVisit(journeyId, placeId) {
  const journey = getJourney(journeyId)
  return journey?.visits.find(visit => visit.placeId === placeId) || null
}

export function getJourneyVisitById(journeyId, visitId) {
  const journey = getJourney(journeyId)
  return journey?.visits.find(visit => visit.id === visitId) || null
}
