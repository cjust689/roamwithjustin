import { createIdRegistry } from "../contracts.mjs"
import { puertoRicoMedia } from "./puerto-rico.mjs"
import { upcomingMedia } from "./upcoming.mjs"
import { utahMedia } from "./utah.mjs"

// This is the only composition root for controlled media. Destination modules
// remain independently editable while every consumer uses one stable lookup.
const registry = createIdRegistry(
  [...utahMedia, ...puertoRicoMedia, ...upcomingMedia],
  "Media registry"
)

export const mediaRecords = registry.records
export const mediaById = registry.byId

export function getMediaAsset(id) {
  return id ? mediaById[id] || null : null
}
