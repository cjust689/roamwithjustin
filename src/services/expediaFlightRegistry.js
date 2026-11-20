import registry from "../content/partners/expedia-flight-links.json"
import { resolveExpediaFlightLink } from "./expediaDestinationLinks.mjs"

// Private placements stay disabled here independently of row scope.
export function resolveConfiguredExpediaFlightLink(destinationId, placement) {
  return resolveExpediaFlightLink(destinationId, placement, registry)
}
