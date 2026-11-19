import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"

import sharp from "sharp"

import { prepareGearImage } from "./lib/gear-image-preparation.mjs"

const require = createRequire(import.meta.url)
const {
  parseArguments,
  uploadMediaPackage,
} = require("./upload-media.js")

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temporaryRoot = await fs.promises.mkdtemp(
  path.join(os.tmpdir(), "roam-gear-upload-")
)
const token = "gear-upload-test-token-not-used-in-production"

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function hexBuffer(value) {
  const buffer = Buffer.from(value, "hex")
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )
}

class MockR2Bucket {
  constructor() {
    this.objects = new Map()
  }

  async head(key) {
    return this.objects.get(key) || null
  }

  async put(key, value, options = {}) {
    if (options.onlyIf?.get("if-none-match") === "*" && this.objects.has(key)) {
      return null
    }
    const data = Buffer.from(await new Response(value).arrayBuffer())
    const digest = sha256(data)
    assert.equal(digest, Buffer.from(options.sha256).toString("hex"))
    const object = {
      checksums: { sha256: hexBuffer(digest) },
      customMetadata: { ...(options.customMetadata || {}) },
      etag: crypto.createHash("md5").update(data).digest("hex"),
      httpMetadata: { ...(options.httpMetadata || {}) },
      key,
      size: data.length,
      uploaded: new Date(),
      version: crypto.randomUUID(),
    }
    this.objects.set(key, object)
    return object
  }
}

try {
  const sourcePath = path.join(temporaryRoot, "camera-accessory.jpg")
  const outputDirectory = path.join(temporaryRoot, "prepared")
  await sharp({
    create: {
      width: 720,
      height: 480,
      channels: 3,
      background: { r: 28, g: 64, b: 92 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(sourcePath)

  const prepared = await prepareGearImage(
    {
      alt: "Camera accessory on a dark background",
      apply: true,
      dryRun: false,
      gearId: "camera-accessory",
      output: outputDirectory,
      rightsOwner: "roam-with-justin",
      rightsReviewed: true,
      rightsStatus: "owned",
      source: sourcePath,
    },
    { log() {} }
  )
  const manifestFile = path.join(
    prepared.packageDirectory,
    "gear-image-manifest.json"
  )

  const parsed = parseArguments(["--gear", "--manifest", manifestFile, "--dry-run"])
  assert.equal(parsed.gear, true)
  const dryRun = await uploadMediaPackage({
    dryRun: true,
    gear: true,
    manifestFile,
  })
  assert.equal(dryRun.mediaPackage.packageKind, "gear")
  assert.equal(dryRun.mediaPackage.preparedAssets.length, 3)

  const workerModule = await import(
    `${pathToFileURL(
      path.join(projectRoot, "workers", "media-upload", "src", "index.mjs")
    ).href}?gear-upload-test=${Date.now()}`
  )
  const bucket = new MockR2Bucket()
  const env = {
    ALLOWED_R2_PREFIXES: "images/,videos/",
    MAX_IMAGE_UPLOAD_BYTES: String(25 * 1024 * 1024),
    MEDIA_BUCKET: bucket,
    MEDIA_UPLOAD_TOKEN: token,
  }
  const observedBatchIds = []
  const fetchImpl = async (url, init) => {
    observedBatchIds.push(new Headers(init.headers).get("x-media-batch-id"))
    return workerModule.handleRequest(new Request(url, init), env)
  }

  const uploaded = await uploadMediaPackage({
    endpoint: "https://upload.test",
    fetchImpl,
    gear: true,
    manifestFile,
    retries: 0,
    token,
  })
  assert.equal(bucket.objects.size, 3)
  assert.deepEqual(
    observedBatchIds,
    prepared.manifest.derivatives.map(() => prepared.manifest.contentHash)
  )
  assert.ok(uploaded.results.every(result => result.outcome === "uploaded"))
  for (const derivative of prepared.manifest.derivatives) {
    const stored = bucket.objects.get(derivative.objectKey)
    assert.equal(stored.httpMetadata.contentType, "image/webp")
    assert.equal(stored.customMetadata.batchId, prepared.manifest.contentHash)
  }

  const receiptFile = path.join(
    prepared.packageDirectory,
    "gear-r2-verification.json"
  )
  const receipt = JSON.parse(await fs.promises.readFile(receiptFile, "utf8"))
  assert.equal(receipt.batchId, prepared.manifest.batchId)
  assert.equal(receipt.manifestType, "gear-image-publication")
  assert.equal(receipt.objects.length, 3)
  assert.equal(receipt.verification.method, "worker-r2-integrity-v2")

  const preparedAgain = await prepareGearImage(
    {
      alt: "Camera accessory on a dark background",
      apply: true,
      dryRun: false,
      gearId: "camera-accessory",
      output: outputDirectory,
      rightsOwner: "roam-with-justin",
      rightsReviewed: true,
      rightsStatus: "owned",
      source: sourcePath,
    },
    { log() {} }
  )
  assert.equal(preparedAgain.status, "unchanged")

  observedBatchIds.length = 0
  const repeated = await uploadMediaPackage({
    endpoint: "https://upload.test",
    fetchImpl,
    gear: true,
    manifestFile,
    retries: 0,
    token,
  })
  assert.ok(
    repeated.results.every(result => result.outcome === "already_present")
  )
  assert.equal(repeated.receiptWrite.existing, true)

  console.log("Gear image upload tests passed.")
} finally {
  await fs.promises.rm(temporaryRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 50,
  })
}
