const GEAR_CATEGORIES = Object.freeze([
  "camera",
  "lens",
  "drone",
  "action-camera",
  "bag",
  "tripod",
  "filter",
  "audio",
  "lighting",
  "power",
  "storage",
  "snorkeling",
  "footwear",
  "outerwear",
  "apparel",
  "luggage",
  "travel-accessory",
  "other",
])

const GEAR_USAGE_TYPES = Object.freeze([
  "used",
  "packed",
  "borrowed",
  "rented",
  "considered",
  "recommended",
])

const GEAR_EVIDENCE_STATUSES = Object.freeze([
  "creator-confirmed",
  "metadata-confirmed",
  "media-confirmed",
  "needs-review",
])

const GEAR_VERIFICATION_STATUSES = Object.freeze(["verified", "needs-review"])
const GEAR_VISIBILITIES = Object.freeze(["draft", "published"])
const PUBLIC_GEAR_USAGE_TYPES = Object.freeze(["used", "borrowed", "rented"])

module.exports = Object.freeze({
  schemaVersion: 1,
  GEAR_CATEGORIES,
  GEAR_USAGE_TYPES,
  GEAR_EVIDENCE_STATUSES,
  GEAR_VERIFICATION_STATUSES,
  GEAR_VISIBILITIES,
  PUBLIC_GEAR_USAGE_TYPES,
})
