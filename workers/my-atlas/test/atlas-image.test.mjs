import { describe, expect, it } from "vitest"
import {
  ATLAS_IMAGE_MAX_INPUT_BYTES,
  ATLAS_IMAGE_MAX_OUTPUT_BYTES,
  ATLAS_IMAGE_OUTPUT_SIZE,
  AtlasImageValidationError,
  isAnimatedAtlasImage,
  sniffAtlasImageContentType,
  transformAtlasImage,
  validateAtlasImageInput,
} from "../src/account/atlas-image.mjs"

function jpegBytes(length = 32) {
  const bytes = new Uint8Array(length)
  bytes.set([0xff, 0xd8, 0xff, 0xe0])
  return bytes
}

function webpBytesWithChunk(chunk) {
  const bytes = new Uint8Array(32)
  bytes.set(Array.from("RIFF", character => character.charCodeAt(0)), 0)
  bytes.set(Array.from("WEBP", character => character.charCodeAt(0)), 8)
  bytes.set(Array.from(chunk, character => character.charCodeAt(0)), 16)
  return bytes
}

describe("Atlas image validation and transformation", () => {
  it("recognizes the allowed encoded formats and rejects disguised files", () => {
    expect(sniffAtlasImageContentType(jpegBytes())).toBe("image/jpeg")
    expect(
      sniffAtlasImageContentType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])
      )
    ).toBe("image/png")
    expect(sniffAtlasImageContentType(webpBytesWithChunk("VP8 "))).toBe(
      "image/webp"
    )
    expect(() =>
      validateAtlasImageInput({
        bytes: new TextEncoder().encode("<svg></svg>").buffer,
        contentType: "image/png",
      })
    ).toThrowError(AtlasImageValidationError)
  })

  it("rejects animated WebP and inputs above the byte ceiling", () => {
    const animated = webpBytesWithChunk("ANIM")
    expect(isAnimatedAtlasImage(animated, "image/webp")).toBe(true)
    expect(() =>
      validateAtlasImageInput({
        bytes: animated.buffer,
        contentType: "image/webp",
      })
    ).toThrowError(/could not be accepted/i)

    const oversized = jpegBytes(ATLAS_IMAGE_MAX_INPUT_BYTES + 1)
    expect(() =>
      validateAtlasImageInput({
        bytes: oversized.buffer,
        contentType: "image/jpeg",
      })
    ).toThrowError(/could not be accepted/i)
  })

  it("requires a decoded image within the pixel limit and a bounded square WebP", async () => {
    const outputBytes = webpBytesWithChunk("VP8 ")
    let infoCalls = 0
    let transformOptions
    let outputOptions
    const images = {
      async info() {
        infoCalls += 1
        return infoCalls === 1
          ? { format: "image/jpeg", width: 2400, height: 1600 }
          : {
              format: "image/webp",
              width: ATLAS_IMAGE_OUTPUT_SIZE,
              height: ATLAS_IMAGE_OUTPUT_SIZE,
            }
      },
      input() {
        return {
          transform(options) {
            transformOptions = options
            return this
          },
          output(options) {
            outputOptions = options
            return {
              response() {
                return new Response(outputBytes, {
                  status: 200,
                  headers: { "Content-Type": "image/webp" },
                })
              },
            }
          },
        }
      },
    }
    const result = await transformAtlasImage({
      bytes: jpegBytes().buffer,
      contentType: "image/jpeg",
      images,
    })
    expect(transformOptions).toEqual({
      width: 1200,
      height: 1200,
      fit: "cover",
      gravity: "auto",
      metadata: "none",
    })
    expect(outputOptions).toEqual({
      format: "image/webp",
      quality: 80,
      anim: false,
    })
    expect(result).toMatchObject({
      contentType: "image/webp",
      width: 1200,
      height: 1200,
      byteLength: outputBytes.byteLength,
    })
    expect(result.byteLength).toBeLessThanOrEqual(ATLAS_IMAGE_MAX_OUTPUT_BYTES)
    expect(result.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it("rejects decoded images above 36 megapixels", async () => {
    const images = {
      async info() {
        return { format: "image/jpeg", width: 9000, height: 5000 }
      },
      input() {
        throw new Error("transform should not run")
      },
    }
    await expect(
      transformAtlasImage({
        bytes: jpegBytes().buffer,
        contentType: "image/jpeg",
        images,
      })
    ).rejects.toMatchObject({ code: "image_dimensions_too_large" })
  })
})
