import assert from "node:assert/strict"
import fs from "node:fs/promises"
import { normalizeImageLocation } from "../shared/my-atlas-image-location.mjs"
import {
  normalizeAtlasImageUpload,
  normalizeAtlasImageVisibility,
} from "../workers/my-atlas/src/account/contracts.mjs"
import {
  replaceMyAtlasImage,
  updateMyAtlasImageVisibility,
} from "../src/features/my-atlas/api/client.mjs"

assert.equal(
  normalizeImageLocation("  Montréal,   Canada  "),
  "Montréal, Canada"
)
assert.equal(normalizeImageLocation("🗺️"), "🗺️")
for (const value of [
  null,
  "",
  " ",
  "a".repeat(121),
  "<b>Banff</b>",
  "a\u200bb",
  "a\u0000b",
  "\ud800",
])
  assert.equal(normalizeImageLocation(value), null)
const headers = new Headers({
  "If-Match": '"rev-2"',
  "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
})
assert.throws(() => normalizeAtlasImageUpload(headers))
headers.set("X-Atlas-Image-Location", "%FF")
assert.throws(() => normalizeAtlasImageUpload(headers))
headers.set("X-Atlas-Image-Location", encodeURIComponent("Montréal, Canada"))
assert.equal(normalizeAtlasImageUpload(headers).location, "Montréal, Canada")
assert.deepEqual(
  normalizeAtlasImageVisibility({ location: " Banff, Canada " }, headers),
  {
    expectedRevision: 2,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    location: "Banff, Canada",
  }
)
assert.throws(() => normalizeAtlasImageVisibility({ location: "" }, headers))
const metadata = {
  imageId: "image_11111111111111111111111111111111",
  contentType: "image/webp",
  width: 1200,
  height: 1200,
  byteLength: 4,
  publicProfile: false,
  updatedAt: "2026-11-20T17:00:00.000Z",
}
const base = {
  apiBaseUrl: "https://api.example",
  accessToken: "fixture",
  revision: 2,
}
let writes = 0
await assert.rejects(
  replaceMyAtlasImage({
    ...base,
    file: new Blob([1], { type: "image/jpeg" }),
    fetchImpl: async () => {
      writes++
    },
  }),
  { code: "atlas_image_location_required" }
)
assert.equal(writes, 0)
const result = await updateMyAtlasImageVisibility({
  ...base,
  location: "Montréal, Canada",
  fetchImpl: async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { location: "Montréal, Canada" })
    return Response.json(
      { atlasImage: { ...metadata, location: "Montréal, Canada" } },
      { headers: { ETag: '"rev-3"' } }
    )
  },
})
assert.equal(result.atlasImage.publicProfile, false)
assert.equal(result.atlasImage.location, "Montréal, Canada")
await assert.rejects(
  updateMyAtlasImageVisibility({
    ...base,
    location: "Banff, Canada",
    fetchImpl: async () =>
      Response.json({ atlasImage: metadata }, { headers: { ETag: '"rev-3"' } }),
  }),
  { code: "invalid_response" }
)
const exportSource = await fs.readFile(
  new URL("../src/features/my-atlas/export/storyExport.mjs", import.meta.url),
  "utf8"
)
const drawImage = new Function(
  "roundedRectangle",
  `return ${exportSource.slice(exportSource.indexOf("function drawFavoriteImage("), exportSource.indexOf("export function createMyAtlasStoryCanvas("))}`
)(() => {})
const labels = []
const context = new Proxy(
  {
    measureText: text => ({ width: Array.from(text).length * 11 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    fillText: text => labels.push(text),
  },
  { get: (target, key) => target[key] || (() => {}) }
)
drawImage(context, {}, "Montréal, Canada")
assert.equal(labels.join(""), "Montréal, Canada")
labels.length = 0
drawImage(context, {}, "🌎".repeat(120))
assert.equal(labels.length, 3)
assert.ok(labels[2].endsWith("…"))
assert.ok(labels.every(label => context.measureText(label).width <= 234))
console.log(
  "Required photo location, Unicode header, legacy metadata update and response confirmation tests passed."
)
