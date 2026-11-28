const crypto = require("crypto")
const path = require("path")
const mediaContract = require("../../src/content/media/contract.js")

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const checksumPattern = /^[a-f0-9]{64}$/
const imageMimeTypes = new Set(["image/jpeg", "image/png"])
const videoMimeTypes = new Set(["video/mp4"])
const committedVerificationMethods = new Set([
  "receipt-sha256",
  "public-head-size-and-mime",
])

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function mediaKindForMimeType(mimeType) {
  if (imageMimeTypes.has(mimeType)) return "image"
  if (videoMimeTypes.has(mimeType)) return "video"
  return null
}

function isOptionalPositiveNumber(value) {
  return value === null || (Number.isFinite(value) && value > 0)
}

function isOptionalPositiveInteger(value) {
  return value === null || (Number.isInteger(value) && value > 0)
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || !value || value.startsWith("/")) return false
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false
  const parts = value.split("/")
  return !parts.some(part => !part || part === "." || part === "..")
}

function validateAssociationScope(
  scope,
  journey,
  owner,
  errors,
  experiences = []
) {
  const placeId = scope?.placeId ?? null
  const visitId = scope?.visitId ?? null
  const experienceId = scope?.experienceId ?? null
  const hasPlace = placeId !== null
  const hasVisit = visitId !== null

  if (experienceId !== null) {
    const experience = experiences.find(record => record.id === experienceId)
    if (!experience) {
      errors.push(`${owner} references unknown Experience "${experienceId}"`)
    } else if (experience.journeyId !== journey?.id) {
      errors.push(
        `${owner} references Experience "${experienceId}" outside Journey "${journey?.id || "unknown"}"`
      )
    }
  }
  if (hasPlace !== hasVisit) {
    errors.push(`${owner} must declare Place and Visit together`)
    return null
  }
  if (!hasPlace || !journey) return null

  const visit = journey.visits?.find(record => record.id === visitId)
  if (!visit) {
    errors.push(
      `${owner} references Visit "${visitId}" outside Journey "${journey.id}"`
    )
    return null
  }
  if (visit.placeId !== placeId) {
    errors.push(
      `${owner} declares Place "${placeId}" but Visit "${visitId}" belongs to Place "${visit.placeId}"`
    )
    return null
  }

  return visit
}

