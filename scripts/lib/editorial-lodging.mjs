import { createHash } from "node:crypto"
import {
  validTripCalendarDate,
  tripStayNights,
} from "../../shared/my-atlas-trips.mjs"

export const LODGING_RECORDS_PATH = "src/content/lodging/generated/records.json"
const hash = value =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")
const normalize = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
const text = (value, label, required = false) => {
  const result = String(value || "").trim()
  if (
    (required && !result) ||
    result.length > 8000 ||
    /[<>\p{C};\u2010-\u2015]|(?:^|\s)-(?=\s|$)|(?<!\d):/u.test(result) ||
    /\b(?:coming soon|unconfirmed|unverified|placeholder|pending)\b/i.test(
      result
    )
  )
    throw Error(
      `${label} needs reviewed public copy without markup, workflow labels or disallowed punctuation`
    )
  return result
}
const publicUrl = value => {
  const raw = String(value || "").trim()
  if (!raw) return ""
  let url
  try {
    url = new URL(raw)
  } catch {
    throw Error("Property URL must be a full HTTPS web link")
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    /[\s\\<>\p{C}]/u.test(raw)
  )
    throw Error("Property URL must be a safe HTTPS web link")
  return raw
}
export function lodgingSourceHash(row) {
  return hash(
    Object.fromEntries(
      Object.keys(row)
        .filter(
          key =>
            !/^[a-z]+_/.test(key) &&
            !["Atlas Mode", "Review Status"].includes(key)
        )
        .sort()
        .map(key => [key, String(row[key] || "").trim()])
    )
  )
}
export function selectLodgingRow(
  rows,
  { rowNumber, stayId, apply = false } = {}
) {
  const candidates = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(entry =>
      rowNumber
        ? entry.rowNumber === rowNumber
        : stayId
          ? entry.row.stay_id === stayId
          : ["Preview", "Publish"].includes(entry.row["Atlas Mode"])
    )
  if (candidates.length !== 1)
    throw Error(
      "Select exactly one stay using --row or --stay-id, or flag exactly one row Preview/Publish"
    )
  const selected = candidates[0]
  if (
    !["Preview", "Publish"].includes(selected.row["Atlas Mode"]) ||
    (apply && selected.row["Atlas Mode"] !== "Publish")
  )
    throw Error(
      "Preview requires Atlas Mode Preview/Publish; apply requires Publish"
    )
  if (selected.row["Review Status"] !== "Ready for preview")
    throw Error(
      "Set Review Status to Ready for preview after checking the source facts and public location"
    )
  return selected
}

