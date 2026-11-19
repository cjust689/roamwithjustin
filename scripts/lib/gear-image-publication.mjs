import crypto from "node:crypto"
import { createRequire } from "node:module"

import {
  gearDerivativeSpecs,
  validateGearImageManifest,
} from "./gear-image-preparation.mjs"

const require = createRequire(import.meta.url)
const { isSafeRelativePath } = require("./media-ingestion.js")

const checksumPattern = /^[a-f0-9]{64}$/
const contentHashPattern = /^[a-f0-9]{24}$/
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function gearImageAssetId(gearId) {
  return "image-gear-" + gearId
}

function addError(errors, condition, message) {
  if (!condition) errors.push(message)
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function isHttpsOrLocalEndpoint(value) {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  } catch {
    return false
  }
}

function validDate(value) {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}

export function validateGearImageReceipt({
  manifest,
  manifestSha256,
  receipt,
  receiptSha256,
}) {
  const errors = [...validateGearImageManifest(manifest).errors]
  addError(
    errors,
    typeof manifestSha256 === "string" && checksumPattern.test(manifestSha256),
    "The exact Gear image manifest SHA-256 is required"
  )
  addError(
    errors,
    typeof receiptSha256 === "string" && checksumPattern.test(receiptSha256),
    "The exact Gear image receipt SHA-256 is required"
  )
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    errors.push("Gear image receipt must be an object")
    return { errors }
  }

  addError(errors, receipt.schemaVersion === 1, "Receipt schemaVersion must be 1")
  addError(
    errors,
    receipt.manifestType === "gear-image-publication",
    "Receipt manifestType must be gear-image-publication"
  )
  addError(
    errors,
    receipt.batchId === manifest?.batchId,
    "Receipt batchId does not match the Gear image manifest"
  )
  addError(
    errors,
    Array.isArray(receipt.objects),
    "Receipt objects must be an array"
  )
  if (Array.isArray(receipt.objects) && Array.isArray(manifest?.derivatives)) {
    const received = new Map()
    receipt.objects.forEach((object, index) => {
      if (!object?.objectKey || received.has(object.objectKey)) {
        errors.push("Receipt object " + (index + 1) + " has a missing or duplicate key")
      } else received.set(object.objectKey, object)
    })
    manifest.derivatives.forEach(derivative => {
      const object = received.get(derivative.objectKey)
      if (!object) {
        errors.push("Receipt is missing " + derivative.objectKey)
      } else if (
        object.byteSize !== derivative.byteSize ||
        object.sha256 !== derivative.sha256
      ) {
        errors.push("Receipt does not match " + derivative.objectKey)
      }
      received.delete(derivative.objectKey)
    })
    if (received.size) {
      errors.push("Receipt contains objects outside the Gear image manifest")
    }
  }

  const verification = receipt.verification
  addError(
    errors,
    verification?.method === "worker-r2-integrity-v2",
    "Receipt verification method is unsupported"
  )
  addError(
    errors,
    verification?.manifestSha256 === manifestSha256,
    "Receipt manifest checksum does not match the exact manifest bytes"
  )
  addError(
    errors,
    isHttpsOrLocalEndpoint(verification?.endpoint),
    "Receipt verification endpoint is invalid"
  )
  addError(
    errors,
    validDate(verification?.verifiedAt),
    "Receipt verifiedAt must be an ISO timestamp"
  )
  addError(
    errors,
    Array.isArray(verification?.uploadProtocols) &&
      verification.uploadProtocols.length === 1 &&
      verification.uploadProtocols[0] === "single",
    "Gear image receipt must record the single upload protocol"
  )
  addError(
    errors,
    Array.isArray(verification?.requestIds) &&
      verification.requestIds.length === manifest?.derivatives?.length &&
      verification.requestIds.every(
        requestId => typeof requestId === "string" && requestId.length > 0
      ),
    "Gear image receipt must record one request ID per derivative"
  )

  return { errors }
}

function validateRendition(rendition, spec, owner, errors) {
  addError(errors, rendition?.role === spec.role, owner + " has invalid role")
  addError(
    errors,
    rendition?.targetWidth === spec.width,
    owner + " has invalid targetWidth"
  )
  addError(
    errors,
    isPositiveInteger(rendition?.width) && rendition.width <= spec.width,
    owner + " has invalid width"
  )
  addError(
    errors,
    isPositiveInteger(rendition?.height) && rendition.height <= spec.width,
    owner + " has invalid height"
  )
  addError(
    errors,
    rendition?.mimeType === "image/webp",
    owner + " must be image/webp"
  )
  addError(
    errors,
    isPositiveInteger(rendition?.byteSize),
    owner + " has invalid byteSize"
  )
  addError(
    errors,
    checksumPattern.test(rendition?.sha256 || ""),
    owner + " has invalid checksum"
  )
  addError(
    errors,
    isSafeRelativePath(rendition?.objectKey),
    owner + " has invalid objectKey"
  )
}