function validateManifest(manifest, context) {
  const errors = []
  const journeys = context.journeys || []
  const journey = journeys.find(record => record.id === manifest?.journeyId)
  const owner = `Manifest ${manifest?.batchId || "(unknown batch)"}`

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { errors: ["Manifest must be a JSON object"], journey: null }
  }
  if (manifest.schemaVersion !== mediaContract.schemaVersion) {
    errors.push(
      `${owner} uses schema version ${manifest.schemaVersion}; expected ${mediaContract.schemaVersion}`
    )
  }
  if (manifest.manifestType !== mediaContract.manifestType) {
    errors.push(`${owner} has an unsupported manifestType`)
  }
  if (!idPattern.test(manifest.batchId || "")) {
    errors.push(`${owner} has an invalid batchId`)
  }
  if (!journey) {
    errors.push(`${owner} references unknown Journey "${manifest.journeyId}"`)
  } else if (
    ![journey.slug, ...(journey.legacySlugs || [])].includes(
      manifest.journeySlug
    )
  ) {
    errors.push(
      `${owner} declares Journey slug "${manifest.journeySlug}"; expected "${journey.slug}"`
    )
  }
  const manifestScope = {
    placeId: manifest.placeId ?? null,
    visitId: manifest.visitId ?? null,
    experienceId: null,
  }
  validateAssociationScope(manifestScope, journey, owner, errors)
  if (
    typeof manifest.r2Prefix !== "string" ||
    !manifest.r2Prefix.endsWith("/") ||
    !isSafeRelativePath(manifest.r2Prefix.slice(0, -1))
  ) {
    errors.push(`${owner} has an invalid r2Prefix`)
  }
  if (!Array.isArray(manifest.assets) || !manifest.assets.length) {
    errors.push(`${owner} must contain at least one asset`)
    return { errors, journey }
  }

  const provisionalIds = new Set()
  const objectKeys = new Set()
  const manifestKinds = new Set()
  manifest.assets.forEach((asset, index) => {
    const assetOwner = `${owner} asset ${index + 1}`
    const output = asset?.output || {}
    const associations = asset?.associations || {}
    const placement = asset?.placement || {}

    if (!idPattern.test(asset?.provisionalId || "")) {
      errors.push(`${assetOwner} has an invalid provisionalId`)
    } else if (provisionalIds.has(asset.provisionalId)) {
      errors.push(
        `${assetOwner} duplicates provisionalId "${asset.provisionalId}"`
      )
    } else provisionalIds.add(asset.provisionalId)

    if (asset?.assetId !== null && !idPattern.test(asset?.assetId || "")) {
      errors.push(`${assetOwner} assetId must be null or a valid canonical ID`)
    }
    if (asset?.assetId === null && asset?.revision !== null) {
      errors.push(
        `${assetOwner} revision must be null for a new unresolved asset`
      )
    }
    if (
      asset?.assetId !== null &&
      (!Number.isInteger(asset?.revision) || asset.revision < 2)
    ) {
      errors.push(
        `${assetOwner} must declare a monotonic revision when assetId is supplied`
      )
    }
    if (
      !isSafeRelativePath(output.relativePath) ||
      path.posix.basename(output.relativePath) !== output.relativePath
    ) {
      errors.push(`${assetOwner} has an unsafe output.relativePath`)
    }
    if (
      !isSafeRelativePath(output.objectKey) ||
      !output.objectKey.startsWith(manifest.r2Prefix || "")
    ) {
      errors.push(`${assetOwner} has an invalid or out-of-prefix objectKey`)
    } else if (objectKeys.has(output.objectKey)) {
      errors.push(`${assetOwner} duplicates objectKey "${output.objectKey}"`)
    } else objectKeys.add(output.objectKey)

    const mediaKind = mediaKindForMimeType(output.mimeType)
    if (!mediaKind) {
      errors.push(
        `${assetOwner} has unsupported MIME type "${output.mimeType}"`
      )
    } else {
      manifestKinds.add(mediaKind)
    }
    const extension = path.posix.extname(output.relativePath || "").toLowerCase()
    const extensionMatchesMime =
      (output.mimeType === "image/jpeg" && [".jpg", ".jpeg"].includes(extension)) ||
      (output.mimeType === "image/png" && extension === ".png") ||
      (output.mimeType === "video/mp4" && extension === ".mp4")
    if (mediaKind && !extensionMatchesMime) {
      errors.push(`${assetOwner} filename does not match its MIME type`)
    }
    if (mediaKind === "image") {
      if (!Number.isInteger(output.width) || output.width <= 0) {
        errors.push(`${assetOwner} has invalid width`)
      }
      if (!Number.isInteger(output.height) || output.height <= 0) {
        errors.push(`${assetOwner} has invalid height`)
      }
    } else if (mediaKind === "video") {
      if (
        !isOptionalPositiveNumber(output.width) ||
        (output.width !== null && !Number.isInteger(output.width))
      ) {
        errors.push(`${assetOwner} has invalid optional video width`)
      }
      if (
        !isOptionalPositiveNumber(output.height) ||
        (output.height !== null && !Number.isInteger(output.height))
      ) {
        errors.push(`${assetOwner} has invalid optional video height`)
      }
      if (!isOptionalPositiveNumber(output.durationSeconds ?? null)) {
        errors.push(`${assetOwner} has invalid optional video duration`)
      }
    }
    if (!Number.isInteger(output.byteSize) || output.byteSize <= 0) {
      errors.push(`${assetOwner} has invalid byteSize`)
    }
    if (!checksumPattern.test(output.sha256 || "")) {
      errors.push(`${assetOwner} has invalid SHA-256 checksum`)
    }
    if (associations.journeyId !== manifest.journeyId) {
      errors.push(`${assetOwner} must use the manifest Journey association`)
    }
    if (
      (associations.visitId ?? null) !== manifestScope.visitId ||
      (associations.placeId ?? null) !== manifestScope.placeId
    ) {
      errors.push(
        `${assetOwner} must use the manifest Place/Visit association`
      )
    }
    validateAssociationScope(associations, journey, assetOwner, errors)
    if (!mediaContract.roles.includes(placement.role)) {
      errors.push(`${assetOwner} has unsupported placement role`)
    }
    if (!mediaContract.visibilities.includes(placement.visibility)) {
      errors.push(`${assetOwner} has unsupported placement visibility`)
    }
    if (
      placement.sortOrder !== null &&
      (!Number.isInteger(placement.sortOrder) || placement.sortOrder < 0)
    ) {
      errors.push(`${assetOwner} has invalid placement sortOrder`)
    }
    if (!asset?.rights?.owner || !asset?.rights?.status) {
      errors.push(`${assetOwner} is missing explicit rights metadata`)
    }
  })

  if (manifestKinds.size > 1) {
    errors.push(`${owner} cannot mix image and video assets`)
  }
  const onlyKind = manifestKinds.size === 1 ? [...manifestKinds][0] : null
  if (
    onlyKind &&
    !String(manifest.r2Prefix || "").startsWith(
      onlyKind === "video" ? "videos/" : "images/"
    )
  ) {
    errors.push(
      `${owner} ${onlyKind} assets must use the ${onlyKind === "video" ? "videos/" : "images/"} R2 boundary`
    )
  }
  if (
    manifest.mediaKind !== undefined &&
    (!manifestKinds.has(manifest.mediaKind) || manifestKinds.size !== 1)
  ) {
    errors.push(`${owner} mediaKind does not match its assets`)
  }

  return { errors, journey }
}

