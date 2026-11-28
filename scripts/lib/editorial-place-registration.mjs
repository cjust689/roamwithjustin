import crypto from "node:crypto"
import { isCoordinatePair } from "../../src/content/contracts.mjs"
import {
  NEW_PLACE_REQUEST_LABEL,
  placeRegistrationSourceHash,
  resolveCatalogValue,
} from "./editorial-baseline.mjs"

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const atlasDestinations = new Set(["Atlas", "Both"])
const publicDashPunctuation = /[-\u2010-\u2015]/u

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function requiredPublicCopy(value, label) {
  const copy = String(value || "").trim()
  if (!copy) throw new Error(`${label} is required`)
  if (publicDashPunctuation.test(copy)) {
    throw new Error(
      `${label} uses dash punctuation that is not allowed in public copy`
    )
  }
  return copy
}

function optionalHttpsUrl(value, label) {
  const url = String(value || "").trim()
  if (url && !/^https:\/\//i.test(url)) {
    throw new Error(`${label} must use https`)
  }
  return url
}

function finiteNumber(value, label, fallback = null) {
  if (value === null || value === undefined || value === "") {
    if (fallback !== null) return fallback
    throw new Error(`${label} is required`)
  }
  const result = Number(value)
  if (!Number.isFinite(result)) throw new Error(`${label} must be a number`)
  return result
}

function requestedCoordinates(row, options) {
  const longitudeInput = String(options.longitude ?? "").trim()
  const latitudeInput = String(options.latitude ?? "").trim()
  if (longitudeInput || latitudeInput) {
    if (!longitudeInput || !latitudeInput) {
      throw new Error("--longitude and --latitude must be provided together")
    }
    return [
      finiteNumber(longitudeInput, "--longitude"),
      finiteNumber(latitudeInput, "--latitude"),
    ]
  }

  const input = String(row["Atlas Coordinates"] || "").trim()
  const match = input.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/
  )
  if (!match) {
    throw new Error(
      'Atlas Coordinates must use "latitude, longitude" for a new Place'
    )
  }
  return [
    finiteNumber(match[2], "Atlas Coordinates longitude"),
    finiteNumber(match[1], "Atlas Coordinates latitude"),
  ]
}

function cloneRecords(records) {
  return JSON.parse(JSON.stringify(records))
}

function requireGeneratedShape(records) {
  if (records?.schemaVersion !== 1) {
    throw new Error("Generated geography must use schema version 1")
  }
  for (const field of ["places", "visits", "atlasNodes", "registrations"]) {
    if (!Array.isArray(records[field])) {
      throw new Error(`Generated geography field "${field}" must be an array`)
    }
  }
}

function exactJourney(row, catalog) {
  const result = resolveCatalogValue(row["Atlas Journey"], "journey", catalog)
  if (result.status !== "matched") {
    throw new Error(
      `Atlas Journey ${String(row["Atlas Journey"] || "").trim() || "is blank"} does not resolve to one canonical Journey`
    )
  }
  return result.matches[0]
}

function parsePlaceRequest(row) {
  const input = String(row["Atlas Place"] || "").trim()
  if (normalize(input) === normalize(NEW_PLACE_REQUEST_LABEL)) {
    return requiredPublicCopy(row.Location, "Location for the new Place")
  }
  const match = input.match(/^new:\s*(.+)$/i)
  if (!match) {
    throw new Error(
      `Atlas Place must use the explicit ${NEW_PLACE_REQUEST_LABEL} choice`
    )
  }
  return requiredPublicCopy(match[1], "Requested Place name")
}

