import {
  getJourney,
  getJourneyVisit,
  getJourneyVisitById,
  journeyRecords,
} from "../journeys/index.mjs"
import { getPlace } from "../places/index.mjs"
import { resolveMediaList, resolveMediaReference } from "./media.mjs"

function firstSocialLink(record, provider) {
  return (
    record?.socialLinks?.find(link => !provider || link.provider === provider)
      ?.url || ""
  )
}

function uniqueMedia(items) {
  return items.filter(
    (item, index, all) =>
      item?.src &&
      all.findIndex(
        candidate =>
          candidate?.kind === item.kind && candidate?.src === item.src
      ) === index
  )
}

function resolvedSource(reference) {
  return resolveMediaReference(reference)?.src || ""
}

function resolveLodgingImage(reference) {
  if (!reference) return ""
  if (reference.assetId) return resolvedSource(reference)
  return reference.url || reference.src || ""
}

export function buildTripLocationView(journey, visit) {
  const place = getPlace(visit.placeId)
  if (!place) return null

  // A visit with no verified image intentionally falls back to its Journey
  // cover instead of inventing a location-specific asset association.
  const hero = resolveMediaReference(visit.hero || journey.hero)
  const media = resolveMediaList(visit.media)
  const gallery = media
    .filter(item => item.kind === "image")
    .map(item => item.src)

  return {
    id: visit.legacyId || visit.id,
    visitId: visit.id,
    journeyId: journey.id,
    canonicalId: place.id,
    name: place.name,
    description: visit.description || place.description,
    type: visit.type || place.category,
    droneAllowed: Boolean(visit.droneAllowed),
    image: hero?.src || "",
    gallery,
    media,
    notes: [...(visit.notes || [])],
    video: firstSocialLink(visit, "instagram"),
    link: place.externalLinks?.official || "",
    evidenceStatus: visit.evidenceStatus,
    visitStatus: visit.visitStatus,
  }
}

export function buildTripViewModel(journey) {
  if (!journey) return null

  const locations = journey.visits
    .map(visit => buildTripLocationView(journey, visit))
    .filter(Boolean)
  const locationByVisitId = new Map(
    locations.map(location => [location.visitId, location])
  )

  return {
    id: journey.slug,
    journeyId: journey.id,
    name: journey.title,
    comingSoon: journey.publicationStatus === "coming-soon",
    cover: resolvedSource(journey.hero),
    fullImage: resolvedSource(journey.fullImage),
    gallery: resolveMediaList(journey.gallery).map(item => item.src),
    description: journey.description,
    dates: journey.dateRange?.label || "",
    duration: journey.duration,
    who: journey.audience,
    costLevel: journey.costLevel,
    bestTimeToGo: journey.bestTimeToGo,
    gearHighlights: [...(journey.gearHighlights || [])],
    travelNotes: [...(journey.travelNotes || [])],
    tips: [...(journey.tips || [])],
    lodging: (journey.lodging || []).map(stay => ({
      ...stay,
      image: resolveLodgingImage(stay.image),
    })),
    locations,
    days: (journey.days || []).map(day => ({
      label: day.label,
      summary: day.summary,
      locations: (day.visits || []).map(entry => ({
        ref: locationByVisitId.get(entry.visitId)?.id || entry.visitId,
        ...(entry.notes ? { notes: entry.notes } : {}),
      })),
      routes: [...(day.routes || [])],
    })),
    reel: firstSocialLink(journey, "instagram"),
    featuredShots: resolveMediaList(journey.featuredMedia).map(media => ({
      img: media.src,
      caption: media.caption || "",
    })),
  }
}

export function addTripAtlasNavigation(trip, atlasNodes = []) {
  const journeyNodes = atlasNodes.filter(
    node => node.journeyId === trip.journeyId
  )
  const rootNode = journeyNodes.find(node => !node.parentId) || null
  const atlasHref = rootNode ? `/atlas/${rootNode.id}` : ""

  return {
    ...trip,
    atlasHref,
    // Exact Place-to-node matches let a story card open the corresponding
    // pin. Visits without a public pin intentionally fall back to the trip's
    // Atlas root instead of inventing map presentation data here.
    locations: trip.locations.map(location => {
      const exactNode = journeyNodes.find(
        node => node.placeId === location.canonicalId
      )
      return {
        ...location,
        atlasExact: Boolean(exactNode),
        atlasHref: exactNode ? `/atlas/${exactNode.id}` : atlasHref,
      }
    }),
  }
}

