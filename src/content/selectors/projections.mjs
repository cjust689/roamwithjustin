import {
  getJourney,
  getJourneyVisit,
  getJourneyVisitById,
  journeyRecords,
} from "../journeys/index.mjs"
import { getPlace } from "../places/index.mjs"
import { getJourneyCommercialOffers, getPartner } from "../partners/index.mjs"
import { getJourneyGear } from "./gear.mjs"
import {
  getJourneyExperienceViews,
  experienceCardView,
} from "./experiences.mjs"
import {
  getJourneyPublishedMedia,
  getVisitPublishedMedia,
  resolveMediaList,
  resolveMediaReference,
} from "./media.mjs"

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

function preferredExternalLink(externalLinks = {}) {
  if (externalLinks.official) {
    return { href: externalLinks.official, kind: "official" }
  }
  if (externalLinks.directory) {
    return { href: externalLinks.directory, kind: "directory" }
  }
  if (externalLinks.platform) {
    return { href: externalLinks.platform, kind: "platform" }
  }
  if (externalLinks.maps) {
    return { href: externalLinks.maps, kind: "maps" }
  }

  return { href: "", kind: "" }
}

function analyticsPartnerLinkType(externalLink) {
  try {
    const hostname = new URL(externalLink.href).hostname.toLowerCase()
    if (hostname === "maps.google.com" || hostname.endsWith(".google.com")) {
      return "maps"
    }
  } catch (error) {
    return "website"
  }

  return externalLink.kind === "platform" ? "booking" : "website"
}

function journeyLodgingView(stay) {
  const partner = getPartner(stay.partnerId)
  const externalLink = preferredExternalLink(partner?.externalLinks)

  return {
    ...stay,
    id: stay.id || partner?.id || stay.partnerId || "",
    name: partner?.name || stay.name,
    image: resolveLodgingImage(stay.image),
    link: externalLink.href,
    linkType: ["Affiliate", "Mixed"].includes(stay.relationship)
      ? "affiliate"
      : analyticsPartnerLinkType(externalLink),
    disclosure: stay.disclosure || partner?.disclosure || "",
  }
}

function journeyCommercialOfferViews(journey) {
  if (journey.publicationStatus !== "published") return []

  return getJourneyCommercialOffers(journey.id).flatMap(offer => {
    const partner = getPartner(offer.partnerId)
    if (!partner) return []

    return [
      {
        ...offer,
        partnerName: partner.name,
        disclosure: partner.disclosure,
      },
    ]
  })
}

function journeyPreviewCopy(journey) {
  return journey.description || ""
}

function hasJourneyStory(journey) {
  return Boolean(journey?.slug)
}

function journeyProgressNote(journey) {
  return journey?.publicationStatus === "published"
    ? ""
    : "I’m adding more places, stories, photographs, and films from this trip over time. Check back for updates."
}

function journeyChapterViews(journey) {
  return (journey?.days || []).map((day, index) => ({
    id: `${journey.id}-chapter-${index + 1}`,
    position: index + 1,
    label: day.label,
    summary: day.summary || "",
    visitIds: (day.visits || []).map(entry => entry.visitId).filter(Boolean),
  }))
}

function atlasExperienceCardView(experience) {
  const card = experienceCardView(experience)
  const [moment] = experience.moments || []

  if (
    experience.moments?.length !== 1 ||
    !moment?.title ||
    moment.title === experience.title
  ) {
    return card
  }

  return {
    ...card,
    title: moment.title,
    contextLabel: experience.title,
  }
}

