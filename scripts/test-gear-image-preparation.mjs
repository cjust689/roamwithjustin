import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import sharp from "sharp"

import {
  parseGearImageArguments,
  prepareGearImage,
} from "./lib/gear-image-preparation.mjs"

const temporaryRoot = await fs.promises.mkdtemp(
  path.join(os.tmpdir(), "roam-gear-image-")
)

try {
  const sourcePath = path.join(temporaryRoot, "camera-accessory.jpg")
  const outputDirectory = path.join(temporaryRoot, "prepared")
  const sourceBytes = await sharp({
    create: {
      width: 900,
      height: 600,
      channels: 4,
      background: { r: 24, g: 72, b: 108, alpha: 0.72 },
    },
  })
    .withExif({ IFD0: { Artist: "Private Owner" } })
    .jpeg({ quality: 92 })
    .toBuffer()
  await fs.promises.writeFile(sourcePath, sourceBytes)
  assert.ok((await sharp(sourceBytes).metadata()).exif)

  assert.throws(
    () =>
      parseGearImageArguments([
        "--gear-id",
        "camera-accessory",
        "--source",
        sourcePath,
        "--output",
        outputDirectory,
        "--rights-owner",
        "roam-with-justin",
        "--rights-status",
        "owned",
        "--alt",
        "Camera accessory on a dark background",
        "--dry-run",
      ]),
    /--rights-reviewed is required/
  )

  const dryRunOptions = parseGearImageArguments([
    "--gear-id",
    "camera-accessory",
    "--source",
    sourcePath,
    "--output",
    outputDirectory,
    "--rights-owner",
    "roam-with-justin",
    "--rights-status",
    "owned",
    "--rights-reviewed",
    "--alt",
    "Camera accessory on a dark background",
    "--dry-run",
  ])
  const dryRun = await prepareGearImage(dryRunOptions, { log() {} })
  assert.equal(dryRun.status, "dry-run")
  assert.equal(dryRun.manifest.manifestType, "gear-image-publication")
  assert.equal(dryRun.manifest.gearId, "camera-accessory")
  assert.equal(dryRun.manifest.derivatives.length, 3)
  assert.equal(await exists(dryRun.packageDirectory), false)
  assert.ok(
    dryRun.manifest.derivatives.every(derivative =>
      derivative.objectKey.startsWith("images/gear/camera-accessory/")
    )
  )

  const applyOptions = { ...dryRunOptions, apply: true, dryRun: false }
  const created = await prepareGearImage(applyOptions, { log() {} })
  assert.equal(created.status, "created")
  assert.equal(created.packageDirectory, dryRun.packageDirectory)

  const manifestPath = path.join(
    created.packageDirectory,
    "gear-image-manifest.json"
  )
  const manifestText = await fs.promises.readFile(manifestPath, "utf8")
  const manifest = JSON.parse(manifestText)
  assert.equal(manifest.source.originalFilename, "camera-accessory.jpg")
  assert.equal(manifest.rights.reviewed, true)
  assert.equal(manifest.rights.status, "owned")
  assert.equal(manifest.processing.metadata, "stripped")
  assert.doesNotMatch(manifestText, /Private Owner/)
  assert.doesNotMatch(manifestText, new RegExp(escapeRegex(temporaryRoot)))
  assert.deepEqual(
    manifest.derivatives.map(({ width, height }) => [width, height]),
    [
      [320, 213],
      [640, 427],
      [900, 600],
    ]
  )

  for (const derivative of manifest.derivatives) {
    const derivativePath = path.join(
      created.packageDirectory,
      derivative.relativePath
    )
    const metadata = await sharp(
      await fs.promises.readFile(derivativePath)
    ).metadata()
    assert.equal(metadata.format, "webp")
    assert.equal(metadata.exif, undefined)
    assert.equal(metadata.iptc, undefined)
    assert.equal(metadata.xmp, undefined)
  }

  const unchanged = await prepareGearImage(applyOptions, { log() {} })
  assert.equal(unchanged.status, "unchanged")
  assert.equal(unchanged.manifest.contentHash, created.manifest.contentHash)

  const corruptedPath = path.join(created.packageDirectory, "320.webp")
  await fs.promises.writeFile(corruptedPath, Buffer.from("corrupt"))
  await assert.rejects(
    prepareGearImage(applyOptions, { log() {} }),
    /failed checksum verification/
  )

  const mismatchedPath = path.join(temporaryRoot, "mismatched.jpg")
  await fs.promises.writeFile(
    mismatchedPath,
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer()
  )
  await assert.rejects(
    prepareGearImage(
      { ...dryRunOptions, source: mismatchedPath },
      { log() {} }
    ),
    /does not match decoded png bytes/
  )

  const pngSourcePath = path.join(temporaryRoot, "transparent-product.png")
  await fs.promises.writeFile(
    pngSourcePath,
    await sharp({
      create: {
        width: 500,
        height: 700,
        channels: 4,
        background: { r: 180, g: 120, b: 40, alpha: 0.35 },
      },
    })
      .png()
      .toBuffer()
  )
  const pngResult = await prepareGearImage(
    {
      ...dryRunOptions,
      gearId: "transparent-product",
      source: pngSourcePath,
    },
    { log() {} }
  )
  assert.equal(pngResult.manifest.source.mimeType, "image/png")
  assert.deepEqual(
    pngResult.manifest.derivatives.map(({ width, height }) => [width, height]),
    [
      [229, 320],
      [457, 640],
      [500, 700],
    ]
  )

  console.log("Gear image preparation tests passed.")
} finally {
  await fs.promises.rm(temporaryRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 50,
  })
}

async function exists(target) {
  try {
    await fs.promises.access(target)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