function atlasActions(place, journey) {
  const actions = []

  if (place.externalLinks?.maps) {
    actions.push({
      label: "View on Google Maps",
      href: place.externalLinks.maps,
      type: "external",
    })
  }
  if (place.externalLinks?.official) {
    actions.push({
      label: "Official website",
      href: place.externalLinks.official,
      type: "external",
    })
  }
  if (journey?.slug) {
    actions.push({
      label: "Read the trip story",
      href: "/trips/" + journey.slug,
      type: "internal",
    })
  }

  return actions
}

export function buildAtlasNodeView(presentation) {
  const place = getPlace(presentation.placeId)
  const journey = getJourney(presentation.journeyId)
  const visit = presentation.visitId
    ? getJourneyVisitById(presentation.journeyId, presentation.visitId)
    : getJourneyVisit(presentation.journeyId, presentation.placeId)

  if (!place || !journey) return null

  const hero = resolveMediaReference(presentation.hero || visit?.hero)
  const media = uniqueMedia(
    resolveMediaList(
      presentation.media || [visit?.hero, ...(visit?.media || [])]
    )
  )
  const personalNote =
    visit?.summary || visit?.description || journey.atlasNotes?.[place.id] || ""

  return {
    id: presentation.id,
    placeId: place.id,
    journeyId: journey.id,
    parentId: presentation.parentId,
    title: place.name,
    eyebrow: presentation.eyebrow,
    category: presentation.category,
    coordinates: place.coordinates ? [...place.coordinates] : null,
    camera: presentation.camera,
    summary: place.description,
    personalNote,
    image: hero?.src || "",
    media,
    childIds: [],
    relatedIds: [...(presentation.relatedIds || [])],
    actions: atlasActions(place, journey),
    evidenceStatus: visit?.evidenceStatus || journey.evidenceStatus,
    visitStatus: visit?.visitStatus || null,
  }
}

export function orderAtlasNodesByJourney(nodes = []) {
  const originalOrder = new Map(nodes.map((node, index) => [node.id, index]))
  const journeyOrder = new Map()

  journeyRecords.forEach(journey => {
    journey.visits.forEach((visit, index) => {
      if (!journeyOrder.has(visit.placeId)) {
        journeyOrder.set(visit.placeId, index)
      }
    })
  })

  return [...nodes].sort((left, right) => {
    const leftOrder = journeyOrder.get(left.placeId || left.id)
    const rightOrder = journeyOrder.get(right.placeId || right.id)

    if (leftOrder == null && rightOrder == null) {
      return originalOrder.get(left.id) - originalOrder.get(right.id)
    }
    if (leftOrder == null) return 1
    if (rightOrder == null) return -1
    return leftOrder - rightOrder
  })
}

// Guided playback is a derived Journey view. It deliberately includes only
// map-visible leaf nodes, while visit order and optional transition facts stay
// owned by the canonical Journey record.
export function buildGuidedJourneyViewModel(journey, atlasNodes = []) {
  if (!journey) return null

  const firstVisitByPlaceId = new Map()
  const visitOrder = new Map()
  journey.visits.forEach((visit, index) => {
    if (!firstVisitByPlaceId.has(visit.placeId)) {
      firstVisitByPlaceId.set(visit.placeId, visit)
      visitOrder.set(visit.placeId, index)
    }
  })

  const candidates = atlasNodes.filter(
    node =>
      node.journeyId === journey.id &&
      node.childIds?.length === 0 &&
      Array.isArray(node.coordinates)
  )
  const orderedNodes = [...candidates].sort(
    (left, right) =>
      (visitOrder.get(left.placeId) ?? Number.MAX_SAFE_INTEGER) -
      (visitOrder.get(right.placeId) ?? Number.MAX_SAFE_INTEGER)
  )

  if (orderedNodes.length < 2) return null

  const stops = orderedNodes.map((node, index) => {
    const visit = firstVisitByPlaceId.get(node.placeId)
    return Object.freeze({
      ...node,
      position: index + 1,
      transitionToNext: visit?.transitionToNext || null,
    })
  })

  return Object.freeze({
    id: journey.id,
    title: journey.title,
    description: journey.description,
    stopCount: stops.length,
    stops: Object.freeze(stops),
  })
}