function resolveExistingPlace({ requestedName, requestedId, catalog, places }) {
  if (requestedId) {
    if (!idPattern.test(requestedId)) {
      throw new Error("--place-id must be a lowercase hyphenated ID")
    }
    const byId = places.find(place => place.id === requestedId) || null
    if (byId) return byId
    const byName = resolveCatalogValue(requestedName, "place", catalog)
    if (byName.status === "matched") {
      throw new Error(
        `Requested Place ${requestedName} is already registered as ${byName.matches[0].id}`
      )
    }
    if (byName.status === "ambiguous") {
      throw new Error(
        `Requested Place ${requestedName} is ambiguous; use its existing canonical ID`
      )
    }
    return null
  }
  const result = resolveCatalogValue(requestedName, "place", catalog)
  if (result.status === "ambiguous") {
    throw new Error(
      `Requested Place ${requestedName} is ambiguous; pass --place-id`
    )
  }
  if (result.status === "matched") {
    return places.find(place => place.id === result.matches[0].id) || null
  }
  return null
}

function resolveParentPlace(value, catalog, places) {
  const input = String(value || "").trim()
  if (!input) {
    throw new Error(
      "--parent-place is required for a new Place; use none for a top-level Place"
    )
  }
  if (normalize(input) === "none") return null
  const result = resolveCatalogValue(input, "place", catalog)
  if (result.status !== "matched") {
    throw new Error(
      `Parent Place ${input} does not resolve to one canonical Place`
    )
  }
  return places.find(place => place.id === result.matches[0].id) || null
}

function resolveOrderAnchor(value, journey, places) {
  const input = String(value || "").trim()
  if (!input || normalize(input) === "end") return null
  const placeById = new Map(places.map(place => [place.id, place]))
  const matches = journey.visits.filter(visit => {
    const place = placeById.get(visit.placeId)
    return [visit.id, visit.placeId, place?.name].some(
      candidate => normalize(candidate) === normalize(input)
    )
  })
  if (matches.length !== 1) {
    throw new Error(
      `--after-place ${input} resolved to ${matches.length} Visits in ${journey.title}`
    )
  }
  return matches[0].placeId
}

function nextPlaceId({ requestedName, requestedId, parentPlace, places }) {
  if (requestedId) {
    if (!idPattern.test(requestedId)) {
      throw new Error("--place-id must be a lowercase hyphenated ID")
    }
    if (places.some(place => place.id === requestedId)) {
      throw new Error(`Place ID ${requestedId} is already registered`)
    }
    return requestedId
  }
  const base = slugify(requestedName)
  if (!base) throw new Error("Requested Place name cannot produce a stable ID")
  if (!places.some(place => place.id === base)) return base
  const scoped = slugify(`${base}-${parentPlace?.id || "place"}`)
  if (!places.some(place => place.id === scoped)) return scoped
  throw new Error("A stable Place ID could not be inferred; pass --place-id")
}

function nextAtlasNodeId({ requestedId, placeId, journeyId, atlasNodes }) {
  if (requestedId) {
    if (!idPattern.test(requestedId)) {
      throw new Error("--atlas-node-id must be a lowercase hyphenated ID")
    }
    if (atlasNodes.some(node => node.id === requestedId)) {
      throw new Error(`Atlas node ID ${requestedId} is already registered`)
    }
    return requestedId
  }
  const candidate = atlasNodes.some(node => node.id === placeId)
    ? `${journeyId}-${placeId}`
    : placeId
  if (atlasNodes.some(node => node.id === candidate)) {
    throw new Error(
      "A stable Atlas node ID could not be inferred; pass --atlas-node-id"
    )
  }
  return candidate
}

function categoryLabel(category) {
  const value = String(category || "destination")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
  return value ? value[0].toUpperCase() + value.slice(1) : "Journey place"
}

