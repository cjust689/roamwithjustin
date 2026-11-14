export const MEDIA_KINDS = Object.freeze(["image", "video"])
export const MEDIA_PROVIDERS = Object.freeze(["local", "r2"])

/**
 * Canonical content contracts.
 *
 * These typedefs document the authoring shape without adding a TypeScript or
 * runtime-schema dependency. Keep intrinsic facts on the records that own
 * them; context-specific presentation belongs on MediaUsage instead.
 *
 * @typedef {Object} MediaUsage
 * @property {string} assetId Stable ID from the Media registry.
 * @property {"hero"|"gallery"|"thumbnail"|string} [role]
 * @property {string} [caption]
 * @property {string} [alt]
 * @property {{x: number, y: number}} [focalPoint]
 *
 * @typedef {Object} MediaAsset
 * @property {string} id
 * @property {"image"|"video"} kind
 * @property {{provider: "local"|"r2", path?: string, objectKey?: string}} source
 * @property {{mimeType: string, width?: number|null, height?: number|null, durationSeconds?: number|null}} intrinsic
 * @property {{owner: string, status: string}} rights
 * @property {{placeId?: string|null, capturedAt?: string|null}} capture
 * @property {string} [posterAssetId]
 * @property {string} [defaultAlt]
 *
 * @typedef {Object} Place
 * @property {string} id Canonical geographic identity; never a trip stop ID.
 * @property {string} name
 * @property {[number, number]|null} coordinates Longitude first, then latitude; null until verified.
 * @property {string|null} parentPlaceId Geographic containment only.
 * @property {string} evidenceStatus
 *
 * @typedef {Object} JourneyVisit
 * @property {string} id Identity for this place on this particular journey.
 * @property {string} placeId Canonical Place ID.
 * @property {string|null} date Leave null when the exact date is unverified.
 * @property {MediaUsage} [hero]
 * @property {MediaUsage[]} [media]
 *
 * @typedef {Object} Partner
 * @property {string} id Stable provider or partner identity.
 * @property {string} name
 * @property {"operator"|string} kind
 * @property {string} officialUrl
 * @property {string} relationship Describes the real Journey relationship.
 * @property {string} disclosure Prevents a provider link from implying sponsorship or affiliation.
 *
 * Journey day records may reference `partnerIds`. Selectors resolve those IDs
 * into public links so business identity does not get duplicated in stories.
 */

// Registries reject duplicate or missing IDs as soon as content is imported,
// while the richer cross-registry checks remain in scripts/validate-content.js.
export function createIdRegistry(records, label) {
  const byId = {}

  records.forEach(record => {
    if (!record || typeof record.id !== "string" || !record.id.trim()) {
      throw new Error(label + " contains a record without a valid id")
    }

    if (Object.prototype.hasOwnProperty.call(byId, record.id)) {
      throw new Error(label + ' contains duplicate id "' + record.id + '"')
    }

    byId[record.id] = Object.freeze(record)
  })

  return Object.freeze({
    records: Object.freeze([...records]),
    byId: Object.freeze(byId),
  })
}

export function isCoordinatePair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  )
}
