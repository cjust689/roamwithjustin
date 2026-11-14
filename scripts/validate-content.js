const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const { pathToFileURL } = require("url")

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
  const requiredStrings = ["id", "title", "summary", "image"]

  requiredStrings.forEach(field => {
    if (typeof node?.[field] !== "string" || !node[field]) {
      report(owner + ' is missing string field "' + field + '"')
    }
  })
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
    placeModule,
    aliasModule,
    journeyModule,
    projections,
    atlasModule,
    atlasRootsModule,
  ] = await Promise.all([
    importContent("src/content/contracts.mjs"),
    importContent("src/content/media/index.mjs"),
    importContent("src/content/places/index.mjs"),
    importContent("src/content/places/aliases.mjs"),
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/selectors/projections.mjs"),
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

  placeModule.placeRecords.forEach(place => {
    const owner = 'Place "' + place.id + '"'
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

  const journeySlugs = new Set()
  let visitCount = 0
  journeyModule.journeyRecords.forEach(journey => {
    const owner = 'Journey "' + journey.id + '"'
    const visitIds = new Set()
    const legacyIds = new Set()

    if (journeySlugs.has(journey.slug)) {
      report(owner + ' duplicates slug "' + journey.slug + '"')
    }
    journeySlugs.add(journey.slug)
    validateMediaUsage(journey.hero, owner + " hero", mediaModule)
    if (journey.fullImage) {
      validateMediaUsage(journey.fullImage, owner + " full image", mediaModule)
    }
    ;[...(journey.gallery || []), ...(journey.featuredMedia || [])].forEach(
      usage => validateMediaUsage(usage, owner, mediaModule)
    )
    ;(journey.lodging || []).forEach(stay => {
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
    if (!trip.cover) report(owner + " has no resolved cover")
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

  atlasModule.atlasPresentation.forEach(presentation => {
    const owner = 'Atlas presentation "' + presentation.id + '"'
    if (!placeModule.getPlace(presentation.placeId)) {
      report(owner + ' references unknown place "' + presentation.placeId + '"')
    }
    if (!journeyModule.getJourney(presentation.journeyId)) {
      report(
        owner + ' references unknown journey "' + presentation.journeyId + '"'
      )
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
    validateMediaUsage(presentation.hero, owner + " hero", mediaModule)
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
    "canyonlands-national-park",
    "dead-horse-point",
    "arches-national-park",
  ]
  if (orderedMoab.join("|") !== expectedMoabOrder.join("|")) {
    report("Moab Atlas route does not follow Utah Journey visit order")
  }

  const puertoRico = completeAtlasViews.find(node => node.id === "puerto-rico")
  const orderedPuertoRico = projections
    .orderAtlasNodesByJourney(
      (puertoRico?.childIds || [])
        .map(id => completeAtlasViews.find(node => node.id === id))
        .filter(Boolean)
    )
    .map(node => node.id)
  const expectedPuertoRicoOrder = [
    "old-san-juan",
    "cueva-del-indio",
    "crash-boat-beach",
    "gozalandia-falls",
  ]
  if (orderedPuertoRico.join("|") !== expectedPuertoRicoOrder.join("|")) {
    report("Puerto Rico Atlas route does not follow Journey visit order")
  }

  const guidedJourneys = [
    {
      journeyId: "utah-winter-2025",
      expectedStops: expectedMoabOrder,
    },
    {
      journeyId: "puerto-rico-2024",
      expectedStops: expectedPuertoRicoOrder,
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
