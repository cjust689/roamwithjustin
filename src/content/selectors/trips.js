import { journeyRecords } from "../journeys/index.mjs"
import { buildTripViewModel } from "./projections.mjs"

// Vue still receives its historical prop shape, but every value is now a
// projection of canonical Journeys, Places, and Media.
export const trips = Object.freeze(
  journeyRecords.map(buildTripViewModel).filter(Boolean)
)

export function getTripViewModel(slug) {
  return trips.find(trip => trip.id === slug) || null
}