export function planLodgingImport({
  row,
  sourceKey,
  current,
  journeys,
  partners,
  media,
  places = [],
  placeId = "",
  visitId = "",
}) {
  if (
    current?.schemaVersion !== 1 ||
    !Array.isArray(current.partners) ||
    !Array.isArray(current.stays)
  )
    throw Error("Invalid current lodging records")
  const sourceHash = lodgingSourceHash(row)
  const journeyMatches = journeys.filter(journey =>
    [journey.id, journey.title].some(
      value => normalize(value) === normalize(row["Atlas Journey"])
    )
  )
  if (journeyMatches.length !== 1)
    throw Error("Choose one existing canonical Atlas Journey")
  const journey = journeyMatches[0]
  const boundJourney = String(row.journey_id || "").trim()
  if (boundJourney && boundJourney !== journey.id)
    throw Error("Bound Journey no longer matches the selected Journey")
  const name = text(row["Property Name"], "Property Name", true)
  const location = text(row["Public Location"], "Public Location", true)
  const propertyType = String(row["Property Type"] || "").trim()
  if (
    propertyType &&
    !["Hotel", "Airbnb", "Vacation rental", "Guesthouse", "Other"].includes(
      propertyType
    )
  )
    throw Error("Choose a supported Property Type")
  const blurb = text(row["Atlas Story"], "Atlas Story")
  const url = publicUrl(row["Property URL"])
  const precision = row["Location Precision"]
  if (
    !["Town / area", "Approximate", "Exact public property"].includes(precision)
  )
    throw Error("Choose a public Location Precision")
  if (!url && precision === "Exact public property")
    throw Error(
      "A private property without a public URL must use a town/area or approximate location"
    )
  let coordinates = null
  const rawCoordinates = String(row["Public Coordinates"] || "").trim()
  if (rawCoordinates) {
    const parts = rawCoordinates.split(",").map(value => value.trim())
    if (
      parts.length !== 2 ||
      parts.some(value => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
    )
      throw Error("Public Coordinates must be decimal latitude, longitude")
    const [latitude, longitude] = parts.map(Number)
    if (Math.abs(latitude) > 85.051129 || Math.abs(longitude) > 180)
      throw Error("Public Coordinates are outside map bounds")
    coordinates = [longitude, latitude]
  }
  if (!["No", "Yes"].includes(row["Show on Map"]))
    throw Error("Choose Yes or No for Show on Map")
  let map = null
  if (row["Show on Map"] === "Yes") {
    const targetPlace = placeId || row.place_id
    const targetVisit = visitId || row.visit_id
    const place = places.find(place => place.id === targetPlace)
    const visit = journey.visits.find(
      visit => visit.id === targetVisit && visit.placeId === targetPlace
    )
    if (
      !place ||
      !visit ||
      !coordinates ||
      JSON.stringify(place.coordinates) !== JSON.stringify(coordinates)
    )
      throw Error(
        "Map display requires an explicitly registered Place and matching Journey Visit (--place-id and --visit-id), with the same reviewed public coordinates. Use editorial:register:place for new geography first."
      )
    map = { placeId: place.id, visitId: visit.id }
  }
  const dates = [
    String(row["Check-in Date"] || "").trim(),
    String(row["Check-out Date"] || "").trim(),
  ]
  if (dates.some(date => date && !validTripCalendarDate(date)))
    throw Error("Stay dates must use real YYYY-MM-DD calendar dates")
  if (
    dates.some(Boolean) &&
    (!dates.every(Boolean) || !tripStayNights(...dates))
  )
    throw Error(
      "Supply both stay dates with check-out after check-in, or leave both blank"
    )
  const nights = dates.every(Boolean)
    ? tripStayNights(...dates)
    : row.Nights
      ? Number(row.Nights)
      : null
  if (nights !== null && (!Number.isInteger(nights) || nights < 1))
    throw Error("Nights must be a positive integer")
  if (dates.every(Boolean) && row.Nights && Number(row.Nights) !== nights)
    throw Error("Nights does not match the stay dates")
  const relationship = row.Relationship
  if (
    !["Independent", "Hosted", "Sponsored", "Affiliate", "Mixed"].includes(
      relationship
    )
  )
    throw Error("Review the actual Relationship before preview")
  const disclosure = text(
    row.Disclosure,
    "Disclosure",
    relationship !== "Independent"
  )
  const mediaIds = [
    ...new Set(
      [
        String(row["Cover Asset ID"] || "").trim(),
        ...String(row["Media Asset IDs"] || "")
          .split(",")
          .map(value => value.trim()),
      ].filter(Boolean)
    ),
  ]
  for (const id of mediaIds) {
    const asset = media.find(asset => asset.id === id)
    if (!asset || !["owned", "licensed"].includes(asset.rights?.status))
      throw Error(`Media ${id} must be registered with owned/licensed rights`)
  }
  const coverId = String(row["Cover Asset ID"] || "").trim()
  if (coverId && media.find(asset => asset.id === coverId)?.kind !== "image")
    throw Error("Cover Asset ID must refer to an image")
  const allPartners = [
    ...partners,
    ...current.partners.filter(
      partner => !partners.some(existing => existing.id === partner.id)
    ),
  ]
  const boundPartner = String(row.partner_id || "").trim()
  const generatedPartnerId =
    "lodging-" +
    hash(url ? [url, ""] : [normalize(name), normalize(location)]).slice(0, 24)
  const partnerMatches = allPartners.filter(partner =>
    boundPartner
      ? partner.id === boundPartner
      : partner.kind === "lodging" &&
        (url
          ? Object.values(partner.externalLinks || {}).includes(url)
          : partner.id === generatedPartnerId)
  )
  if (partnerMatches.length > 1)
    throw Error(
      "Property identity is ambiguous; bind an existing partner_id after review"
    )
  let partner = partnerMatches[0]
  if (boundPartner && !partner) throw Error("Bound partner_id does not exist")
  if (
    partner &&
    (partner.kind !== "lodging" ||
      normalize(partner.name) !== normalize(name) ||
      (url && !Object.values(partner.externalLinks || {}).includes(url)) ||
      (!url && Object.values(partner.externalLinks || {}).some(Boolean)))
  )
    throw Error(
      "Property identity or URL differs from the canonical Partner. Review its identity separately before reuse."
    )
  const records = JSON.parse(JSON.stringify(current))
  if (!partner) {
    partner = {
      id: generatedPartnerId,
      name,
      kind: "lodging",
      label: propertyType || "Accommodation",
      externalLinks: url ? { official: url } : {},
      ...(url ? {} : { linkPolicy: "omitted-for-privacy" }),
      evidenceStatus: "owner-supplied",
      relationship: "stayed-at",
      disclosure: "Stayed here during this journey.",
    }
    if (allPartners.some(existing => existing.id === partner.id))
      throw Error("Partner identity collision requires review")
    records.partners.push(partner)
  }
  if (typeof sourceKey !== "string" || !sourceKey)
    throw Error("A stable source row key is required")
  const id =
    String(row.stay_id || "").trim() ||
    "stay-" + hash([sourceKey, sourceHash]).slice(0, 24)
  if (!/^stay-[a-f0-9]{24}$/.test(id)) throw Error("Invalid editorial stay_id")
  const previous = records.stays.find(stay => stay.id === id)
  if (
    (row.stay_id && !previous) ||
    (previous && previous.journeyId !== journey.id)
  )
    throw Error("Bound stay_id is missing or belongs to another Journey")
  // Never copy private notes, Drive locations or unregistered media into public records.
  const stay = {
    id,
    journeyId: journey.id,
    partnerId: partner.id,
    name: partner.name,
    location,
    blurb,
    ...(nights === null ? {} : { nights }),
    ...(dates.every(Boolean) ? { checkIn: dates[0], checkOut: dates[1] } : {}),
    ...(coordinates ? { publicCoordinates: coordinates } : {}),
    locationPrecision: precision,
    ...(map || {}),
    relationship,
    disclosure:
      disclosure ||
      (relationship === "Independent"
        ? "No sponsorship or affiliate relationship is asserted for this stay."
        : ""),
    ...(coverId ? { image: { assetId: coverId, role: "lodging" } } : {}),
    media: mediaIds.map(assetId => ({ assetId, role: "lodging" })),
    sourceHash,
  }
  records.stays = records.stays.filter(stay => stay.id !== id)
  records.stays.push(stay)
  return {
    records,
    stay,
    partner,
    sourceHash,
    summary: {
      action: previous ? "update-stay" : "add-stay",
      journey: journey.title,
      stayId: id,
      property: name,
      location,
      precision,
      coordinates,
      newPartner: !allPartners.some(existing => existing.id === partner.id),
      mediaCount: mediaIds.length,
      map,
      url: `/trips/${journey.slug}`,
    },
  }
}

export function lodgingWriteback({
  sheetId,
  headers,
  rows,
  selected,
  expectedHash,
  values,
}) {
  const row = rows[selected.rowNumber - 2]
  if (
    !row ||
    lodgingSourceHash(row) !== expectedHash ||
    row["Atlas Mode"] !== "Publish" ||
    row["Review Status"] !== "Ready for preview" ||
    (row.stay_id && row.stay_id !== values.stay_id)
  )
    throw Error("Stay row changed before write-back; re-preview it")
  return Object.entries(values).map(([name, value]) => {
    const column = headers.indexOf(name)
    if (column < 0) throw Error(`Missing managed column ${name}`)
    return {
      updateCells: {
        start: {
          sheetId,
          rowIndex: selected.rowNumber - 1,
          columnIndex: column,
        },
        rows: [
          { values: [{ userEnteredValue: { stringValue: String(value) } }] },
        ],
        fields: "userEnteredValue",
      },
    }
  })
}
