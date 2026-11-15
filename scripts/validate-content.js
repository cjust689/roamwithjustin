const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const { pathToFileURL } = require("url")
const { validateGearRecords } = require("./lib/gear-ingestion.js")
const { validateGeneratedRecords } = require("./lib/media-ingestion.js")
const generatedMediaRecords = require("../src/content/media/generated/records.json")

const projectRoot = path.resolve(__dirname, "..")
const errors = []

function report(message) {
  errors.push(message)
}

function importContent(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  return import(pathToFileURL(absolutePath).href)
}

function collectRawLocalPaths(value, found = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("/img/")) found.add(value)
    return found
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectRawLocalPaths(item, found))
    return found
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectRawLocalPaths(item, found))
  }
  return found
}

function validateLocalPath(localPath, owner) {
  const absolutePath = path.join(
    projectRoot,
    "public",
    localPath.replace(/^\/+/, "")
  )
  if (!fs.existsSync(absolutePath)) {
    report(owner + ' references missing local file "' + localPath + '"')
    return null
  }
  return absolutePath
}

async function validateLocalImageMetadata(asset, absolutePath, owner) {
  try {
    const metadata = await sharp(absolutePath).metadata()
    if (
      metadata.width !== asset.intrinsic.width ||
      metadata.height !== asset.intrinsic.height
    ) {
      report(
        owner +
          " declares " +
          asset.intrinsic.width +
          "x" +
          asset.intrinsic.height +
          " but the local file is " +
          metadata.width +
          "x" +
          metadata.height
      )
    }
  } catch (error) {
    report(owner + " could not be inspected: " + error.message)
  }
}

function validateMediaUsage(usage, owner, mediaModule) {
  if (!usage?.assetId) {
    report(owner + " has a media usage without assetId")
    return
  }
  if (!mediaModule.getMediaAsset(usage.assetId)) {
    report(owner + ' references unknown media "' + usage.assetId + '"')
  }
}

function validateAtlasView(node, contracts) {
  const owner = 'Atlas node "' + (node?.id || "unknown") + '"'
  const requiredStrings = ["id", "title", "summary"]

  requiredStrings.forEach(field => {
    if (typeof node?.[field] !== "string" || !node[field]) {
      report(owner + ' is missing string field "' + field + '"')
    }
  })
  if (typeof node?.image !== "string") {
    report(owner + ' has invalid optional string field "image"')
  } else if (
    !node.image &&
    node.media?.some(media => media?.kind === "image" && media.src)
  ) {
    report(owner + " has image media but no projected display image")
  }
  if (!contracts.isCoordinatePair(node?.coordinates)) {
    report(owner + " has invalid coordinates")
  }
  if (
    !node?.camera ||
    !contracts.isCoordinatePair(node.camera.center) ||
    !Number.isFinite(node.camera.zoom)
  ) {
    report(owner + " has invalid camera data")
  }
  if (!Array.isArray(node?.media)) report(owner + " must expose media")
  if (!Array.isArray(node?.childIds) || !Array.isArray(node?.relatedIds)) {
    report(owner + " has invalid relationship arrays")
  }
  if (!Array.isArray(node?.actions)) report(owner + " must expose actions")
}

