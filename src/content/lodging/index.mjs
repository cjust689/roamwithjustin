import generated from "./generated/data.js"
import { createIdRegistry } from "../contracts.mjs"

if (
  generated.schemaVersion !== 1 ||
  !Array.isArray(generated.partners) ||
  !Array.isArray(generated.stays)
)
  throw Error("Invalid generated lodging schema")
export const generatedLodgingPartners = createIdRegistry(
  generated.partners,
  "Generated lodging Partners"
).records
export const generatedLodgingStays = createIdRegistry(
  generated.stays,
  "Generated lodging stays"
).records
const stayFields = new Set([
  "id",
  "journeyId",
  "partnerId",
  "name",
  "location",
  "blurb",
  "nights",
  "checkIn",
  "checkOut",
  "publicCoordinates",
  "locationPrecision",
  "placeId",
  "visitId",
  "relationship",
  "disclosure",
  "image",
  "media",
  "sourceHash",
])
for (const stay of generatedLodgingStays) {
  if (
    Object.keys(stay).some(key => !stayFields.has(key)) ||
    !/^stay-[a-f0-9]{24}$/.test(stay.id) ||
    !/^[a-f0-9]{64}$/.test(stay.sourceHash || "") ||
    !stay.name ||
    !stay.location ||
    !stay.journeyId ||
    !stay.partnerId
  )
    throw Error("Invalid or private fields in generated lodging stay")
}
for (const partner of generatedLodgingPartners) {
  if (
    Object.keys(partner).some(
      key =>
        ![
          "id",
          "name",
          "kind",
          "label",
          "externalLinks",
          "linkPolicy",
          "evidenceStatus",
          "relationship",
          "disclosure",
        ].includes(key)
    ) ||
    partner.kind !== "lodging" ||
    (partner.linkPolicy && partner.linkPolicy !== "omitted-for-privacy")
  )
    throw Error("Invalid generated lodging Partner")
}
export function validateLodgingReferences({
  journeys,
  partners,
  media,
  places,
}) {
  for (const stay of generatedLodgingStays) {
    const journey = journeys.find(journey => journey.id === stay.journeyId)
    const partner = partners.find(partner => partner.id === stay.partnerId)
    if (
      !journey ||
      !partner ||
      partner.name !== stay.name ||
      partner.kind !== "lodging"
    )
      throw Error(`Invalid lodging relation ${stay.id}`)
    for (const usage of [
      ...(stay.media || []),
      ...(stay.image ? [stay.image] : []),
    ]) {
      const asset = media.find(asset => asset.id === usage.assetId)
      if (!asset || !["owned", "licensed"].includes(asset.rights?.status))
        throw Error(`Invalid lodging media ${stay.id}`)
    }
    if (stay.placeId || stay.visitId) {
      const place = places.find(place => place.id === stay.placeId)
      if (
        !place ||
        !journey.visits.some(
          visit => visit.id === stay.visitId && visit.placeId === place.id
        ) ||
        JSON.stringify(place.coordinates) !==
          JSON.stringify(stay.publicCoordinates)
      )
        throw Error(`Invalid reviewed lodging map binding ${stay.id}`)
    }
  }
}
export function composeJourneyLodging(journey) {
  const stays = generatedLodgingStays.filter(
    stay => stay.journeyId === journey.id
  )
  return stays.length
    ? { ...journey, lodging: [...(journey.lodging || []), ...stays] }
    : journey
}
