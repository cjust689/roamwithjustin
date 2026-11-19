import { RegistrationConfigurationError } from "../registration/contracts.mjs"

export const ATLAS_IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024
export const ATLAS_IMAGE_MAX_OUTPUT_BYTES = 1024 * 1024
export const ATLAS_IMAGE_MAX_SOURCE_PIXELS = 36_000_000
export const ATLAS_IMAGE_OUTPUT_SIZE = 1200
export const ATLAS_IMAGE_OUTPUT_QUALITY = 80

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

export class AtlasImageValidationError extends Error {
  constructor(code) {
    super("The Atlas image could not be accepted.")
    this.name = "AtlasImageValidationError"
    this.code = code
  }
}

export class AtlasImageServiceError extends Error {
  constructor() {
    super("The Atlas image service is temporarily unavailable.")
    this.name = "AtlasImageServiceError"
  }
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export async function hashAtlasImageBytes(bytes) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", bytes))
}

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

export function sniffAtlasImageContentType(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg"
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png"
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp"
  }
  return ""
}

function containsAsciiChunk(bytes, value) {
  const needle = Array.from(value, character => character.charCodeAt(0))
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    if (needle.every((byte, offset) => bytes[index + offset] === byte)) {
      return true
    }
  }
  return false
}

export function isAnimatedAtlasImage(value, contentType) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  if (contentType === "image/png") return containsAsciiChunk(bytes, "acTL")
  if (contentType === "image/webp") {
    return containsAsciiChunk(bytes, "ANIM") || containsAsciiChunk(bytes, "ANMF")
  }
  return false
}

function normalizedInfoContentType(info) {
  const format = String(info?.format || "").toLowerCase()
  if (["jpg", "jpeg", "image/jpg", "image/jpeg"].includes(format)) {
    return "image/jpeg"
  }
  if (["png", "image/png"].includes(format)) return "image/png"
  if (["webp", "image/webp"].includes(format)) return "image/webp"
  return ""
}

function streamFromBytes(bytes) {
  return new Response(bytes).body
}

function requireImagesBinding(images) {
  if (
    !images ||
    typeof images.info !== "function" ||
    typeof images.input !== "function"
  ) {
    throw new RegistrationConfigurationError("IMAGES is not bound.")
  }
  return images
}

export function requireAtlasImageBucket(environment) {
  const bucket = environment.MY_ATLAS_MEDIA_R2
  if (
    !bucket ||
    typeof bucket.get !== "function" ||
    typeof bucket.put !== "function" ||
    typeof bucket.delete !== "function"
  ) {
    throw new RegistrationConfigurationError("MY_ATLAS_MEDIA_R2 is not bound.")
  }
  return bucket
}

export function validateAtlasImageInput({ bytes, contentType }) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 1) {
    throw new AtlasImageValidationError("image_empty")
  }
  if (bytes.byteLength > ATLAS_IMAGE_MAX_INPUT_BYTES) {
    throw new AtlasImageValidationError("image_too_large")
  }
  const declaredType = String(contentType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase()
  const detectedType = sniffAtlasImageContentType(bytes)
  if (
    !ALLOWED_CONTENT_TYPES.has(declaredType) ||
    !detectedType ||
    declaredType !== detectedType
  ) {
    throw new AtlasImageValidationError("image_type_not_supported")
  }
  if (isAnimatedAtlasImage(bytes, detectedType)) {
    throw new AtlasImageValidationError("image_animation_not_supported")
  }
  return detectedType
}

export async function transformAtlasImage({ bytes, contentType, images }) {
  const detectedType = validateAtlasImageInput({ bytes, contentType })
  const binding = requireImagesBinding(images)
  let inputInfo
  try {
    inputInfo = await binding.info(streamFromBytes(bytes))
  } catch {
    throw new AtlasImageValidationError("image_decode_failed")
  }
  const width = Number(inputInfo?.width)
  const height = Number(inputInfo?.height)
  if (
    normalizedInfoContentType(inputInfo) !== detectedType ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new AtlasImageValidationError("image_decode_failed")
  }
  if (width * height > ATLAS_IMAGE_MAX_SOURCE_PIXELS) {
    throw new AtlasImageValidationError("image_dimensions_too_large")
  }

  let outputResponse
  try {
    const output = await binding
      .input(streamFromBytes(bytes))
      .transform({
        width: ATLAS_IMAGE_OUTPUT_SIZE,
        height: ATLAS_IMAGE_OUTPUT_SIZE,
        fit: "cover",
        gravity: "auto",
        metadata: "none",
      })
      .output({
        format: "image/webp",
        quality: ATLAS_IMAGE_OUTPUT_QUALITY,
        anim: false,
      })
    outputResponse = output.response()
  } catch {
    throw new AtlasImageValidationError("image_processing_failed")
  }
  if (!outputResponse?.ok) {
    throw new AtlasImageValidationError("image_processing_failed")
  }
  const outputBytes = await outputResponse.arrayBuffer()
  if (
    outputBytes.byteLength < 1 ||
    outputBytes.byteLength > ATLAS_IMAGE_MAX_OUTPUT_BYTES
  ) {
    throw new AtlasImageValidationError("image_output_too_large")
  }
  if (
    String(outputResponse.headers.get("Content-Type") || "")
      .split(";", 1)[0]
      .toLowerCase() !== "image/webp"
  ) {
    throw new AtlasImageValidationError("image_processing_failed")
  }

  let outputInfo
  try {
    outputInfo = await binding.info(streamFromBytes(outputBytes))
  } catch {
    throw new AtlasImageValidationError("image_processing_failed")
  }
  if (
    normalizedInfoContentType(outputInfo) !== "image/webp" ||
    Number(outputInfo.width) !== ATLAS_IMAGE_OUTPUT_SIZE ||
    Number(outputInfo.height) !== ATLAS_IMAGE_OUTPUT_SIZE
  ) {
    throw new AtlasImageValidationError("image_processing_failed")
  }

  return Object.freeze({
    bytes: outputBytes,
    contentType: "image/webp",
    width: ATLAS_IMAGE_OUTPUT_SIZE,
    height: ATLAS_IMAGE_OUTPUT_SIZE,
    byteLength: outputBytes.byteLength,
    sourceSha256: await hashAtlasImageBytes(bytes),
  })
}

export async function readAtlasImageRequest(request) {
  const rawLength = request.headers.get("Content-Length")
  const contentLength = rawLength === null ? null : Number(rawLength)
  if (
    contentLength !== null &&
    (!Number.isSafeInteger(contentLength) || contentLength < 1)
  ) {
    throw new AtlasImageValidationError("image_empty")
  }
  if (contentLength !== null && contentLength > ATLAS_IMAGE_MAX_INPUT_BYTES) {
    throw new AtlasImageValidationError("image_too_large")
  }
  if (!request.body) throw new AtlasImageValidationError("image_empty")
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > ATLAS_IMAGE_MAX_INPUT_BYTES) {
      await reader.cancel()
      throw new AtlasImageValidationError("image_too_large")
    }
    chunks.push(value)
  }
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  const bytes = joined.buffer
  validateAtlasImageInput({
    bytes,
    contentType: request.headers.get("Content-Type"),
  })
  return Object.freeze({
    bytes,
    contentType: request.headers.get("Content-Type"),
  })
}
