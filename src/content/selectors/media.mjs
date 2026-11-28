import {
  getMediaAsset,
  mediaById,
  mediaPlacementRecords,
} from "../media/index.mjs"

const defaultMediaBaseUrl = "https://media.roamwithjustin.com"

export function getMediaBaseUrl() {
  const configured =
    typeof process !== "undefined" &&
    process.env &&
    process.env.VUE_APP_MEDIA_BASE_URL

  return (configured || defaultMediaBaseUrl).replace(/\/+$/, "")
}

export function r2Url(objectKey) {
  if (!objectKey) return ""

  // R2 keys are stored exactly as uploaded. Encode each path segment only
  // when building the public URL so spaces and other filename characters do
  // not produce an invalid <video> or <img> request while slashes stay intact.
  const encodedObjectKey = objectKey
    .replace(/^\/+/, "")
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/")

  return getMediaBaseUrl() + "/" + encodedObjectKey
}

function inferKind(src, declaredKind = "") {
  if (declaredKind === "video" || declaredKind.startsWith("video/")) {
    return "video"
  }

  return /\.(mp4|webm|ogv)(?:[?#]|$)/i.test(src) ? "video" : "image"
}

function inferMimeType(src, kind, declaredMimeType = "") {
  if (declaredMimeType) return declaredMimeType
  if (kind === "image") return ""
  if (/\.webm(?:[?#]|$)/i.test(src)) return "video/webm"
  if (/\.ogv(?:[?#]|$)/i.test(src)) return "video/ogg"
  return "video/mp4"
}

export function buildMediaSrcset(asset) {
  if (asset?.source?.provider !== "r2" || !Array.isArray(asset.renditions)) {
    return ""
  }
  return asset.renditions
    .filter(rendition => rendition?.objectKey && rendition?.width)
    .sort((left, right) => left.width - right.width)
    .filter(
      (rendition, index, all) =>
        all.findIndex(candidate => candidate.width === rendition.width) ===
        index
    )
    .map(rendition => `${r2Url(rendition.objectKey)} ${rendition.width}w`)
    .join(", ")
}

function resolveAssetUsage(usage) {
  const asset = getMediaAsset(usage.assetId)
  if (!asset) return null

  const source = asset.source || {}
  const src =
    source.provider === "r2" ? r2Url(source.objectKey) : source.path || ""
  const posterAsset = asset.posterAssetId
    ? getMediaAsset(asset.posterAssetId)
    : null
  const posterSource = posterAsset?.source || {}
  const poster =
    posterSource.provider === "r2"
      ? r2Url(posterSource.objectKey)
      : posterSource.path || ""
  const srcset = buildMediaSrcset(asset)

  return {
    id: asset.id,
    kind: asset.kind,
    type: asset.kind,
    provider: source.provider,
    src,
    srcset,
    mimeType: asset.intrinsic?.mimeType || "",
    width: asset.intrinsic?.width || null,
    height: asset.intrinsic?.height || null,
    poster,
    alt: usage.alt || asset.defaultAlt || "",
    caption: usage.caption || null,
    focalPoint: usage.focalPoint || null,
    role: usage.role || null,
  }
}

// Legacy support is deliberately isolated here. Once every caller supplies a
// Media ID or MediaUsage, this fallback can be removed without touching Vue.
function resolveLegacy(reference) {
  const media = typeof reference === "string" ? { src: reference } : reference
  const src = media?.src || media?.url || ""
  if (!src) return null

  const declaredKind = media.kind || media.type || ""
  const kind = inferKind(src, declaredKind)

  return {
    id: media.id || null,
    kind,
    type: kind,
    provider: media.provider || "legacy",
    src,
    mimeType: inferMimeType(src, kind, media.mimeType || media.mime || ""),
    width: media.width || null,
    height: media.height || null,
    poster: kind === "video" ? media.poster || "" : "",
    alt: media.alt || "",
    caption: media.caption || null,
    focalPoint: media.focalPoint || null,
    role: media.role || null,
  }
}

export function resolveMediaReference(reference) {
  if (!reference) return null

  if (typeof reference === "string") {
    if (mediaById[reference]) {
      return resolveAssetUsage({ assetId: reference })
    }

    if (reference.startsWith("/") || /^https?:\/\//i.test(reference)) {
      return resolveLegacy(reference)
    }

    return null
  }

  if (reference.assetId) return resolveAssetUsage(reference)
  return resolveLegacy(reference)
}

// All media consumers receive this stable view shape. A future provider or
// rendition policy should be implemented above, not inside gallery components.
export function resolveMediaList(references = []) {
  return references.map(resolveMediaReference).filter(Boolean)
}

// Covers are always photographs. Callers may pass canonical usages, legacy
// references, or already-resolved media without caring where a video appears
// in publication order.
export function firstImageMedia(references = []) {
  return (
    resolveMediaList(references).find(media => media.kind === "image") || null
  )
}

function getPublishedPlacementMedia(predicate) {
  const seenAssetIds = new Set()

  return mediaPlacementRecords
    .filter(
      placement =>
        placement.visibility === "published" &&
        predicate(placement)
    )
    .sort((left, right) => {
      const sequenceDifference =
        (right.publicationSequence || 0) - (left.publicationSequence || 0)
      if (sequenceDifference) return sequenceDifference
      const leftOrder = Number.isFinite(left.sortOrder)
        ? left.sortOrder
        : Number.MAX_SAFE_INTEGER
      const rightOrder = Number.isFinite(right.sortOrder)
        ? right.sortOrder
        : Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder || left.id.localeCompare(right.id)
    })
    .map(placement => {
      if (seenAssetIds.has(placement.assetId)) return null
      seenAssetIds.add(placement.assetId)
      const media = resolveMediaReference({
        assetId: placement.assetId,
        role: placement.role,
      })
      return media ? { ...media, placementId: placement.id } : null
    })
    .filter(Boolean)
}

// Generated publication placements are additive canonical associations.
// Projection may use the first published Place/Visit image as a display
// default when no curated hero exists, but never mutates editorial arrays.
export function getJourneyPublishedMedia(journeyId) {
  return getPublishedPlacementMedia(
    placement => placement.journeyId === journeyId
  )
}

// A Place-scoped package is resolved through its canonical Visit. Consumers
// may add these images to an existing location or Atlas presentation, but this
// selector never creates a Place, Visit, curated hero, or Atlas pin.
export function getVisitPublishedMedia(journeyId, visitId) {
  return getPublishedPlacementMedia(
    placement =>
      placement.journeyId === journeyId && placement.visitId === visitId
  )
}

export function getExperiencePublishedMedia(experienceId, assetIds = []) {
  const allowedAssetIds = new Set(assetIds || [])
  return getPublishedPlacementMedia(
    placement =>
      placement.experienceId === experienceId &&
      (!allowedAssetIds.size || allowedAssetIds.has(placement.assetId))
  )
}
