const assert = require("assert")
const crypto = require("crypto")
const { spawnSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const sharp = require("sharp")
const { uploadMediaPackage } = require("./upload-media.js")

const projectRoot = path.resolve(__dirname, "..")
const testRoot = path.join(projectRoot, ".tmp-media-upload-test")
const packageDirectory = path.join(testRoot, "usvi-waterlemon-cay")
const videoPackageDirectory = path.join(
  testRoot,
  "usvi-waterlemon-cay-videos"
)
const manifestFile = path.join(packageDirectory, "publication-manifest.json")
const token = "test-upload-token-that-is-not-a-production-secret"

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

function testMp4Bytes(byteSize = 11 * 1024 * 1024 + 123) {
  const fileTypeBox = Buffer.alloc(24)
  fileTypeBox.writeUInt32BE(24, 0)
  fileTypeBox.write("ftyp", 4, "ascii")
  fileTypeBox.write("isom", 8, "ascii")
  fileTypeBox.writeUInt32BE(0, 12)
  fileTypeBox.write("isom", 16, "ascii")
  fileTypeBox.write("mp42", 20, "ascii")
  const data = Buffer.alloc(byteSize)
  fileTypeBox.copy(data)
  Buffer.from("test-video-payload").copy(data, fileTypeBox.length)
  return data
}

class MockR2Bucket {
  constructor() {
    this.objects = new Map()
    this.multipartUploads = new Map()
  }

  async head(key) {
    return this.objects.get(key) || null
  }

  async put(key, value, options = {}) {
    const condition = options.onlyIf
    const createOnly =
      condition instanceof Headers
        ? condition.get("if-none-match") === "*"
        : condition?.etagDoesNotMatch === "*"
    if (createOnly && this.objects.has(key)) return null

    const data = Buffer.from(await new Response(value).arrayBuffer())
    const actualSha256 = sha256(data)
    const expectedSha256 = Buffer.from(options.sha256).toString("hex")
    if (actualSha256 !== expectedSha256) {
      throw new Error("checksum mismatch")
    }
    const object = {
      checksums: { sha256: hexBuffer(actualSha256) },
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

  async createMultipartUpload(key, options = {}) {
    const uploadId = crypto.randomUUID()
    this.multipartUploads.set(uploadId, {
      key,
      options,
      parts: new Map(),
    })
    return this.multipartHandle(key, uploadId)
  }

  resumeMultipartUpload(key, uploadId) {
    return this.multipartHandle(key, uploadId)
  }

  multipartHandle(key, uploadId) {
    const bucket = this
    const session = () => {
      const value = bucket.multipartUploads.get(uploadId)
      if (!value || value.key !== key) throw new Error("NoSuchUpload")
      return value
    }
    return {
      key,
      uploadId,
      async uploadPart(partNumber, value) {
        const data = Buffer.from(await new Response(value).arrayBuffer())
        const etag = crypto.createHash("md5").update(data).digest("hex")
        session().parts.set(partNumber, { data, etag, partNumber })
        return { etag, partNumber }
      },
      async complete(parts) {
        const active = session()
        const selected = parts.map(part => {
          const stored = active.parts.get(part.partNumber)
          if (!stored || stored.etag !== part.etag) {
            throw new Error("InvalidPart")
          }
          return stored
        })
        const data = Buffer.concat(selected.map(part => part.data))
        const multipartDigest = crypto
          .createHash("md5")
          .update(
            Buffer.concat(
              selected.map(part => Buffer.from(part.etag, "hex"))
            )
          )
          .digest("hex")
        const object = {
          checksums: {},
          customMetadata: { ...(active.options.customMetadata || {}) },
          etag: `${multipartDigest}-${selected.length}`,
          httpMetadata: { ...(active.options.httpMetadata || {}) },
          key,
          size: data.length,
          uploaded: new Date(),
          version: crypto.randomUUID(),
        }
        bucket.objects.set(key, object)
        bucket.multipartUploads.delete(uploadId)
        return object
      },
      async abort() {
        bucket.multipartUploads.delete(uploadId)
      },
    }
  }
}

async function createPackage() {
  fs.mkdirSync(packageDirectory, { recursive: true })
  const filename = "waterlemon-cay-001.jpg"
  const imageFile = path.join(packageDirectory, filename)
  await sharp({
    create: {
      width: 96,
      height: 64,
      channels: 3,
      background: { r: 25, g: 100, b: 150 },
    },
  })
    .jpeg({ quality: 82 })
    .toFile(imageFile)
  const data = fs.readFileSync(imageFile)
  const checksum = sha256(data)
  const batchId = `media-usvi-waterlemon-cay-${checksum.slice(0, 16)}`
  const r2Prefix = `images/usvi/waterlemon-cay/${batchId}/`
  const manifest = {
    schemaVersion: 1,
    manifestType: "journey-media-publication",
    batchId,
    journeyId: "usvi-st-john-2025",
    journeySlug: "usvi",
    placeId: "waterlemon-cay",
    visitId: "usvi-st-john-2025-waterlemon-cay",
    inputTag: "waterlemon cay",
    r2Prefix,
    assets: [
      {
        provisionalId: `local-usvi-waterlemon-cay-001-${checksum.slice(0, 12)}`,
        assetId: null,
        revision: null,
        source: { originalFilename: "IMG_0001.jpg" },
        output: {
          relativePath: filename,
          objectKey: `${r2Prefix}${filename}`,
          mimeType: "image/jpeg",
          width: 96,
          height: 64,
          byteSize: data.length,
          sha256: checksum,
        },
        capture: {
          placeId: null,
          capturedAt: null,
          cameraModelRaw: null,
          lensModelRaw: null,
        },
        associations: {
          journeyId: "usvi-st-john-2025",
          visitId: "usvi-st-john-2025-waterlemon-cay",
          placeId: "waterlemon-cay",
          experienceId: null,
        },
        placement: {
          role: "gallery",
          visibility: "published",
          sortOrder: 1,
        },
        rights: { owner: "roam-with-justin", status: "owned" },
      },
    ],
  }
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
  return { imageFile, manifest }
}

function createVideoPackage() {
  fs.mkdirSync(videoPackageDirectory, { recursive: true })
  const filename = "waterlemon-cay-001.mp4"
  const videoFile = path.join(videoPackageDirectory, filename)
  const data = testMp4Bytes()
  fs.writeFileSync(videoFile, data)
  const checksum = sha256(data)
  const batchId = `media-usvi-waterlemon-cay-video-${checksum.slice(0, 12)}`
  const r2Prefix = `videos/usvi/waterlemon-cay/${batchId}/`
  const manifest = {
    schemaVersion: 1,
    manifestType: "journey-media-publication",
    batchId,
    journeyId: "usvi-st-john-2025",
    journeySlug: "usvi",
    placeId: "waterlemon-cay",
    visitId: "usvi-st-john-2025-waterlemon-cay",
    inputTag: "waterlemon cay video",
    mediaKind: "video",
    r2Prefix,
    assets: [
      {
        provisionalId: `local-usvi-waterlemon-cay-001-${checksum.slice(0, 12)}`,
        assetId: null,
        revision: null,
        source: { originalFilename: "resolve-export.mp4" },
        output: {
          relativePath: filename,
          objectKey: `${r2Prefix}${filename}`,
          mimeType: "video/mp4",
          width: null,
          height: null,
          durationSeconds: null,
          byteSize: data.length,
          sha256: checksum,
        },
        capture: {
          placeId: null,
          capturedAt: null,
          cameraModelRaw: null,
          lensModelRaw: null,
        },
        associations: {
          journeyId: "usvi-st-john-2025",
          visitId: "usvi-st-john-2025-waterlemon-cay",
          placeId: "waterlemon-cay",
          experienceId: null,
        },
        placement: {
          role: "gallery",
          visibility: "published",
          sortOrder: 1,
        },
        rights: { owner: "roam-with-justin", status: "owned" },
      },
    ],
  }
  const videoManifestFile = path.join(
    videoPackageDirectory,
    "publication-manifest.json"
  )
  fs.writeFileSync(
    videoManifestFile,
    `${JSON.stringify(manifest, null, 2)}\n`
  )
  return { manifest, videoFile, videoManifestFile }
}

async function main() {
  const resolvedRoot = path.resolve(testRoot)
  if (!resolvedRoot.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Unsafe test directory: ${resolvedRoot}`)
  }
  fs.rmSync(testRoot, { recursive: true, force: true })

  try {
    const { imageFile, manifest } = await createPackage()
    const workerModule = await import(
      `${pathToFileURL(
        path.join(
          projectRoot,
          "workers",
          "media-upload",
          "src",
          "index.mjs"
        )
      ).href}?test=${Date.now()}`
    )
    const bucket = new MockR2Bucket()
    const env = {
      ALLOWED_R2_PREFIXES: "images/,videos/",
      MAX_IMAGE_UPLOAD_BYTES: String(25 * 1024 * 1024),
      MAX_MULTIPART_PART_BYTES: String(5 * 1024 * 1024),
      MAX_VIDEO_UPLOAD_BYTES: String(190 * 1024 * 1024),
      MEDIA_BUCKET: bucket,
      MEDIA_UPLOAD_TOKEN: token,
    }
    let requestCount = 0
    const fetchImpl = async (url, init) => {
      requestCount += 1
      return workerModule.handleRequest(new Request(url, init), env)
    }

    const health = await workerModule.handleRequest(
      new Request("https://upload.test/health"),
      {}
    )
    assert.strictEqual(health.status, 200)

    const unauthorized = await workerModule.handleRequest(
      new Request(
        `https://upload.test/v1/objects/${manifest.assets[0].output.objectKey}`,
        { method: "PUT", body: "no" }
      ),
      env
    )
    assert.strictEqual(unauthorized.status, 401)

    const dryRun = await uploadMediaPackage({
      dryRun: true,
      manifestFile,
    })
    assert.strictEqual(dryRun.dryRun, true)
    assert.strictEqual(bucket.objects.size, 0)
    assert.strictEqual(requestCount, 0)

    const first = await uploadMediaPackage({
      endpoint: "https://upload.test",
      fetchImpl,
      manifestFile,
      retries: 0,
      token,
    })
    assert.strictEqual(first.results[0].outcome, "uploaded")
    assert.strictEqual(first.results[0].digestVerified, true)
    assert.strictEqual(bucket.objects.size, 1)
    assert.strictEqual(
      bucket.objects.get(manifest.assets[0].output.objectKey).customMetadata
        .batchId,
      manifest.batchId
    )
    const receiptFile = path.join(packageDirectory, "r2-verification.json")
    const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"))
    assert.strictEqual(receipt.batchId, manifest.batchId)
    assert.deepStrictEqual(receipt.objects, [
      {
        objectKey: manifest.assets[0].output.objectKey,
        byteSize: manifest.assets[0].output.byteSize,
        sha256: manifest.assets[0].output.sha256,
      },
    ])

    const ingestDryRun = spawnSync(
      process.execPath,
      [
        "scripts/ingest-media.js",
        "--manifest",
        manifestFile,
        "--verification-receipt",
        receiptFile,
        "--dry-run",
      ],
      { cwd: projectRoot, encoding: "utf8" }
    )
    assert.strictEqual(
      ingestDryRun.status,
      0,
      `${ingestDryRun.stdout}\n${ingestDryRun.stderr}`
    )
    assert.match(ingestDryRun.stdout, /Verification: receipt-sha256/)

    const second = await uploadMediaPackage({
      endpoint: "https://upload.test",
      fetchImpl,
      manifestFile,
      retries: 0,
      token,
    })
    assert.strictEqual(second.results[0].outcome, "already_present")
    assert.strictEqual(second.receiptWrite.existing, true)

    const videoPackage = createVideoPackage()
    const videoDryRun = await uploadMediaPackage({
      dryRun: true,
      manifestFile: videoPackage.videoManifestFile,
    })
    assert.strictEqual(videoDryRun.dryRun, true)
    let rejectedPart = false
    await assert.rejects(
      () =>
        uploadMediaPackage({
          concurrency: 2,
          endpoint: "https://upload.test",
          fetchImpl: async (url, init) => {
            const requestUrl = new URL(url)
            if (
              !rejectedPart &&
              requestUrl.searchParams.get("action") === "multipart-part" &&
              requestUrl.searchParams.get("partNumber") === "2"
            ) {
              rejectedPart = true
              return Response.json(
                {
                  error: "test_part_rejection",
                  message: "Simulated part rejection",
                },
                { status: 422 }
              )
            }
            return fetchImpl(url, init)
          },
          manifestFile: videoPackage.videoManifestFile,
          multipartPartBytes: 5 * 1024 * 1024,
          multipartThresholdBytes: 5 * 1024 * 1024,
          retries: 0,
          token,
        }),
      /Multipart upload failed/
    )
    assert.strictEqual(rejectedPart, true)
    assert.strictEqual(bucket.multipartUploads.size, 0)
    assert.strictEqual(
      bucket.objects.has(videoPackage.manifest.assets[0].output.objectKey),
      false
    )

    const videoUpload = await uploadMediaPackage({
      concurrency: 2,
      endpoint: "https://upload.test",
      fetchImpl,
      manifestFile: videoPackage.videoManifestFile,
      multipartPartBytes: 5 * 1024 * 1024,
      multipartThresholdBytes: 5 * 1024 * 1024,
      retries: 0,
      token,
    })
    assert.strictEqual(videoUpload.results[0].outcome, "uploaded")
    assert.strictEqual(videoUpload.results[0].uploadProtocol, "multipart")
    assert.strictEqual(videoUpload.results[0].partCount, 3)
    const storedVideo = bucket.objects.get(
      videoPackage.manifest.assets[0].output.objectKey
    )
    assert.strictEqual(storedVideo.httpMetadata.contentType, "video/mp4")
    assert.strictEqual(storedVideo.size, fs.statSync(videoPackage.videoFile).size)
    assert.strictEqual(bucket.multipartUploads.size, 0)

    const repeatedVideo = await uploadMediaPackage({
      endpoint: "https://upload.test",
      fetchImpl,
      manifestFile: videoPackage.videoManifestFile,
      multipartPartBytes: 5 * 1024 * 1024,
      multipartThresholdBytes: 5 * 1024 * 1024,
      retries: 0,
      token,
    })
    assert.strictEqual(repeatedVideo.results[0].outcome, "already_present")
    assert.strictEqual(repeatedVideo.results[0].uploadProtocol, "multipart")

    let retryAttempts = 0
    const retried = await uploadMediaPackage({
      endpoint: "https://upload.test",
      fetchImpl: async (url, init) => {
        retryAttempts += 1
        if (retryAttempts === 1) {
          return Response.json(
            { error: "temporary", message: "try again" },
            { status: 503 }
          )
        }
        return fetchImpl(url, init)
      },
      manifestFile,
      retries: 1,
      token,
      waitImpl: async () => {},
    })
    assert.strictEqual(retryAttempts, 2)
    assert.strictEqual(retried.results[0].outcome, "already_present")

    const storedBeforeConflict = bucket.objects.get(
      manifest.assets[0].output.objectKey
    )
    const conflictingBody = Buffer.from("different bytes")
    const conflict = await workerModule.handleRequest(
      new Request(
        `https://upload.test/v1/objects/${manifest.assets[0].output.objectKey}`,
        {
          method: "PUT",
          headers: {
            authorization: `Bearer ${token}`,
            "content-length": String(conflictingBody.length),
            "content-type": "image/jpeg",
            "x-media-batch-id": manifest.batchId,
            "x-media-byte-size": String(conflictingBody.length),
            "x-media-sha256": sha256(conflictingBody),
          },
          body: conflictingBody,
        }
      ),
      env
    )
    assert.strictEqual(conflict.status, 409)
    assert.strictEqual(
      bucket.objects.get(manifest.assets[0].output.objectKey),
      storedBeforeConflict
    )

    const badDigestBody = Buffer.from("wrong digest")
    const checksumMismatch = await workerModule.handleRequest(
      new Request(
        `https://upload.test/v1/objects/images/usvi/test/${manifest.batchId}/wrong.jpg`,
        {
          method: "PUT",
          headers: {
            authorization: `Bearer ${token}`,
            "content-length": String(badDigestBody.length),
            "content-type": "image/jpeg",
            "x-media-batch-id": manifest.batchId,
            "x-media-byte-size": String(badDigestBody.length),
            "x-media-sha256": "0".repeat(64),
          },
          body: badDigestBody,
        }
      ),
      env
    )
    assert.strictEqual(checksumMismatch.status, 422)

    const outsidePrefix = await workerModule.handleRequest(
      new Request("https://upload.test/v1/objects/private/file.jpg", {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-length": "1",
          "content-type": "image/jpeg",
          "x-media-batch-id": manifest.batchId,
          "x-media-byte-size": "1",
          "x-media-sha256": "0".repeat(64),
        },
        body: "x",
      }),
      env
    )
    assert.strictEqual(outsidePrefix.status, 422)

    fs.appendFileSync(imageFile, "tampered")
    await assert.rejects(
      () => uploadMediaPackage({ dryRun: true, manifestFile }),
      /size is .*manifest declares/
    )

    console.log("Media upload tests passed.")
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
