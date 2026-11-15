import { getJourneyBySlug, journeyRecords } from "../journeys/index.mjs"
import { atlasNodes } from "./atlas"
import { addTripAtlasNavigation, buildTripViewModel } from "./projections.mjs"

// Vue still receives its historical prop shape, but every value is now a
// projection of canonical Journeys, Places, and Media.
export const trips = Object.freeze(
  journeyRecords
    .map(buildTripViewModel)
    .filter(Boolean)
    .map(trip => addTripAtlasNavigation(trip, Object.values(atlasNodes)))
)

export function getTripViewModel(slug) {
  const journey = getJourneyBySlug(slug)
  return journey
    ? trips.find(trip => trip.journeyId === journey.id) || null
    : null
}