async function main() {
  const [
    contracts,
    mediaModule,
    gearModule,
    placeModule,
    aliasModule,
    journeyModule,
    partnerModule,
    projections,
    gearSelectors,
    atlasModule,
    atlasRootsModule,
  ] = await Promise.all([
    importContent("src/content/contracts.mjs"),
    importContent("src/content/media/index.mjs"),
    importContent("src/content/gear/index.mjs"),
    importContent("src/content/places/index.mjs"),
    importContent("src/content/places/aliases.mjs"),
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/partners/index.mjs"),
    importContent("src/content/selectors/projections.mjs"),
    importContent("src/content/selectors/gear.mjs"),
    importContent("src/content/atlas/presentation.mjs"),
    importContent("src/content/atlas/roots.mjs"),
  ])

  const controlledKeys = new Map()
  const localSources = new Map()
  const localImageChecks = []

  mediaModule.mediaRecords.forEach(asset => {
    const owner = 'Media "' + asset.id + '"'

    if (!contracts.MEDIA_KINDS.includes(asset.kind)) {
      report(owner + ' has unsupported kind "' + asset.kind + '"')
    }
    if (!contracts.MEDIA_PROVIDERS.includes(asset.source?.provider)) {
      report(owner + " has an unsupported provider")
    }
    if (!asset.rights?.owner || !asset.rights?.status) {
      report(owner + " is missing rights metadata")
    }
    if (
      asset.capture?.placeId &&
      !placeModule.getPlace(asset.capture.placeId)
    ) {
      report(
        owner +
          ' references unknown capture place "' +
          asset.capture.placeId +
          '"'
      )
    }

    if (asset.source?.provider === "local") {
      const localPath = asset.source.path
      if (!localPath?.startsWith("/img/")) {
        report(owner + " must use a public /img path")
      } else if (localSources.has(localPath)) {
        report(
          owner +
            ' duplicates local source used by "' +
            localSources.get(localPath) +
            '"'
        )
      } else {
        localSources.set(localPath, asset.id)
        const absolutePath = validateLocalPath(localPath, owner)
        if (absolutePath && asset.kind === "image") {
          localImageChecks.push(
            validateLocalImageMetadata(asset, absolutePath, owner)
          )
        }
      }
    }

    if (asset.source?.provider === "r2") {
      const objectKey = asset.source.objectKey
      if (!objectKey || objectKey.startsWith("/")) {
        report(owner + " has an invalid R2 object key")
      } else if (controlledKeys.has(objectKey)) {
        report(
          owner +
            ' duplicates object key used by "' +
            controlledKeys.get(objectKey) +
            '"'
        )
      } else controlledKeys.set(objectKey, asset.id)
    }

    if (
      asset.kind === "image" &&
      (!Number.isFinite(asset.intrinsic?.width) ||
        !Number.isFinite(asset.intrinsic?.height))
    ) {
      report(owner + " is missing image dimensions")
    }

    if (asset.posterAssetId) {
      const poster = mediaModule.getMediaAsset(asset.posterAssetId)
      if (!poster) {
        report(
          owner + ' references unknown poster "' + asset.posterAssetId + '"'
        )
      } else if (poster.kind !== "image") {
        report(owner + " must reference an image poster")
      }
    }
  })
  await Promise.all(localImageChecks)

  const gearValidation = validateGearRecords(
    {
      schemaVersion: gearModule.gearSchemaVersion,
      items: gearModule.gearRecords,
      usage: gearModule.gearUsageRecords,
    },
    {
      journeys: journeyModule.journeyRecords,
      media: mediaModule.mediaRecords,
    }
  )
  gearValidation.errors.forEach(report)
  gearValidation.warnings.forEach(warning =>
    console.warn("Gear validation warning: " + warning)
  )

  const generatedMediaValidation = validateGeneratedRecords(
    generatedMediaRecords,
    {
      journeys: journeyModule.journeyRecords,
      staticMedia: mediaModule.mediaRecords.filter(asset => !asset.publication),
    }
  )
  generatedMediaValidation.errors.forEach(report)

  mediaModule.mediaPlacementRecords.forEach(placement => {
    const owner = 'Media placement "' + placement.id + '"'
    if (!mediaModule.getMediaAsset(placement.assetId)) {
      report(owner + ' references unknown Media "' + placement.assetId + '"')
    }
    if (!journeyModule.getJourney(placement.journeyId)) {
      report(
        owner + ' references unknown Journey "' + placement.journeyId + '"'
      )
    }
  })

  journeyModule.journeyRecords.forEach(journey => {
    gearSelectors.getJourneyGear(journey.id).forEach(item => {
      if (!item.id || !item.name || !item.category) {
        report(
          'Journey gear selector returned an invalid item for "' +
            journey.id +
            '"'
        )
      }
    })
  })

  placeModule.placeRecords.forEach(place => {
    const owner = 'Place "' + place.id + '"'
    const externalLinks = Object.values(place.externalLinks || {}).filter(
      Boolean
    )

    externalLinks.forEach(link => {
      if (!/^https:\/\//i.test(link)) {
        report(owner + ' contains an invalid external link "' + link + '"')
      }
    })
    if (
      place.coordinates !== null &&
      !contracts.isCoordinatePair(place.coordinates)
    ) {
      report(owner + " has invalid coordinates")
    }
    if (place.parentPlaceId && !placeModule.getPlace(place.parentPlaceId)) {
      report(owner + ' references unknown parent "' + place.parentPlaceId + '"')
    }

    const seen = new Set([place.id])
    let current = place
    while (current?.parentPlaceId) {
      if (seen.has(current.parentPlaceId)) {
        report(owner + " participates in a parent cycle")
        break
      }
      seen.add(current.parentPlaceId)
      current = placeModule.getPlace(current.parentPlaceId)
    }
  })

  Object.entries(aliasModule.placeAliases).forEach(([alias, canonicalId]) => {
    if (placeModule.placesById[alias]) {
      report('Place alias "' + alias + '" collides with a canonical ID')
    }
    if (!placeModule.placesById[canonicalId]) {
      report(
        'Place alias "' +
          alias +
          '" targets unknown place "' +
          canonicalId +
          '"'
      )
    }
    if (aliasModule.placeAliases[canonicalId]) {
      report('Place alias "' + alias + '" creates an alias chain')
    }
  })

  partnerModule.partnerRecords.forEach(partner => {
    const owner = 'Partner "' + partner.id + '"'
    if (
      !partner.name ||
      !partner.kind ||
      !partner.label ||
      !partner.relationship
    ) {
      report(owner + " is missing identity or relationship metadata")
    }
    const externalLinks = Object.values(partner.externalLinks || {}).filter(
      Boolean
    )
    if (!externalLinks.length) {
      report(owner + " is missing an external link")
    }
    externalLinks.forEach(link => {
      if (!/^https:\/\//i.test(link)) {
        report(owner + ' contains an invalid external link "' + link + '"')
      }
    })
    if (!partner.disclosure) {
      report(owner + " is missing its relationship disclosure")
    }
  })

  const journeySlugs = new Set()
  let visitCount = 0
  journeyModule.journeyRecords.forEach(journey => {
    const owner = 'Journey "' + journey.id + '"'
    const visitIds = new Set()
    const legacyIds = new Set()
    const year = journey.year
    const yearText = String(year || "")
    const yearSuffix = "-" + yearText

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      report(owner + " has no valid trip year")
    }
    if (!journey.id.endsWith(yearSuffix)) {
      report(owner + ' ID does not end in its trip year "' + yearText + '"')
    }
    if (!journey.slug.endsWith(yearSuffix)) {
      report(owner + ' slug does not end in its trip year "' + yearText + '"')
    }
    if (!journey.title.includes(yearText)) {
      report(owner + ' title does not display its trip year "' + yearText + '"')
    }
    if (!journey.dateRange?.label?.includes(yearText)) {
      report(
        owner + ' date label does not display its trip year "' + yearText + '"'
      )
    }
    ;[journey.slug, ...(journey.legacySlugs || [])].forEach(routeSlug => {
      if (!routeSlug || typeof routeSlug !== "string") {
        report(owner + " has an invalid route slug")
      } else if (journeySlugs.has(routeSlug)) {
        report(owner + ' duplicates route slug "' + routeSlug + '"')
      } else {
        journeySlugs.add(routeSlug)
      }
    })
    ;(journey.legacySlugs || []).forEach(legacySlug => {
      if (journeyModule.getJourneyBySlug(legacySlug)?.id !== journey.id) {
        report(owner + ' does not resolve legacy slug "' + legacySlug + '"')
      }
    })
    if (
      journey.itineraryMode &&
      !["days", "chapters"].includes(journey.itineraryMode)
    ) {
      report(
        owner + ' has invalid itinerary mode "' + journey.itineraryMode + '"'
      )
    }
    if (journey.hero) {
      validateMediaUsage(journey.hero, owner + " hero", mediaModule)
    }
    if (journey.fullImage) {
      validateMediaUsage(journey.fullImage, owner + " full image", mediaModule)
    }
    ;[...(journey.gallery || []), ...(journey.featuredMedia || [])].forEach(
      usage => validateMediaUsage(usage, owner, mediaModule)
    )
    ;(journey.lodging || []).forEach(stay => {
      if (!/^https:\/\//i.test(stay.link || "")) {
        report(owner + ' lodging "' + stay.name + '" is missing a valid link')
      }
      if (stay.image?.assetId) {
        validateMediaUsage(
          stay.image,
          owner + ' lodging "' + stay.name + '"',
          mediaModule
        )
      } else if (stay.image && !/^https:\/\//i.test(stay.image.url || "")) {
        report(
          owner + ' lodging "' + stay.name + '" has invalid external image'
        )
      }
    })

    journey.visits.forEach(visit => {
      visitCount += 1
      const visitOwner = owner + ' visit "' + visit.id + '"'
      if (visitIds.has(visit.id)) report(visitOwner + " duplicates a visit ID")
      visitIds.add(visit.id)
      if (!visit.legacyId)
        report(visitOwner + " is missing its public compatibility ID")
      if (legacyIds.has(visit.legacyId)) {
        report(visitOwner + ' duplicates legacy ID "' + visit.legacyId + '"')
      }
      legacyIds.add(visit.legacyId)
      if (!placeModule.getPlace(visit.placeId)) {
        report(visitOwner + ' references unknown place "' + visit.placeId + '"')
      }
      if (visit.hero) {
        validateMediaUsage(visit.hero, visitOwner + " hero", mediaModule)
      }
      ;(visit.media || []).forEach(usage =>
        validateMediaUsage(usage, visitOwner, mediaModule)
      )
      ;(visit.socialLinks || []).forEach(link => {
        if (!/^https:\/\//i.test(link.url || "")) {
          report(visitOwner + " contains an invalid social URL")
        }
      })
    })
    ;(journey.days || []).forEach(day => {
      ;(day.partnerIds || []).forEach(partnerId => {
        if (!partnerModule.getPartner(partnerId)) {
          report(
            owner +
              ' day "' +
              day.label +
              '" references unknown partner "' +
              partnerId +
              '"'
          )
        }
      })
      ;(day.visits || []).forEach(entry => {
        if (!visitIds.has(entry.visitId)) {
          report(
            owner +
              ' day "' +
              day.label +
              '" references unknown visit "' +
              entry.visitId +
              '"'
          )
        }
      })
      ;(day.routes || []).forEach(route => {
        if (!/^https:\/\//i.test(route.link || "")) {
          report(owner + ' day "' + day.label + '" has an invalid route URL')
        }
      })
    })
    ;(journey.socialLinks || []).forEach(link => {
      if (!/^https:\/\//i.test(link.url || "")) {
        report(owner + " contains an invalid social URL")
      }
    })
  })

  const rawJourneyPaths = collectRawLocalPaths(journeyModule.journeyRecords)
  rawJourneyPaths.forEach(localPath =>
    report('Journey content bypasses Media with raw path "' + localPath + '"')
  )

  const tripViews = journeyModule.journeyRecords.map(
    projections.buildTripViewModel
  )
  tripViews.forEach(trip => {
    const owner = 'Trip view "' + trip.id + '"'
    if (!trip.cover && !trip.comingSoon) {
      report(owner + " has no resolved cover")
    }
    if (!trip.description && !trip.comingSoon) {
      report(owner + " has no public description")
    }
    if (!trip.id || !trip.name) report(owner + " has no public route identity")
    if (!Array.isArray(trip.allPhotography)) {
      report(owner + " has no All Photography projection")
    }
    if (trip.comingSoon) return
    const locationIds = new Set(trip.locations.map(location => location.id))
    if (!trip.locations.length) report(owner + " has no locations")
    trip.days.forEach(day => {
      day.locations.forEach(entry => {
        if (!locationIds.has(entry.ref)) {
          report(
            owner +
              ' day "' +
              day.label +
              '" projects unknown location "' +
              entry.ref +
              '"'
          )
        }
      })
    })
  })

  const presentationIds = new Set(
    atlasModule.atlasPresentation.map(item => item.id)
  )
  const atlasViews = atlasModule.atlasPresentation
    .map(projections.buildAtlasNodeView)
    .filter(Boolean)
  const childIdsByParent = atlasViews.reduce((result, node) => {
    if (!node.parentId) return result
    if (!result[node.parentId]) result[node.parentId] = []
    result[node.parentId].push(node.id)
    return result
  }, {})
  const completeAtlasViews = atlasViews.map(node => ({
    ...node,
    childIds: childIdsByParent[node.id] || [],
  }))

  // Cross-presentation links are derived from shared Journey and Place IDs.
  // Validate both the journey root fallback and every exact Place-to-pin match
  // so UI navigation cannot drift into a second hand-maintained mapping.
  tripViews
    .map(trip => projections.addTripAtlasNavigation(trip, completeAtlasViews))
    .forEach(trip => {
      const journeyNodes = completeAtlasViews.filter(
        node => node.journeyId === trip.journeyId
      )
      const rootNode = journeyNodes.find(node => !node.parentId)
      const expectedRootHref = rootNode ? "/atlas/" + rootNode.id : ""

      if (trip.atlasHref !== expectedRootHref) {
        report('Trip view "' + trip.id + '" has an invalid Atlas root link')
      }

      trip.locations.forEach(location => {
        const exactNode = journeyNodes.find(
          node => node.placeId === location.canonicalId
        )
        const expectedHref = exactNode
          ? "/atlas/" + exactNode.id
          : expectedRootHref
        if (
          location.atlasHref !== expectedHref ||
          location.atlasExact !== Boolean(exactNode)
        ) {
          report(
            'Trip location "' +
              location.id +
              '" has an invalid Atlas navigation projection'
          )
        }
      })
    })

  atlasModule.atlasPresentation.forEach(presentation => {
    const owner = 'Atlas presentation "' + presentation.id + '"'
    const place = placeModule.getPlace(presentation.placeId)
    const journey = journeyModule.getJourney(presentation.journeyId)
    if (!place) {
      report(owner + ' references unknown place "' + presentation.placeId + '"')
    }
    if (!journey) {
      report(
        owner + ' references unknown journey "' + presentation.journeyId + '"'
      )
    }
    if (presentation.journeyOrderPlaceId) {
      if (!placeModule.getPlace(presentation.journeyOrderPlaceId)) {
        report(
          owner +
            ' references unknown Journey-order place "' +
            presentation.journeyOrderPlaceId +
            '"'
        )
      } else if (
        journey &&
        !journey.visits.some(
          visit => visit.placeId === presentation.journeyOrderPlaceId
        )
      ) {
        report(
          owner +
            ' uses Journey-order place "' +
            presentation.journeyOrderPlaceId +
            '" that is not visited by its Journey'
        )
      }
    }
    if (presentation.parentId && !presentationIds.has(presentation.parentId)) {
      report(
        owner + ' references unknown parent "' + presentation.parentId + '"'
      )
    }
    ;(presentation.relatedIds || []).forEach(relatedId => {
      if (!presentationIds.has(relatedId)) {
        report(owner + ' references unknown related node "' + relatedId + '"')
      }
    })
    // Stop presentations may inherit hero/media from their canonical Journey
    // visit. When Atlas overrides a hero explicitly, validate that override.
    if (presentation.hero) {
      validateMediaUsage(presentation.hero, owner + " hero", mediaModule)
    }
    ;(presentation.media || []).forEach(usage =>
      validateMediaUsage(usage, owner, mediaModule)
    )
  })
  collectRawLocalPaths(atlasModule.atlasPresentation).forEach(localPath =>
    report(
      'Atlas presentation bypasses Media with raw path "' + localPath + '"'
    )
  )
  completeAtlasViews.forEach(node => validateAtlasView(node, contracts))

  atlasRootsModule.atlasRootPlaceIds.forEach(rootId => {
    if (!completeAtlasViews.some(node => node.id === rootId)) {
      report('Atlas root "' + rootId + '" does not resolve')
    }
  })

  // Incomplete Journeys are intentionally public as coming-soon Atlas
  // scaffolds. Keep every one rooted and ensure each confirmed/retained Visit
  // resolves to a pin so future content can fill in without changing identity.
  journeyModule.journeyRecords
    .filter(journey => journey.publicationStatus === "coming-soon")
    .forEach(journey => {
      const journeyNodes = completeAtlasViews.filter(
        node => node.journeyId === journey.id
      )
      if (!journeyNodes.some(node => !node.parentId)) {
        report('Coming-soon Journey "' + journey.id + '" has no Atlas root')
      }
      const atlasPlaceIds = new Set(journeyNodes.map(node => node.placeId))
      journey.visits.forEach(visit => {
        if (!atlasPlaceIds.has(visit.placeId)) {
          report(
            'Coming-soon Journey "' +
              journey.id +
              '" Place "' +
              visit.placeId +
              '" has no Atlas node'
          )
        }
      })
    })

  const canyonlandsNode = completeAtlasViews.find(
    node => node.id === "canyonlands-national-park"
  )
  if (!canyonlandsNode?.media.some(media => media.kind === "video")) {
    report("Canyonlands Atlas node has no resolved native video")
  }

  const moab = completeAtlasViews.find(node => node.id === "moab")
  const moabChildren = (moab?.childIds || [])
    .map(id => completeAtlasViews.find(node => node.id === id))
    .filter(Boolean)
  const orderedMoab = projections
    .orderAtlasNodesByJourney(moabChildren)
    .map(node => node.id)
  const expectedMoabOrder = [
    "moab-giants",
    "potash-road",
    "canyonlands-national-park",
    "dead-horse-point",
    "arches-national-park",
  ]
  if (orderedMoab.join("|") !== expectedMoabOrder.join("|")) {
    report("Moab Atlas route does not follow Utah Journey visit order")
  }

  const utah = completeAtlasViews.find(node => node.id === "utah")
  const orderedUtahOverview = projections
    .orderAtlasNodesByJourney(
      (utah?.childIds || [])
        .map(id => completeAtlasViews.find(node => node.id === id))
        .filter(Boolean)
    )
    .map(node => node.id)
  const expectedUtahOverviewOrder = [
    "bonneville-salt-flats",
    "moab",
    "park-city",
    "woodward-park-city",
    "uintas",
    "salt-lake-city-airport",
  ]
  if (orderedUtahOverview.join("|") !== expectedUtahOverviewOrder.join("|")) {
    report("Utah Atlas overview route does not follow Journey visit order")
  }

  // Utah is a completed migration: every unique canonical Place in its Journey
  // must have a public Atlas node. Repeated visits, such as Potash Road, still
  // resolve to one pin because coverage is checked by Place identity.
  const utahJourney = journeyModule.getJourney("utah-winter-2025")
  const expectedUtahPlaceIds = [
    ...new Set((utahJourney?.visits || []).map(visit => visit.placeId)),
  ]
  const utahAtlasPlaceIds = new Set(
    completeAtlasViews
      .filter(node => node.journeyId === "utah-winter-2025")
      .map(node => node.placeId)
  )
  expectedUtahPlaceIds.forEach(placeId => {
    if (!utahAtlasPlaceIds.has(placeId)) {
      report('Utah Journey Place "' + placeId + '" has no Atlas node')
    }
  })

  const expectedUtahGuidedOrder = [
    "bonneville-salt-flats",
    "moab-giants",
    "potash-road",
    "canyonlands-national-park",
    "dead-horse-point",
    "arches-national-park",
    "park-city",
    "woodward-park-city",
    "uintas",
    "salt-lake-city-airport",
  ]

  const expectedEuropeGuidedOrder = [
    "portsmouth-england",
    "new-forest-england",
    "harrogate-england",
    "york-england",
    "amsterdam-netherlands",
    "split-croatia",
    "krka-national-park",
    "marrakech-morocco",
    "agafay-morocco",
    "malaga-spain",
    "gibraltar",
    "cadiz-spain",
    "seville-spain",
    "madrid-spain",
  ]

  const expectedCostaRicaGuidedOrder = [
    "la-fortuna-costa-rica",
    "bajos-del-toro",
    "drake-bay",
    "playa-san-josecito",
    "uvita-costa-rica",
    "uvita-whale-tail",
    "nauyaca-waterfalls",
    "manuel-antonio-area",
    "san-jose-costa-rica",
  ]

  const expectedUtah2026GuidedOrder = [
    "utah-2026-zion",
    "utah-2026-park-city",
  ]

  const puertoRico = completeAtlasViews.find(node => node.id === "puerto-rico")
  const orderedPuertoRico = projections
    .orderAtlasNodesByJourney(
      (puertoRico?.childIds || [])
        .map(id => completeAtlasViews.find(node => node.id === id))
        .filter(Boolean)
    )
    .map(node => node.id)
  const expectedPuertoRicoOrder = [
    "don-rafa-boutique-hotel",
    "old-san-juan",
    "cueva-del-indio",
    "hacienda-florecer",
    "crash-boat-beach",
    "gozalandia-falls",
  ]
  if (orderedPuertoRico.join("|") !== expectedPuertoRicoOrder.join("|")) {
    report("Puerto Rico Atlas route does not follow Journey visit order")
  }

  const stJohn = completeAtlasViews.find(node => node.id === "st-john")
  const orderedStJohn = projections
    .orderAtlasNodesByJourney(
      (stJohn?.childIds || [])
        .map(id => completeAtlasViews.find(node => node.id === id))
        .filter(Boolean)
    )
    .map(node => node.id)
  const expectedStJohnOrder = [
    "cyril-e-king-airport",
    "red-hook-ferry-terminal",
    "cruz-bay",
    "maho-bay",
    "great-cruz-bay",
    "lovango-cay",
    "trunk-bay",
    "cinnamon-bay",
    "waterlemon-cay",
  ]
  if (orderedStJohn.join("|") !== expectedStJohnOrder.join("|")) {
    report("St. John Atlas route does not follow Journey visit order")
  }

  // The creator confirmed this charter stop by name, but its formal island
  // identity is unresolved. Validation prevents a plausible guess from
  // silently turning it into a public pin during a later media pass.
  const hermitCrabIsland = placeModule.getPlace("hermit-crab-island")
  if (hermitCrabIsland?.coordinates !== null) {
    report(
      "Hermit Crab Island must remain unmapped until its identity is verified"
    )
  }
  if (presentationIds.has("hermit-crab-island")) {
    report("Hermit Crab Island must not have an Atlas presentation yet")
  }

  const guidedJourneys = [
    {
      journeyId: "utah-winter-2025",
      expectedStops: expectedUtahGuidedOrder,
    },
    {
      journeyId: "puerto-rico-2024",
      expectedStops: expectedPuertoRicoOrder,
    },
    {
      journeyId: "usvi-st-john-2025",
      expectedStops: expectedStJohnOrder,
    },
    {
      journeyId: "europe-summer-2026",
      expectedStops: expectedEuropeGuidedOrder,
    },
    {
      journeyId: "costa-rica-2025",
      expectedStops: expectedCostaRicaGuidedOrder,
    },
    {
      journeyId: "utah-2026",
      expectedStops: expectedUtah2026GuidedOrder,
    },
  ].map(({ journeyId, expectedStops }) => {
    const guidedJourney = projections.buildGuidedJourneyViewModel(
      journeyModule.getJourney(journeyId),
      completeAtlasViews
    )
    const actualStops = guidedJourney?.stops.map(stop => stop.id) || []
    if (actualStops.join("|") !== expectedStops.join("|")) {
      report(
        'Guided Journey "' + journeyId + '" does not follow Atlas visit order'
      )
    }
    ;(guidedJourney?.stops || []).forEach((stop, index) => {
      if (stop.position !== index + 1) {
        report('Guided Journey "' + journeyId + '" has invalid stop positions')
      }
      validateAtlasView(stop, contracts)
    })
    return guidedJourney
  })

  ;["src/data/trips.js", "src/features/atlas/data/atlasData.js"].forEach(
    relativePath => {
      if (fs.existsSync(path.join(projectRoot, relativePath))) {
        report(
          'Retired legacy authority still exists at "' + relativePath + '"'
        )
      }
    }
  )

  if (errors.length) {
    console.error("Content validation failed:\n")
    errors.forEach(error => console.error("- " + error))
    process.exitCode = 1
    return
  }

  console.log(
    "Content validation passed: " +
      mediaModule.mediaRecords.length +
      " media, " +
      gearModule.gearRecords.length +
      " gear, " +
      gearModule.gearUsageRecords.length +
      " gear usages, " +
      mediaModule.mediaPlacementRecords.length +
      " media placements, " +
      placeModule.placeRecords.length +
      " places, " +
      journeyModule.journeyRecords.length +
      " journeys, " +
      visitCount +
      " visits, " +
      tripViews.length +
      " trip views, " +
      completeAtlasViews.length +
      " Atlas nodes, " +
      guidedJourneys.filter(Boolean).length +
      " guided journeys."
  )
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