function validateGeneratedRecords(records, context) {
  const errors = []
  const journeys = new Map(
    (context.journeys || []).map(record => [record.id, record])
  )
  const staticMediaIds = new Set(
    (context.staticMedia || []).map(record => record.id)
  )
  const staticObjectKeys = new Set(
    (context.staticMedia || [])
      .map(record => record.source?.objectKey)
      .filter(Boolean)
  )
  const assetIds = new Set()
  const placementIds = new Set()
  const objectKeys = new Set()
  const batchIds = new Set()

  if (records?.schemaVersion !== mediaContract.schemaVersion) {
    errors.push(
      `Generated media uses schema version ${records?.schemaVersion}; expected ${mediaContract.schemaVersion}`
    )
  }
  ;["assets", "placements", "batches"].forEach(field => {
    if (!Array.isArray(records?.[field])) {
      errors.push(`Generated media field "${field}" must be an array`)
    }
  })
  if (errors.length) return { errors }

  records.assets.forEach(asset => {
    const owner = `Generated media "${asset?.id || "unknown"}"`
    if (!idPattern.test(asset?.id || "")) errors.push(`${owner} has invalid ID`)
    if (assetIds.has(asset.id) || staticMediaIds.has(asset.id)) {
      errors.push(`${owner} duplicates a canonical Media ID`)
    }
    assetIds.add(asset.id)
    if (
      !["image", "video"].includes(asset.kind) ||
      asset.source?.provider !== "r2"
    ) {
      errors.push(`${owner} must be an R2 image or video`)
    }
    if (!isSafeRelativePath(asset.source?.objectKey)) {
      errors.push(`${owner} has invalid objectKey`)
    } else if (
      objectKeys.has(asset.source.objectKey) ||
      staticObjectKeys.has(asset.source.objectKey)
    ) {
      errors.push(`${owner} duplicates an R2 objectKey`)
    } else objectKeys.add(asset.source.objectKey)
    if (mediaKindForMimeType(asset.intrinsic?.mimeType) !== asset.kind) {
      errors.push(`${owner} has a MIME type that does not match its kind`)
    }
    if (asset.kind === "image") {
      if (
        !Number.isInteger(asset.intrinsic?.width) ||
        !Number.isInteger(asset.intrinsic?.height)
      ) {
        errors.push(`${owner} has invalid image dimensions`)
      }
    } else if (
      !isOptionalPositiveInteger(asset.intrinsic?.width ?? null) ||
      !isOptionalPositiveInteger(asset.intrinsic?.height ?? null) ||
      !isOptionalPositiveNumber(asset.intrinsic?.durationSeconds ?? null)
    ) {
      errors.push(`${owner} has invalid optional video intrinsic metadata`)
    }
    if (!asset.rights?.owner || !asset.rights?.status) {
      errors.push(`${owner} has missing rights metadata`)
    }
    if (
      !Number.isInteger(asset.publication?.revision) ||
      asset.publication.revision < 1 ||
      !checksumPattern.test(asset.publication?.sha256 || "") ||
      !Number.isInteger(asset.publication?.byteSize) ||
      !idPattern.test(asset.publication?.batchId || "")
    ) {
      errors.push(`${owner} has invalid publication metadata`)
    }
  })

  records.placements.forEach(placement => {
    const owner = `Media placement "${placement?.id || "unknown"}"`
    if (!idPattern.test(placement?.id || ""))
      errors.push(`${owner} has invalid ID`)
    if (placementIds.has(placement.id)) errors.push(`${owner} is duplicated`)
    placementIds.add(placement.id)
    if (!assetIds.has(placement.assetId)) {
      errors.push(
        `${owner} references unknown generated asset "${placement.assetId}"`
      )
    }
    const journey = journeys.get(placement.journeyId)
    if (!journey) {
      errors.push(
        `${owner} references unknown Journey "${placement.journeyId}"`
      )
    }
    validateAssociationScope(
      placement,
      journey,
      owner,
      errors,
      context.experiences || []
    )
    if (!mediaContract.roles.includes(placement.role)) {
      errors.push(`${owner} has unsupported role`)
    }
    if (!mediaContract.visibilities.includes(placement.visibility)) {
      errors.push(`${owner} has unsupported visibility`)
    }
    if (
      placement.sortOrder !== null &&
      (!Number.isInteger(placement.sortOrder) || placement.sortOrder < 0)
    ) {
      errors.push(`${owner} has invalid sortOrder`)
    }
    if (
      !Number.isInteger(placement.publicationSequence) ||
      placement.publicationSequence < 1
    ) {
      errors.push(`${owner} has invalid publicationSequence`)
    }
  })

  records.batches.forEach(batch => {
    const owner = `Media batch "${batch?.id || "unknown"}"`
    if (!idPattern.test(batch?.id || "")) errors.push(`${owner} has invalid ID`)
    if (batchIds.has(batch.id)) errors.push(`${owner} is duplicated`)
    batchIds.add(batch.id)
    if (!checksumPattern.test(batch.manifestSha256 || "")) {
      errors.push(`${owner} has invalid manifest checksum`)
    }
    if (!journeys.has(batch.journeyId)) {
      errors.push(`${owner} references unknown Journey`)
    }
    if (!Number.isInteger(batch.sequence) || batch.sequence < 1) {
      errors.push(`${owner} has invalid sequence`)
    }
    if (!Array.isArray(batch.assetIds)) {
      errors.push(`${owner} has invalid assetIds`)
    } else {
      batch.assetIds.forEach(assetId => {
        if (!assetIds.has(assetId)) {
          errors.push(`${owner} references unknown asset "${assetId}"`)
        }
      })
    }
    if (
      !committedVerificationMethods.has(batch.verification?.method) &&
      !(
        context.allowUnverifiedPlan &&
        batch.verification?.method === "not-verified-dry-run"
      )
    ) {
      errors.push(`${owner} is missing committed R2 verification evidence`)
    }
  })

  records.assets.forEach(asset => {
    if (!batchIds.has(asset.publication?.batchId)) {
      errors.push(
        `Generated media "${asset.id}" references unknown publication batch`
      )
    }
  })
  records.placements.forEach(placement => {
    if (!batchIds.has(placement.batchId)) {
      errors.push(
        `Media placement "${placement.id}" references unknown publication batch`
      )
    }
  })

  return { errors }
}