export function validateGearImageRecords(records, context = {}) {
  const errors = []
  const assets = Array.isArray(records?.assets) ? records.assets : []
  const batches = Array.isArray(records?.batches) ? records.batches : []
  const gearItems = new Map(
    (context.gearItems || []).map(item => [item.id, item])
  )
  const validateGearReferences = Array.isArray(context.gearItems)
  const otherMediaIds = new Set(context.otherMediaIds || [])
  const otherObjectKeys = new Set(context.otherObjectKeys || [])
  const assetsById = new Map()
  const batchesById = new Map()
  const objectKeys = new Set()

  addError(errors, records?.schemaVersion === 1, "Gear image records schemaVersion must be 1")
  addError(errors, Array.isArray(records?.assets), "Gear image assets must be an array")
  addError(errors, Array.isArray(records?.batches), "Gear image batches must be an array")
  if (errors.length) return { errors }

  assets.forEach(asset => {
    const owner = `Gear image asset "${asset?.id || "unknown"}"`
    addError(errors, idPattern.test(asset?.id || ""), owner + " has invalid ID")
    if (assetsById.has(asset?.id)) errors.push(owner + " is duplicated")
    else assetsById.set(asset?.id, asset)
    addError(errors, idPattern.test(asset?.gearId || ""), owner + " has invalid gearId")
    addError(
      errors,
      asset?.id === gearImageAssetId(asset?.gearId),
      owner + " does not use the stable Gear image ID"
    )
    if (validateGearReferences) {
      addError(errors, gearItems.has(asset?.gearId), owner + " references unknown Gear")
    }
    addError(errors, !otherMediaIds.has(asset?.id), owner + " duplicates another Media ID")
    addError(errors, asset?.kind === "image", owner + " must be an image")
    addError(errors, asset?.source?.provider === "r2", owner + " must use R2")
    addError(
      errors,
      isSafeRelativePath(asset?.source?.objectKey),
      owner + " has invalid source objectKey"
    )
    addError(
      errors,
      asset?.intrinsic?.mimeType === "image/webp" &&
        isPositiveInteger(asset?.intrinsic?.width) &&
        isPositiveInteger(asset?.intrinsic?.height),
      owner + " has invalid intrinsic image metadata"
    )
    addError(
      errors,
      idPattern.test(asset?.rights?.owner || "") &&
        asset?.rights?.status === "owned",
      owner + " has invalid reviewed rights"
    )
    addError(
      errors,
      typeof asset?.defaultAlt === "string" &&
        asset.defaultAlt.length > 0 &&
        asset.defaultAlt.length <= 240,
      owner + " has invalid alternative text"
    )
    addError(
      errors,
      Array.isArray(asset?.renditions) &&
        asset.renditions.length === gearDerivativeSpecs.length,
      owner + " must expose all Gear renditions"
    )
    ;(asset?.renditions || []).forEach((rendition, index) => {
      const spec = gearDerivativeSpecs[index]
      if (spec) validateRendition(rendition, spec, owner + " rendition " + (index + 1), errors)
      if (objectKeys.has(rendition?.objectKey) || otherObjectKeys.has(rendition?.objectKey)) {
        errors.push(owner + " duplicates objectKey " + rendition?.objectKey)
      } else if (rendition?.objectKey) objectKeys.add(rendition.objectKey)
    })
    addError(
      errors,
      asset?.source?.objectKey === asset?.renditions?.[1]?.objectKey,
      owner + " source must use the card-display rendition"
    )
    addError(
      errors,
      isPositiveInteger(asset?.publication?.revision) &&
        checksumPattern.test(asset?.publication?.sha256 || "") &&
        isPositiveInteger(asset?.publication?.byteSize) &&
        idPattern.test(asset?.publication?.batchId || ""),
      owner + " has invalid publication metadata"
    )
    addError(
      errors,
      asset?.intrinsic?.width === asset?.renditions?.[1]?.width &&
        asset?.intrinsic?.height === asset?.renditions?.[1]?.height &&
        asset?.publication?.sha256 === asset?.renditions?.[1]?.sha256 &&
        asset?.publication?.byteSize === asset?.renditions?.[1]?.byteSize,
      owner + " card-display metadata is inconsistent"
    )
  })

  batches.forEach(batch => {
    const owner = `Gear image batch "${batch?.id || "unknown"}"`
    addError(errors, idPattern.test(batch?.id || ""), owner + " has invalid ID")
    if (batchesById.has(batch?.id)) errors.push(owner + " is duplicated")
    else batchesById.set(batch?.id, batch)
    addError(errors, idPattern.test(batch?.gearId || ""), owner + " has invalid gearId")
    addError(
      errors,
      batch?.assetId === gearImageAssetId(batch?.gearId),
      owner + " has invalid assetId"
    )
    addError(
      errors,
      contentHashPattern.test(batch?.contentHash || ""),
      owner + " has invalid contentHash"
    )
    addError(
      errors,
      batch?.id === "gear-image-" + batch?.gearId + "-" + batch?.contentHash,
      owner + " ID does not match its Gear and content hash"
    )
    addError(errors, isPositiveInteger(batch?.revision), owner + " has invalid revision")
    addError(
      errors,
      checksumPattern.test(batch?.manifestSha256 || "") &&
        checksumPattern.test(batch?.receiptSha256 || ""),
      owner + " has invalid manifest or receipt checksum"
    )
    addError(
      errors,
      checksumPattern.test(batch?.sourceSha256 || "") &&
        ["image/jpeg", "image/png"].includes(batch?.sourceMimeType) &&
        idPattern.test(batch?.rights?.owner || "") &&
        batch?.rights?.status === "owned" &&
        typeof batch?.alt === "string" &&
        batch.alt.length > 0 &&
        batch.alt.length <= 240,
      owner + " has invalid source, rights, or alternative-text provenance"
    )
    addError(
      errors,
      batch?.verification?.method === "receipt-sha256" &&
        batch.verification.receiptSha256 === batch.receiptSha256 &&
        isHttpsOrLocalEndpoint(batch.verification.endpoint) &&
        validDate(batch.verification.verifiedAt),
      owner + " has invalid verification evidence"
    )
    addError(
      errors,
      Array.isArray(batch?.objects) &&
        batch.objects.length === gearDerivativeSpecs.length,
      owner + " must record all uploaded objects"
    )
    ;(batch?.objects || []).forEach((object, index) => {
      const spec = gearDerivativeSpecs[index]
      if (spec) validateRendition(object, spec, owner + " object " + (index + 1), errors)
      addError(
        errors,
        object?.objectKey ===
          "images/gear/" +
            batch?.gearId +
            "/" +
            batch?.contentHash +
            "/" +
            spec?.width +
            ".webp",
        owner + " object " + (index + 1) + " has an invalid immutable key"
      )
    })
  })

  assets.forEach(asset => {
    const owner = `Gear image asset "${asset.id}"`
    const batch = batchesById.get(asset.publication?.batchId)
    addError(errors, Boolean(batch), owner + " references unknown publication batch")
    if (batch) {
      addError(errors, batch.assetId === asset.id, owner + " batch references another asset")
      addError(errors, batch.revision === asset.publication.revision, owner + " revision does not match its batch")
      addError(errors, batch.gearId === asset.gearId, owner + " Gear does not match its batch")
      addError(
        errors,
        JSON.stringify(batch.objects) === JSON.stringify(asset.renditions),
        owner + " renditions do not match its latest batch"
      )
    }
    const revisions = batches
      .filter(candidate => candidate.assetId === asset.id)
      .map(candidate => candidate.revision)
      .sort((left, right) => left - right)
    revisions.forEach((revision, index) => {
      if (revision !== index + 1) errors.push(owner + " has a non-contiguous revision history")
    })
    addError(
      errors,
      revisions.at(-1) === asset.publication?.revision,
      owner + " does not point to its latest revision"
    )
  })
  batches.forEach(batch => {
    addError(
      errors,
      assetsById.has(batch.assetId),
      `Gear image batch "${batch.id}" references unknown asset`
    )
  })

  return { errors }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function publicationObjects(manifest) {
  return manifest.derivatives.map(derivative => ({
    role: derivative.role,
    targetWidth: derivative.targetWidth,
    width: derivative.width,
    height: derivative.height,
    objectKey: derivative.objectKey,
    mimeType: derivative.mimeType,
    byteSize: derivative.byteSize,
    sha256: derivative.sha256,
  }))
}

export function planGearImagePublication({
  gearRecords,
  imageRecords,
  manifest,
  manifestSha256,
  receipt,
  receiptSha256,
  replaceImage = false,
  context = {},
}) {
  const errors = []
  errors.push(
    ...validateGearImageReceipt({
      manifest,
      manifestSha256,
      receipt,
      receiptSha256,
    }).errors
  )
  errors.push(
    ...validateGearImageRecords(imageRecords, {
      ...context,
      gearItems: gearRecords?.items || [],
    }).errors.map(error => "Existing data: " + error)
  )
  if (!gearRecords || !Array.isArray(gearRecords.items) || !Array.isArray(gearRecords.usage)) {
    errors.push("Canonical Gear records are invalid")
  }
  const item = gearRecords?.items?.find(candidate => candidate.id === manifest?.gearId)
  if (!item) errors.push(`Unknown canonical Gear "${manifest?.gearId || "unknown"}"`)
  if (errors.length) {
    return { changed: false, errors, gearRecords, imageRecords }
  }

  const nextGearRecords = clone(gearRecords)
  const nextImageRecords = clone(imageRecords)
  const nextItem = nextGearRecords.items.find(candidate => candidate.id === manifest.gearId)
  const assetId = gearImageAssetId(manifest.gearId)
  const existingAsset = nextImageRecords.assets.find(asset => asset.id === assetId)
  const existingBatch = nextImageRecords.batches.find(batch => batch.id === manifest.batchId)
  const display = manifest.derivatives.find(
    derivative => derivative.role === "card-display"
  )

  if (!display) errors.push("Gear image manifest has no card-display derivative")
  if (
    existingBatch &&
    (existingBatch.manifestSha256 !== manifestSha256 ||
      existingBatch.receiptSha256 !== receiptSha256 ||
      existingBatch.assetId !== assetId)
  ) {
    errors.push(`Gear image batch "${manifest.batchId}" already has different publication evidence`)
  }
  const samePublication =
    existingAsset?.publication?.batchId === manifest.batchId &&
    existingAsset?.publication?.sha256 === display?.sha256 &&
    existingAsset?.source?.objectKey === display?.objectKey
  const replacingExistingImage = Boolean(
    (nextItem.imageAssetId && nextItem.imageAssetId !== assetId) ||
      (existingAsset && !samePublication)
  )
  if (replacingExistingImage && !replaceImage) {
    errors.push(
      `Gear "${manifest.gearId}" already has an image; use --replace-image only after reviewing the replacement`
    )
  }
  if (errors.length) {
    return { changed: false, errors, gearRecords, imageRecords }
  }

  const revision = existingBatch
    ? existingBatch.revision
    : (existingAsset?.publication?.revision || 0) + 1
  const objects = publicationObjects(manifest)
  const asset = {
    id: assetId,
    gearId: manifest.gearId,
    kind: "image",
    source: { provider: "r2", objectKey: display.objectKey },
    intrinsic: {
      mimeType: display.mimeType,
      width: display.width,
      height: display.height,
    },
    rights: {
      owner: manifest.rights.owner,
      status: manifest.rights.status,
    },
    capture: {
      placeId: null,
      capturedAt: null,
      cameraModelRaw: null,
      lensModelRaw: null,
    },
    defaultAlt: manifest.alt,
    renditions: objects,
    publication: {
      revision,
      sha256: display.sha256,
      byteSize: display.byteSize,
      batchId: manifest.batchId,
    },
  }
  const assetIndex = nextImageRecords.assets.findIndex(candidate => candidate.id === assetId)
  if (assetIndex >= 0) nextImageRecords.assets[assetIndex] = asset
  else nextImageRecords.assets.push(asset)

  if (!existingBatch) {
    nextImageRecords.batches.push({
      id: manifest.batchId,
      gearId: manifest.gearId,
      assetId,
      contentHash: manifest.contentHash,
      revision,
      manifestSha256,
      receiptSha256,
      sourceSha256: manifest.source.sha256,
      sourceMimeType: manifest.source.mimeType,
      rights: {
        owner: manifest.rights.owner,
        status: manifest.rights.status,
      },
      alt: manifest.alt,
      objects,
      verification: {
        method: "receipt-sha256",
        receiptSha256,
        endpoint: receipt.verification.endpoint,
        verifiedAt: receipt.verification.verifiedAt,
      },
    })
  }
  nextGearRecords.items = nextGearRecords.items.map(candidate =>
    candidate.id === manifest.gearId
      ? { ...candidate, imageAssetId: assetId }
      : candidate
  )
  nextImageRecords.assets.sort((left, right) => left.id.localeCompare(right.id))
  nextImageRecords.batches.sort(
    (left, right) =>
      left.assetId.localeCompare(right.assetId) || left.revision - right.revision
  )

  errors.push(
    ...validateGearImageRecords(nextImageRecords, {
      ...context,
      gearItems: nextGearRecords.items,
    }).errors
  )
  const changed =
    JSON.stringify(nextGearRecords) !== JSON.stringify(gearRecords) ||
    JSON.stringify(nextImageRecords) !== JSON.stringify(imageRecords)
  return {
    assetId,
    changed: errors.length ? false : changed,
    errors,
    gearRecords: errors.length ? gearRecords : nextGearRecords,
    imageRecords: errors.length ? imageRecords : nextImageRecords,
    revision,
  }
}

export function serializeGeneratedRecords(records) {
  return JSON.stringify(records, null, 2) + "\n"
}
