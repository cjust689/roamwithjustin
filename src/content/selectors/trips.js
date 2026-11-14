import { journeyRecords } from "../journeys/index.mjs"
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
  return trips.find(trip => trip.id === slug) || null
}
