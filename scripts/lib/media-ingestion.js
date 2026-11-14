const crypto = require("crypto")
const path = require("path")
const mediaContract = require("../../src/content/media/contract.js")

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const checksumPattern = /^[a-f0-9]{64}$/

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || !value || value.startsWith("/")) return false
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false
  const parts = value.split("/")
  return !parts.some(part => !part || part === "." || part === "..")
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
  } else if (manifest.journeySlug !== journey.slug) {
    errors.push(
      `${owner} declares Journey slug "${manifest.journeySlug}"; expected "${journey.slug}"`
    )
  }
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
  manifest.assets.forEach((asset, index) => {
    const assetOwner = `${owner} asset ${index + 1}`
    const output = asset?.output || {}
    const associations = asset?.associations || {}
    const placement = asset?.placement || {}

    if (!idPattern.test(asset?.provisionalId || "")) {
      errors.push(`${assetOwner} has an invalid provisionalId`)
    } else if (provisionalIds.has(asset.provisionalId)) {
      errors.push(`${assetOwner} duplicates provisionalId "${asset.provisionalId}"`)
    } else provisionalIds.add(asset.provisionalId)

    if (asset?.assetId !== null && !idPattern.test(asset?.assetId || "")) {
      errors.push(`${assetOwner} assetId must be null or a valid canonical ID`)
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

    if (!["image/jpeg", "image/png"].includes(output.mimeType)) {
      errors.push(`${assetOwner} has unsupported MIME type "${output.mimeType}"`)
    }
    if (!Number.isInteger(output.width) || output.width <= 0) {
      errors.push(`${assetOwner} has invalid width`)
    }
    if (!Number.isInteger(output.height) || output.height <= 0) {
      errors.push(`${assetOwner} has invalid height`)
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
      associations.visitId ||
      associations.placeId ||
      associations.experienceId
    ) {
      errors.push(
        `${assetOwner} contains a narrower association; this ingestor currently accepts Journey-only placement`
      )
    }
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

  return { errors, journey }
}

function validateGeneratedRecords(records, context) {
  const errors = []
  const journeys = new Set((context.journeys || []).map(record => record.id))
  const staticMediaIds = new Set((context.staticMedia || []).map(record => record.id))
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
    if (asset.kind !== "image" || asset.source?.provider !== "r2") {
      errors.push(`${owner} must be an R2 image`)
    }
    if (!isSafeRelativePath(asset.source?.objectKey)) {
      errors.push(`${owner} has invalid objectKey`)
    } else if (objectKeys.has(asset.source.objectKey)) {
      errors.push(`${owner} duplicates an R2 objectKey`)
    } else objectKeys.add(asset.source.objectKey)
    if (
      !Number.isInteger(asset.intrinsic?.width) ||
      !Number.isInteger(asset.intrinsic?.height)
    ) {
      errors.push(`${owner} has invalid dimensions`)
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
    if (!idPattern.test(placement?.id || "")) errors.push(`${owner} has invalid ID`)
    if (placementIds.has(placement.id)) errors.push(`${owner} is duplicated`)
    placementIds.add(placement.id)
    if (!assetIds.has(placement.assetId)) {
      errors.push(`${owner} references unknown generated asset "${placement.assetId}"`)
    }
    if (!journeys.has(placement.journeyId)) {
      errors.push(`${owner} references unknown Journey "${placement.journeyId}"`)
    }
    if (placement.visitId || placement.placeId || placement.experienceId) {
      errors.push(`${owner} must remain Journey-only`)
    }
    if (!mediaContract.roles.includes(placement.role)) {
      errors.push(`${owner} has unsupported role`)
    }
    if (!mediaContract.visibilities.includes(placement.visibility)) {
      errors.push(`${owner} has unsupported visibility`)
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
    if (!Array.isArray(batch.assetIds)) errors.push(`${owner} has invalid assetIds`)
  })

  return { errors }
}

function canonicalAssetId(journey, asset, index) {
  return `image-${journey.slug}-${asset.output.sha256.slice(0, 12)}-${String(
    index + 1
  ).padStart(3, "0")}`
}

function upsertById(records, value) {
  const index = records.findIndex(record => record.id === value.id)
  if (index >= 0) records[index] = value
  else records.push(value)
}

function planMediaIngestion(manifest, currentRecords, context) {
  const manifestValidation = validateManifest(manifest, context)
  const currentValidation = validateGeneratedRecords(currentRecords, context)
  const errors = [...manifestValidation.errors, ...currentValidation.errors]
  if (errors.length) return { errors, changed: false, records: currentRecords }

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
  const assetIds = []

  manifest.assets.forEach((asset, index) => {
    const assetId =
      asset.assetId || canonicalAssetId(manifestValidation.journey, asset, index)
    const existing = next.assets.find(record => record.id === assetId)

    if (asset.assetId && !existing) {
      errors.push(
        `Manifest asset ${index + 1} requests unknown generated assetId "${asset.assetId}"`
      )
      return
    }
    if (!existing && staticIds.has(assetId)) {
      errors.push(`Generated asset ID "${assetId}" conflicts with curated Media`)
      return
    }
    const objectKeyOwner = next.assets.find(
      record =>
        record.source?.objectKey === asset.output.objectKey && record.id !== assetId
    )
    if (objectKeyOwner) {
      errors.push(
        `R2 object key "${asset.output.objectKey}" is already owned by "${objectKeyOwner.id}"`
      )
      return
    }

    const sameRevision = Boolean(
      existing &&
        existing.source.objectKey === asset.output.objectKey &&
        existing.publication.sha256 === asset.output.sha256 &&
        existing.publication.byteSize === asset.output.byteSize
    )
    const revision = existing
      ? sameRevision
        ? existing.publication.revision
        : existing.publication.revision + 1
      : 1
    const mediaRecord = {
      id: assetId,
      kind: "image",
      source: {
        provider: "r2",
        objectKey: asset.output.objectKey,
      },
      intrinsic: {
        mimeType: asset.output.mimeType,
        width: asset.output.width,
        height: asset.output.height,
      },
      rights: {
        owner: asset.rights.owner,
        status: asset.rights.status,
      },
      capture: {
        placeId: asset.capture?.placeId || null,
        capturedAt: asset.capture?.capturedAt || null,
        cameraModelRaw: asset.capture?.cameraModelRaw || null,
        lensModelRaw: asset.capture?.lensModelRaw || null,
      },
      defaultAlt: `${manifestValidation.journey.title} journey photograph ${index + 1}`,
      publication: {
        revision,
        sha256: asset.output.sha256,
        byteSize: asset.output.byteSize,
        batchId: manifest.batchId,
      },
    }
    upsertById(next.assets, mediaRecord)

    const placement = {
      id: `placement-${manifest.journeyId}-${assetId}`,
      assetId,
      journeyId: manifest.journeyId,
      visitId: null,
      placeId: null,
      experienceId: null,
      role: asset.placement.role,
      visibility: asset.placement.visibility,
      sortOrder: asset.placement.sortOrder,
      batchId: manifest.batchId,
    }
    upsertById(next.placements, placement)
    assetIds.push(assetId)
  })

  if (errors.length) return { errors, changed: false, records: currentRecords }

  next.batches.push({
    id: manifest.batchId,
    manifestSha256,
    journeyId: manifest.journeyId,
    assetIds,
    verification: context.verification,
  })
  const nextValidation = validateGeneratedRecords(next, context)
  if (nextValidation.errors.length) {
    return { errors: nextValidation.errors, changed: false, records: currentRecords }
  }

  return {
    errors: [],
    changed: JSON.stringify(next) !== JSON.stringify(currentRecords),
    records: next,
    assetIds,
    message: `Prepared ${assetIds.length} Media asset(s) and Journey placement(s).`,
  }
}

function serializeMediaRecords(records) {
  return `${JSON.stringify(records, null, 2)}\n`
}

module.exports = {
  isSafeRelativePath,
  planMediaIngestion,
  serializeMediaRecords,
  sha256,
  validateGeneratedRecords,
  validateManifest,
}