function canonicalAssetId(journey, asset, index, generatedIdHashes = new Map()) {
  const kind = mediaKindForMimeType(asset.output.mimeType) || "media"
  const ordinal = String(index + 1).padStart(3, "0")
  const hashPrefixLengths = [12, 20, 32, 64]

  for (const prefixLength of hashPrefixLengths) {
    const assetId = `${kind}-${journey.slug}-${asset.output.sha256.slice(
      0,
      prefixLength
    )}-${ordinal}`
    const existingHash = generatedIdHashes.get(assetId)
    if (!existingHash || existingHash === asset.output.sha256) return assetId
  }

  throw new Error(
    `Unable to allocate a collision-free generated Media ID for SHA-256 ${asset.output.sha256}`
  )
}

function upsertById(records, value) {
  const index = records.findIndex(record => record.id === value.id)
  if (index >= 0) records[index] = value
  else records.push(value)
}

function reassociationMetadataMatches(existing, asset) {
  return (
    existing.kind === mediaKindForMimeType(asset.output.mimeType) &&
    existing.publication.sha256 === asset.output.sha256 &&
    existing.publication.byteSize === asset.output.byteSize &&
    existing.intrinsic.mimeType === asset.output.mimeType &&
    existing.intrinsic.width === asset.output.width &&
    existing.intrinsic.height === asset.output.height &&
    (existing.intrinsic.durationSeconds ?? null) ===
      (asset.output.durationSeconds ?? null) &&
    existing.rights.owner === asset.rights.owner &&
    existing.rights.status === asset.rights.status
  )
}