function atlasStoryRelationships(journey, visit) {
  if (!visit || !hasJourneyStory(journey)) {
    return { storyChapters: [], storyExperiences: [] }
  }

  return {
    // A Visit may appear in several Journey chapters. Keep every explicit
    // occurrence instead of collapsing the relationship to a single day.
    storyChapters: journeyChapterViews(journey)
      .filter(chapter => chapter.visitIds.includes(visit.id))
      .map(chapter => {
        const view = { ...chapter }
        delete view.visitIds
        return view
      }),
    // Experiences are stop-specific only when their canonical record owns
    // both the matching Visit and Place IDs.
    storyExperiences: getJourneyExperienceViews(journey.id)
      .filter(
        experience =>
          experience.visitId === visit.id &&
          experience.placeId === visit.placeId
      )
      .map(experience => ({
        id: `experience-${experience.slug}`,
        title: experience.title,
        summary: experience.summary,
        card: atlasExperienceCardView(experience),
        // Keep the full canonical Moment projection beside the compact card.
        // The primary Atlas can show it directly at the selected stop while
        // the existing Journey reader remains available as a deeper path.
        moments: experience.moments,
      })),
  }
}

function atlasStoryLead(journey) {
  if (!hasJourneyStory(journey)) return null

  const hero = resolveMediaReference(journey.hero)

  return {
    title: journey.title,
    excerpt: journey.description || "",
    image: hero?.src || "",
    imageAlt: hero?.alt || `${journey.title} story photograph`,
    href: `/trips/${journey.slug}`,
    publicStoryId: journey.id,
    progressNote: journeyProgressNote(journey),
  }
}

