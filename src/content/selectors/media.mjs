import { getMediaAsset, mediaById } from "../media/index.mjs"

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
  return getMediaBaseUrl() + "/" + objectKey.replace(/^\/+/, "")
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

  return {
    id: asset.id,
    kind: asset.kind,
    type: asset.kind,
    provider: source.provider,
    src,
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