export function selectPlaceRegistrationRow({ rows, account = "Roam", postId }) {
  if (!String(postId || "").trim()) {
    throw new Error("Place registration requires --post-id")
  }
  const matches = (rows || [])
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(
      entry =>
        normalize(entry.row.Account) === normalize(account) &&
        String(entry.row.post_id || "").trim() === String(postId).trim()
    )
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${account} row with post_id ${postId}, found ${matches.length}`
    )
  }
  const selected = matches[0]
  if (!atlasDestinations.has(String(selected.row["Publish To"] || "").trim())) {
    throw new Error("Place registration requires Publish To Atlas or Both")
  }
  if (String(selected.row["Atlas Mode"] || "").trim() !== "Off") {
    throw new Error("Atlas Mode must remain Off while registering a Place")
  }
  if (normalize(selected.row["Atlas Stop"]) !== "yes") {
    throw new Error("Place registration requires Atlas Stop Yes")
  }
  return selected
}

export function planPlaceRegistration({
  current,
  row,
  catalog,
  journeys,
  places,
  atlasNodes,
  options = {},
}) {
  requireGeneratedShape(current)
  const postId = String(row.post_id || "").trim()
  if (!postId) throw new Error("A stable post_id is required")

  const requestedName = parsePlaceRequest(row)
  const journeyRecord = exactJourney(row, catalog)
  const journey = journeys.find(item => item.id === journeyRecord.id)
  if (!journey) throw new Error(`Unknown Journey ${journeyRecord.id}`)
  const existingRegistration = current.registrations.find(
    item => item.postId === postId
  )
  if (existingRegistration) {
    const place = places.find(item => item.id === existingRegistration.placeId)
    const visit = current.visits.find(
      item => item.id === existingRegistration.visitId
    )
    const atlasNode = atlasNodes.find(
      item => item.id === existingRegistration.atlasNodeId
    )
    const sourceHash = placeRegistrationSourceHash(row)
    if (
      !place ||
      !visit ||
      !atlasNode ||
      existingRegistration.journeyId !== journey.id ||
      normalize(place.name) !== normalize(requestedName) ||
      existingRegistration.sourceHash !== sourceHash
    ) {
      throw new Error(
        `Post ${postId} has a geography registration that no longer matches its Sheet request`
      )
    }
    return {
      sourceHash,
      requestedName,
      createdPlace: existingRegistration.createdPlace,
      createdAtlasNode: existingRegistration.createdAtlasNode,
      resumed: true,
      place,
      visit,
      atlasNode,
      registration: existingRegistration,
      records: cloneRecords(current),
      summary: {
        action: "resume-registration",
        journey: journey.title,
        place: place.name,
        order: visit.insertAfterPlaceId
          ? `after ${visit.insertAfterPlaceId}`
          : "end of Journey",
        atlasUrl: `/atlas/${atlasNode.id}`,
      },
    }
  }

  let place = resolveExistingPlace({
    requestedName,
    requestedId: options.placeId,
    catalog,
    places,
  })
  const createdPlace = !place
  if (place && journey.visits.some(visit => visit.placeId === place.id)) {
    throw new Error(
      `${place.name} already has a Visit in ${journey.title}; select it from Atlas Place`
    )
  }

  if (!place) {
    const parentPlace = resolveParentPlace(options.parentPlace, catalog, places)
    const coordinates = requestedCoordinates(row, options)
    if (!isCoordinatePair(coordinates)) {
      throw new Error(
        "Requested Place coordinates are outside valid longitude or latitude bounds"
      )
    }
    const category = String(options.category || "destination").trim()
    const summary = requiredPublicCopy(options.summary, "--summary")
    const placeId = nextPlaceId({
      requestedName,
      requestedId: options.placeId,
      parentPlace,
      places,
    })
    const maps = optionalHttpsUrl(options.mapsUrl, "--maps-url")
    const official = optionalHttpsUrl(options.officialUrl, "--official-url")
    place = {
      id: placeId,
      name: requestedName,
      coordinates,
      parentPlaceId: parentPlace?.id || null,
      countryCode:
        String(options.countryCode || "")
          .trim()
          .toUpperCase() ||
        parentPlace?.countryCode ||
        null,
      regionCode: String(options.regionCode || "").trim() || null,
      category,
      evidenceStatus: "confirmed",
      coordinatePrecision: String(
        options.coordinatePrecision || "approximate"
      ).trim(),
      description: summary,
      externalLinks: {
        ...(maps ? { maps } : {}),
        ...(official ? { official } : {}),
      },
      verificationNotes: `Registered explicitly from Sheet post ${postId}.`,
    }
  }

  if (!isCoordinatePair(place.coordinates)) {
    throw new Error(
      `Existing Place ${place.id} has no Atlas-ready coordinates and requires curated repair`
    )
  }

  const rootNodes = atlasNodes.filter(
    node => node.journeyId === journey.id && !node.parentId
  )
  if (rootNodes.length !== 1) {
    throw new Error(
      `${journey.title} must have exactly one Atlas root before registering a Place`
    )
  }
  const atlasParentNode = place.parentPlaceId
    ? atlasNodes.find(
        node =>
          node.journeyId === journey.id && node.placeId === place.parentPlaceId
      )
    : rootNodes[0]
  if (!atlasParentNode) {
    throw new Error(
      `Parent Place ${place.parentPlaceId} must have an Atlas node in ${journey.title}`
    )
  }
  const visitId = `${journey.id}-${place.id}`
  if (
    journey.visits.some(visit => visit.id === visitId) ||
    current.visits.some(visit => visit.id === visitId)
  ) {
    throw new Error(`Visit ID ${visitId} is already registered`)
  }
  const insertAfterPlaceId = resolveOrderAnchor(
    options.afterPlace,
    journey,
    places
  )
  const category = String(place.category || options.category || "destination")
  const visit = {
    id: visitId,
    journeyId: journey.id,
    insertAfterPlaceId,
    sourcePostId: postId,
    legacyId: place.id,
    placeId: place.id,
    date: String(row.Date || "").trim() || null,
    visitStatus: "visited",
    evidenceStatus: "confirmed",
    type: category,
    description: "",
    summary: "",
    notes: [],
    media: [],
    socialLinks: [],
  }
  const existingAtlasNode = atlasNodes.find(
    node => node.journeyId === journey.id && node.placeId === place.id
  )
  const createdAtlasNode = !existingAtlasNode
  const atlasNode = existingAtlasNode || {
    id: nextAtlasNodeId({
      requestedId: options.atlasNodeId,
      placeId: place.id,
      journeyId: journey.id,
      atlasNodes,
    }),
    placeId: place.id,
    journeyId: journey.id,
    visitId,
    parentId: atlasParentNode.id,
    eyebrow: "Journey place",
    category: categoryLabel(category),
    camera: {
      center: [...place.coordinates],
      zoom: finiteNumber(options.zoom, "--zoom", 11.4),
      pitch: finiteNumber(options.pitch, "--pitch", 52),
      bearing: finiteNumber(options.bearing, "--bearing", 0),
    },
    relatedIds: [],
  }
  const sourceHash = placeRegistrationSourceHash(row)
  const registrationId = `geography-${slugify(postId)}-${crypto
    .createHash("sha256")
    .update(`${sourceHash}\n${journey.id}\n${place.id}`)
    .digest("hex")
    .slice(0, 12)}`
  const registration = {
    id: registrationId,
    postId,
    sourceHash,
    journeyId: journey.id,
    placeId: place.id,
    visitId,
    atlasNodeId: atlasNode.id,
    createdPlace,
    createdAtlasNode,
  }

  const records = cloneRecords(current)
  if (createdPlace) records.places.push(place)
  records.visits.push(visit)
  if (createdAtlasNode) records.atlasNodes.push(atlasNode)
  records.registrations.push(registration)

  return {
    sourceHash,
    requestedName,
    createdPlace,
    createdAtlasNode,
    resumed: false,
    place,
    visit,
    atlasNode,
    registration,
    records,
    summary: {
      action: createdPlace ? "create-place-and-visit" : "create-visit",
      journey: journey.title,
      place: place.name,
      order: insertAfterPlaceId
        ? `after ${insertAfterPlaceId}`
        : "end of Journey",
      atlasUrl: `/atlas/${atlasNode.id}`,
    },
  }
}

export function serializeGeographyRecords(records) {
  requireGeneratedShape(records)
  return `${JSON.stringify(records, null, 2)}\n`
}