function publicTaxonomyLabel(value) {
  if (!value) return ""
  return value
    .split("-")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function journeyGearHighlights(journey, canonicalGear) {
  const canonical = canonicalGear.map(item => ({
    gearId: item.id,
    name: item.name,
    category: item.category,
    notes: item.notes || item.whyItWorked,
    link: item.primaryLink?.url || "",
    rel: item.primaryLink?.rel || "noopener noreferrer",
    affiliate: Boolean(item.primaryLink?.affiliate),
    partnerId: item.primaryLink?.partnerId || "",
    linkType: item.primaryLink?.linkType || "website",
    disclosure: item.primaryLink?.disclosure || "",
    canonical: true,
  }))
  const canonicalNames = new Set(
    canonical.map(item => item.name.trim().toLowerCase())
  )
  const legacy = (journey.gearHighlights || []).filter(
    item => !canonicalNames.has(item.name.trim().toLowerCase())
  )

  // Existing journey arrays remain a compatibility fallback while verified
  // products move into the generated canonical Gear/Usage records.
  return [...canonical, ...legacy]
}

export function buildTripLocationView(journey, visit) {
  const place = getPlace(visit.placeId)
  if (!place) return null

  const media = uniqueMedia([
    ...resolveMediaList(visit.media),
    ...getVisitPublishedMedia(journey.id, visit.id),
  ])
  // Explicit editorial heroes always win. When a Visit has no curated hero,
  // its first published Place/Visit image is the truthful display default.
  // Never borrow the Journey cover for a specific Place: an empty image is
  // preferable to implying that the destination cover was captured there.
  const hero =
    resolveMediaReference(visit.hero) ||
    media.find(item => item.kind === "image") ||
    null
  // A video makes a stop richer, but it does not make the shared Journey
  // cover a verified location photograph. Keep the photo-pending cue visible
  // until this visit owns either a hero or a location-specific image.
  const mediaPending = !visit.hero && !media.some(item => item.kind === "image")
  const gallery = media
    .filter(item => item.kind === "image")
    .map(item => item.src)
  const externalLink = preferredExternalLink(place.externalLinks)

  return {
    id: visit.legacyId || visit.id,
    visitId: visit.id,
    journeyId: journey.id,
    canonicalId: place.id,
    name: place.name,
    description: visit.description || place.description,
    type: visit.type || publicTaxonomyLabel(place.category),
    droneAllowed: Boolean(visit.droneAllowed),
    image: hero?.src || "",
    mediaPending,
    gallery,
    media,
    notes: [...(visit.notes || [])],
    video: firstSocialLink(visit, "instagram"),
    link: externalLink.href,
    linkLabel:
      externalLink.kind === "official"
        ? "Official website"
        : externalLink.kind === "maps"
          ? "Open in maps"
          : "Visitor information",
    evidenceStatus: visit.evidenceStatus,
    visitStatus: visit.visitStatus,
  }
}

export function buildTripViewModel(journey) {
  if (!journey) return null

  const comingSoon = journey.publicationStatus === "coming-soon"
  const cover = resolvedSource(journey.hero)
  const fullImage = resolvedSource(journey.fullImage)
  const resolvedGallery = resolveMediaList(journey.gallery).map(
    item => item.src
  )
  const curatedStoryMedia = comingSoon
    ? []
    : resolveMediaList([
        journey.hero,
        journey.fullImage,
        ...(journey.gallery || []),
        ...journey.visits.flatMap(visit => [
          visit.hero,
          ...(visit.media || []),
        ]),
        ...(journey.lodging || []).map(stay => stay.image),
      ])
  const publishedMedia = getJourneyPublishedMedia(journey.id)
  const allMedia = uniqueMedia([...publishedMedia, ...curatedStoryMedia]).map(
    media => ({
      id: media.id,
      kind: media.kind,
      src: media.src,
      mimeType: media.mimeType,
      poster: media.poster,
      alt: media.alt,
      width: media.width,
      height: media.height,
    })
  )
  const locations = journey.visits
    .map(visit => buildTripLocationView(journey, visit))
    .filter(Boolean)
  const locationByVisitId = new Map(
    locations.map(location => [location.visitId, location])
  )
  const gear = getJourneyGear(journey.id)
  const gearHighlights = journeyGearHighlights(journey, gear)
  const experiences = getJourneyExperienceViews(journey.id)
  const chapters = journeyChapterViews(journey)

  return {
    id: journey.slug,
    journeyId: journey.id,
    name: journey.title,
    comingSoon,
    publicationStatus: journey.publicationStatus,
    evidenceStatus: journey.evidenceStatus,
    cover,
    fullImage,
    // A coming-soon record already owns two intentional image usages. Showing
    // both gives its preview page a real gallery without claiming new stops.
    gallery:
      comingSoon && fullImage && !resolvedGallery.includes(fullImage)
        ? [fullImage, ...resolvedGallery]
        : resolvedGallery,
    allMedia,
    allPhotography: allMedia.filter(media => media.kind === "image"),
    description: journeyPreviewCopy(journey),
    storyProgressNote: journeyProgressNote(journey),
    dates: journey.dateRange?.label || String(journey.year),
    duration: journey.duration,
    who: journey.audience,
    costLevel: journey.costLevel,
    bestTimeToGo: journey.bestTimeToGo,
    gear,
    gearHighlights,
    experiences,
    travelNotes: [...(journey.travelNotes || [])],
    tips: [...(journey.tips || [])],
    lodging: (journey.lodging || []).map(journeyLodgingView),
    commercialOffers: journeyCommercialOfferViews(journey),
    locations,
    itineraryMode: journey.itineraryMode || "days",
    days: (journey.days || []).map((day, index) => ({
      id: chapters[index].id,
      position: chapters[index].position,
      label: day.label,
      summary: day.summary,
      locations: (day.visits || []).map(entry => ({
        ref: locationByVisitId.get(entry.visitId)?.id || entry.visitId,
        ...(entry.notes ? { notes: entry.notes } : {}),
      })),
      partners: (day.partnerIds || [])
        .map(getPartner)
        .filter(Boolean)
        .map(partner => {
          const externalLink = preferredExternalLink(partner.externalLinks)
          return {
            id: partner.id,
            name: partner.name,
            label: partner.label,
            href: externalLink.href,
            linkType: analyticsPartnerLinkType(externalLink),
            disclosure: partner.disclosure,
          }
        }),
      routes: [...(day.routes || [])],
    })),
    reel: firstSocialLink(journey, "instagram"),
    featuredShots: resolveMediaList(journey.featuredMedia).map(media => ({
      img: media.src,
      caption: media.caption || "",
    })),
    hasItinerary: Boolean(journey.days?.length && locations.length),
    hasFieldNotes: Boolean(
      gearHighlights.length ||
        journey.travelNotes?.length ||
        journey.tips?.length
    ),
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
      const storyChapters = trip.days
        .filter(day => day.locations.some(entry => entry.ref === location.id))
        .map(day => ({
          id: day.id,
          position: day.position,
          label: day.label,
          summary: day.summary || "",
        }))
      const storyExperiences = trip.experiences
        .filter(
          experience =>
            experience.visitId === location.visitId &&
            experience.placeId === location.canonicalId
        )
        .map(experience => ({
          id: `experience-${experience.slug}`,
          title: experience.title,
          summary: experience.summary,
          card: experienceCardView(experience),
        }))
      return {
        ...location,
        atlasExact: Boolean(exactNode),
        atlasNodeId: exactNode?.id || "",
        atlasHref: exactNode ? `/atlas/${exactNode.id}` : atlasHref,
        storyChapters,
        storyExperiences,
      }
    }),
  }
}