function planMediaIngestion(manifest, currentRecords, context) {
  const manifestValidation = validateManifest(manifest, context)
  const currentValidation = validateGeneratedRecords(currentRecords, context)
  const errors = [...manifestValidation.errors, ...currentValidation.errors]
  if (errors.length) return { errors, changed: false, records: currentRecords }

  const reassociateExisting = Boolean(context.reassociateExisting)
  if (reassociateExisting) {
    if (!manifest.placeId || !manifest.visitId) {
      errors.push(
        "--reassociate-existing requires a manifest with an explicit Place and Visit"
      )
    }
    if (context.verification?.method !== "receipt-sha256") {
      errors.push(
        "--reassociate-existing requires checksum verification from a receipt"
      )
    }
    if (
      manifest.assets.some(
        asset => asset.assetId !== null || asset.revision !== null
      )
    ) {
      errors.push(
        "--reassociate-existing accepts only a newly prepared manifest with null assetId and revision fields"
      )
    }
    if (errors.length) {
      return { errors, changed: false, records: currentRecords }
    }
  }

  const manifestSha256 = context.manifestSha256
  if (!checksumPattern.test(manifestSha256 || "")) {
    return {
      errors: ["A SHA-256 checksum of the exact manifest input is required"],
      changed: false,
      records: currentRecords,
    }
  }
  const previousBatch = currentRecords.batches.find(
    batch => batch.id === manifest.batchId
  )
  if (previousBatch) {
    if (previousBatch.manifestSha256 !== manifestSha256) {
      return {
        errors: [
          `Batch "${manifest.batchId}" was already ingested with different manifest bytes`,
        ],
        changed: false,
        records: currentRecords,
      }
    }
    return {
      errors: [],
      changed: false,
      records: currentRecords,
      assetIds: [...previousBatch.assetIds],
      message: "Batch already ingested; no changes required.",
    }
  }

  const next = JSON.parse(JSON.stringify(currentRecords))
  const staticIds = new Set((context.staticMedia || []).map(asset => asset.id))
  const staticObjectKeys = new Set(
    (context.staticMedia || [])
      .map(asset => asset.source?.objectKey)
      .filter(Boolean)
  )
  const generatedIdHashes = new Map(
    next.assets.map(asset => [asset.id, asset.publication.sha256])
  )
  const batchJourneyIds = new Map(
    next.batches.map(batch => [batch.id, batch.journeyId])
  )
  const journeyShaOwners = new Map()
  next.assets.forEach(asset => {
    if (
      batchJourneyIds.get(asset.publication.batchId) === manifest.journeyId &&
      !journeyShaOwners.has(asset.publication.sha256)
    ) {
      journeyShaOwners.set(asset.publication.sha256, asset.id)
    }
  })
  const manifestShaOwners = new Map()
  const assetIds = []
  const batchSequence =
    next.batches.reduce(
      (maximum, batch) => Math.max(maximum, batch.sequence || 0),
      0
    ) + 1

  manifest.assets.forEach((asset, index) => {
    if (!asset.assetId && !reassociateExisting) {
      const earlierManifestIndex = manifestShaOwners.get(asset.output.sha256)
      if (earlierManifestIndex !== undefined) {
        errors.push(
          `Manifest asset ${index + 1} duplicates manifest asset ${earlierManifestIndex + 1} by full SHA-256; keep one copy in the batch`
        )
        return
      }
      manifestShaOwners.set(asset.output.sha256, index)

      const existingShaOwner = journeyShaOwners.get(asset.output.sha256)
      if (existingShaOwner) {
        errors.push(
          `Manifest asset ${index + 1} duplicates bytes already published as "${existingShaOwner}" in Journey "${manifest.journeyId}"; omit it or explicitly republish that asset`
        )
        return
      }
    }

    const assetId =
      asset.assetId ||
      canonicalAssetId(
        manifestValidation.journey,
        asset,
        index,
        generatedIdHashes
      )
    const existing = next.assets.find(record => record.id === assetId)

    if (reassociateExisting && !existing) {
      errors.push(
        `Manifest asset ${index + 1} does not match an existing generated Journey-only asset "${assetId}"`
      )
      return
    }
    if (asset.assetId && !existing) {
      errors.push(
        `Manifest asset ${index + 1} requests unknown generated assetId "${asset.assetId}"`
      )
      return
    }
    if (existing && !asset.assetId && !reassociateExisting) {
      errors.push(
        `Manifest asset ${index + 1} collides with generated ID "${assetId}" but has no reconciled assetId; treat it as a new source or explicitly republish the known asset`
      )
      return
    }
    if (
      existing &&
      asset.assetId &&
      asset.revision !== existing.publication.revision + 1
    ) {
      errors.push(
        `Manifest asset ${index + 1} revision ${asset.revision} must follow current revision ${existing.publication.revision} for "${assetId}"`
      )
      return
    }
    if (
      reassociateExisting &&
      !reassociationMetadataMatches(existing, asset)
    ) {
      errors.push(
        `Manifest asset ${index + 1} does not exactly match the existing bytes, dimensions, MIME type, and rights for "${assetId}"`
      )
      return
    }
    if (!existing && staticIds.has(assetId)) {
      errors.push(
        `Generated asset ID "${assetId}" conflicts with curated Media`
      )
      return
    }
    if (staticObjectKeys.has(asset.output.objectKey)) {
      errors.push(
        `R2 object key "${asset.output.objectKey}" is already owned by curated Media`
      )
      return
    }
    const objectKeyOwner = next.assets.find(
      record =>
        record.source?.objectKey === asset.output.objectKey &&
        record.id !== assetId
    )
    if (objectKeyOwner) {
      errors.push(
        `R2 object key "${asset.output.objectKey}" is already owned by "${objectKeyOwner.id}"`
      )
      return
    }

    if (
      existing &&
      asset.assetId &&
      existing.source.objectKey === asset.output.objectKey &&
      existing.publication.sha256 === asset.output.sha256
    ) {
      errors.push(
        `Manifest asset ${index + 1} declares a new revision without new rendition bytes or key`
      )
      return
    }
    if (
      reassociateExisting &&
      existing.source.objectKey === asset.output.objectKey
    ) {
      errors.push(
        `Manifest asset ${index + 1} must use a new Place-scoped object key for "${assetId}"`
      )
      return
    }
    const revision = reassociateExisting
      ? existing.publication.revision + 1
      : existing && asset.assetId
        ? asset.revision
        : 1
    const mediaRecord = {
      id: assetId,
      kind: mediaKindForMimeType(asset.output.mimeType),
      source: {
        provider: "r2",
        objectKey: asset.output.objectKey,
      },
      intrinsic: {
        mimeType: asset.output.mimeType,
        width: asset.output.width,
        height: asset.output.height,
        ...(mediaKindForMimeType(asset.output.mimeType) === "video"
          ? { durationSeconds: asset.output.durationSeconds ?? null }
          : {}),
      },
      rights: {
        owner: asset.rights.owner,
        status: asset.rights.status,
      },
      capture: reassociateExisting
        ? { ...existing.capture }
        : {
            placeId: asset.capture?.placeId || null,
            capturedAt: asset.capture?.capturedAt || null,
            cameraModelRaw: asset.capture?.cameraModelRaw || null,
            lensModelRaw: asset.capture?.lensModelRaw || null,
          },
      defaultAlt: reassociateExisting
        ? existing.defaultAlt
        : `${manifestValidation.journey.title} journey ${mediaKindForMimeType(asset.output.mimeType) === "video" ? "video" : "photograph"} ${index + 1}`,
      publication: {
        revision,
        sha256: asset.output.sha256,
        byteSize: asset.output.byteSize,
        batchId: manifest.batchId,
      },
    }
    const association = asset.associations || {}
    const placementScope = association.visitId || "journey"
    const placementId = `placement-${manifest.journeyId}-${placementScope}-${assetId}`
    const existingPlacement = next.placements.find(
      placement => placement.id === placementId
    )
    let priorJourneyPlacement = null
    if (reassociateExisting) {
      const assetPlacements = next.placements.filter(
        placement => placement.assetId === assetId
      )
      priorJourneyPlacement = assetPlacements[0] || null
      if (
        assetPlacements.length !== 1 ||
        priorJourneyPlacement.journeyId !== manifest.journeyId ||
        priorJourneyPlacement.visitId !== null ||
        priorJourneyPlacement.placeId !== null ||
        priorJourneyPlacement.experienceId !== null
      ) {
        errors.push(
          `Manifest asset ${index + 1} must have exactly one Journey-only placement before reassociation for "${assetId}"`
        )
        return
      }
      if (existingPlacement) {
        errors.push(
          `Manifest asset ${index + 1} already has the requested Place/Visit placement for "${assetId}"`
        )
        return
      }
    } else if (existing && asset.assetId && !existingPlacement) {
      errors.push(
        `Manifest asset ${index + 1} cannot change the existing placement association for "${assetId}" during republish`
      )
      return
    }
    upsertById(next.assets, mediaRecord)
    generatedIdHashes.set(assetId, asset.output.sha256)
    if (priorJourneyPlacement) {
      next.placements.splice(
        next.placements.findIndex(
          placement => placement.id === priorJourneyPlacement.id
        ),
        1
      )
    }
    if (!existingPlacement) {
      next.placements.push({
        id: placementId,
        assetId,
        journeyId: manifest.journeyId,
        visitId: association.visitId || null,
        placeId: association.placeId || null,
        experienceId: null,
        role: asset.placement.role,
        visibility: asset.placement.visibility,
        sortOrder: asset.placement.sortOrder,
        publicationSequence: batchSequence,
        batchId: manifest.batchId,
      })
    }
    assetIds.push(assetId)
  })

  if (errors.length) return { errors, changed: false, records: currentRecords }

  next.batches.push({
    id: manifest.batchId,
    sequence: batchSequence,
    manifestSha256,
    journeyId: manifest.journeyId,
    assetIds,
    verification: context.verification,
  })
  const nextValidation = validateGeneratedRecords(next, context)
  if (nextValidation.errors.length) {
    return {
      errors: nextValidation.errors,
      changed: false,
      records: currentRecords,
    }
  }

  return {
    errors: [],
    changed: JSON.stringify(next) !== JSON.stringify(currentRecords),
    records: next,
    assetIds,
    message: reassociateExisting
      ? `Reassociated ${assetIds.length} existing Media asset(s) from Journey-only placement to ${manifest.placeId} / ${manifest.visitId}.`
      : `Prepared ${assetIds.length} Media asset(s) and publication placement(s).`,
  }
}

function serializeMediaRecords(records) {
  return `${JSON.stringify(records, null, 2)}\n`
}

module.exports = {
  isSafeRelativePath,
  mediaKindForMimeType,
  planMediaIngestion,
  serializeMediaRecords,
  sha256,
  validateGeneratedRecords,
  validateManifest,
}
