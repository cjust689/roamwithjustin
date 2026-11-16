import { createIdRegistry, isCoordinatePair } from "../contracts.mjs"
import generated from "./generated/data.js"

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

if (generated.schemaVersion !== 1) {
  throw new Error(
    `Generated geography uses schema version ${generated.schemaVersion}; expected 1`
  )
}

for (const field of ["places", "visits", "atlasNodes", "registrations"]) {
  if (!Array.isArray(generated[field])) {
    throw new Error(`Generated geography field "${field}" must be an array`)
  }
}

const placeRegistry = createIdRegistry(
  generated.places,
  "Generated Place registry"
)
const visitRegistry = createIdRegistry(
  generated.visits,
  "Generated Visit registry"
)
const atlasNodeRegistry = createIdRegistry(
  generated.atlasNodes,
  "Generated Atlas presentation registry"
)
const registrationRegistry = createIdRegistry(
  generated.registrations,
  "Generated geography registration registry"
)

for (const place of placeRegistry.records) {
  if (
    !idPattern.test(place.id) ||
    !String(place.name || "").trim() ||
    !isCoordinatePair(place.coordinates)
  ) {
    throw new Error(
      `Generated Place "${place.id}" has invalid identity or coordinates`
    )
  }
}

for (const visit of visitRegistry.records) {
  if (
    !idPattern.test(visit.id) ||
    !idPattern.test(visit.journeyId || "") ||
    !idPattern.test(visit.placeId || "")
  ) {
    throw new Error(`Generated Visit "${visit.id}" has invalid identity`)
  }
}

for (const node of atlasNodeRegistry.records) {
  if (
    !idPattern.test(node.id) ||
    !idPattern.test(node.journeyId || "") ||
    !idPattern.test(node.placeId || "") ||
    !idPattern.test(node.visitId || "") ||
    !isCoordinatePair(node.camera?.center)
  ) {
    throw new Error(`Generated Atlas presentation "${node.id}" is invalid`)
  }
}

export const generatedPlaceRecords = placeRegistry.records
export const generatedVisitRecords = visitRegistry.records
export const generatedAtlasPresentation = atlasNodeRegistry.records
export const geographyRegistrationRecords = registrationRegistry.records
export const generatedGeography = generated