function atlasActions(place, journey) {
  const actions = []

  if (place.externalLinks?.maps) {
    actions.push({
      analyticsType: "maps",
      label: "View on Google Maps",
      href: place.externalLinks.maps,
      type: "external",
    })
  }
  if (place.externalLinks?.official) {
    actions.push({
      analyticsType: "external",
      label: "Official website",
      href: place.externalLinks.official,
      type: "external",
    })
  }
  if (hasJourneyStory(journey)) {
    actions.push({
      analyticsType: "story",
      label: "Explore the story",
      publicStoryId: journey.id,
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

  const publishedMedia = visit
    ? getVisitPublishedMedia(journey.id, visit.id)
    : []
  const media = uniqueMedia([
    ...resolveMediaList(
      presentation.media || [visit?.hero, ...(visit?.media || [])]
    ),
    ...publishedMedia,
  ])
  // Curated presentation/Visit heroes are protected. Otherwise, prefer the
  // first verified image placed on this Visit and leave image empty when the
  // Place has none instead of repeating a Journey-level cover across pins.
  const hero =
    resolveMediaReference(presentation.hero || visit?.hero) ||
    media.find(item => item.kind === "image") ||
    null
  const personalNote =
    visit?.summary || visit?.description || journey.atlasNotes?.[place.id] || ""
  const isJourneyRoot = !presentation.parentId
  const useJourneyIdentity =
    isJourneyRoot || Boolean(presentation.useJourneyIdentity)
  const isInternalPreviewLabel = presentation.eyebrow === "Coming soon"
  const storyRelationships = atlasStoryRelationships(journey, visit)

  return {
    id: presentation.id,
    placeId: place.id,
    journeyId: journey.id,
    parentId: presentation.parentId,
    // Structural Atlas hubs may not be Journey visits themselves. An optional
    // anchor lets their route position come from the first real stop they group.
    journeyOrderPlaceId: presentation.journeyOrderPlaceId || null,
    // Top-level Atlas entries represent a particular Journey, not only the
    // reusable geography beneath it. Journey titles and dates carry the year
    // so repeat visits to the same Place remain visibly distinct. Child nodes
    // keep Place identity and never inherit a Journey year as their label.
    title: useJourneyIdentity ? journey.title : place.name,
    eyebrow: isJourneyRoot
      ? journey.dateRange?.label || String(journey.year)
      : isInternalPreviewLabel
        ? publicTaxonomyLabel(place.category || visit?.type) || "Journey place"
        : presentation.eyebrow,
    category: presentation.category,
    coordinates: place.coordinates ? [...place.coordinates] : null,
    camera: presentation.camera,
    summary: useJourneyIdentity ? journey.description : place.description,
    personalNote,
    image: hero?.src || "",
    media,
    storyLead: isJourneyRoot ? atlasStoryLead(journey) : null,
    storyTitle: hasJourneyStory(journey) ? journey.title : "",
    ...storyRelationships,
    childIds: [],
    relatedIds: [...(presentation.relatedIds || [])],
    actions: atlasActions(place, journey),
    evidenceStatus: visit?.evidenceStatus || journey.evidenceStatus,
    visitStatus: visit?.visitStatus || null,
    comingSoon: journey.publicationStatus === "coming-soon",
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
    const leftOrder = journeyOrder.get(
      left.journeyOrderPlaceId || left.placeId || left.id
    )
    const rightOrder = journeyOrder.get(
      right.journeyOrderPlaceId || right.placeId || right.id
    )

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
