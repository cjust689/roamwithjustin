import { createIdRegistry } from "../contracts.mjs"
import gearContract from "./contract.js"
import generatedData from "./generated/data.js"

if (generatedData.schemaVersion !== gearContract.schemaVersion) {
  throw new Error(
    `Gear data uses schema version ${generatedData.schemaVersion}; expected ${gearContract.schemaVersion}`
  )
}

const gearRegistry = createIdRegistry(
  generatedData.items || [],
  "Gear registry"
)
const usageRegistry = createIdRegistry(
  generatedData.usage || [],
  "Gear usage registry"
)

export const gearRecords = gearRegistry.records
export const gearById = gearRegistry.byId
export const gearUsageRecords = usageRegistry.records
export const gearUsageById = usageRegistry.byId
export const gearSchemaVersion = generatedData.schemaVersion

export function getGearItem(id) {
  return id ? gearById[id] || null : null
}

export function getGearUsage(id) {
  return id ? gearUsageById[id] || null : null
}

export { gearContract }
