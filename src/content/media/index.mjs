import { createIdRegistry } from "../contracts.mjs"
import { puertoRicoMedia } from "./puerto-rico.mjs"
import { upcomingMedia } from "./upcoming.mjs"
import { usviMedia } from "./usvi.mjs"
import { utahMedia } from "./utah.mjs"
import mediaContract from "./contract.js"
import generatedData from "./generated/data.js"
import generatedGearImages from "../gear/generated/images.js"

if (generatedData.schemaVersion !== mediaContract.schemaVersion) {
  throw new Error(
    `Generated media uses schema version ${generatedData.schemaVersion}; expected ${mediaContract.schemaVersion}`
  )
}
if (
  generatedGearImages.schemaVersion !== 1 ||
  !Array.isArray(generatedGearImages.assets) ||
  !Array.isArray(generatedGearImages.batches)
) {
  throw new Error("Generated Gear images do not match schema version 1")
}

// This is the only composition root for controlled media. Destination modules
// remain independently editable while every consumer uses one stable lookup.
const registry = createIdRegistry(
  [
    ...utahMedia,
    ...puertoRicoMedia,
    ...usviMedia,
    ...upcomingMedia,
    ...(generatedData.assets || []),
    ...generatedGearImages.assets,
  ],
  "Media registry"
)
const placementRegistry = createIdRegistry(
  generatedData.placements || [],
  "Media placement registry"
)

export const mediaRecords = registry.records
export const mediaById = registry.byId
export const mediaPlacementRecords = placementRegistry.records
export const mediaPlacementsById = placementRegistry.byId
export const mediaPublicationBatches = Object.freeze([
  ...(generatedData.batches || []),
])
export const gearImagePublicationBatches = Object.freeze([
  ...generatedGearImages.batches,
])
export const mediaSchemaVersion = generatedData.schemaVersion

export function getMediaAsset(id) {
  return id ? mediaById[id] || null : null
}

export function getMediaPlacement(id) {
  return id ? mediaPlacementsById[id] || null : null
}

export { mediaContract }
