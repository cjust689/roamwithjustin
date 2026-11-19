import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import sharp from "sharp"

import { prepareGearImage } from "./lib/gear-image-preparation.mjs"
import {
  planGearImagePublication,
  sha256,
  validateGearImageReceipt,
  validateGearImageRecords,
} from "./lib/gear-image-publication.mjs"
import {
  parseArguments,
  publishGearImage,
} from "./publish-gear-image.mjs"
import { buildMediaSrcset } from "../src/content/selectors/media.mjs"

const temporaryRoot = await fs.promises.mkdtemp(
  path.join(os.tmpdir(), "roam-gear-publication-")
)

function gearRecords() {
  return {
    schemaVersion: 1,
    items: [
      {
        id: "camera-accessory",
        category: "other",
        brand: "Example",
        model: "One",
        name: "Camera accessory",
        description: "",
        imageAssetId: null,
        aliases: [],
        links: [],
        verificationStatus: "verified",
      },
    ],
    usage: [],
  }
}

function imageRecords() {
  return { schemaVersion: 1, assets: [], batches: [] }
}

function receiptFor(manifest, manifestSha256, suffix = "one") {
  return {
    schemaVersion: 1,
    batchId: manifest.batchId,
    manifestType: "gear-image-publication",
    objects: manifest.derivatives.map(derivative => ({
      objectKey: derivative.objectKey,
      byteSize: derivative.byteSize,
      sha256: derivative.sha256,
    })),
    verification: {
      method: "worker-r2-integrity-v2",
      endpoint: "https://upload.test",
      manifestSha256,
      verifiedAt: "2026-11-18T20:00:00.000Z",
      uploadProtocols: ["single"],
      requestIds: manifest.derivatives.map(
        (_, index) => "request-" + suffix + "-" + (index + 1)
      ),
    },
  }
}

async function createPreparedPackage(colour, sourceName) {
  const sourcePath = path.join(temporaryRoot, sourceName)
  await sharp({
    create: {
      width: 780,
      height: 520,
      channels: 3,
      background: colour,
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
      output: path.join(temporaryRoot, "prepared"),
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
  const manifestContents = await fs.promises.readFile(manifestFile, "utf8")
  const manifest = JSON.parse(manifestContents)
  const manifestSha256 = sha256(manifestContents)
  const receipt = receiptFor(manifest, manifestSha256, sourceName)
  const receiptFile = path.join(
    prepared.packageDirectory,
    "gear-r2-verification.json"
  )
  const receiptContents = JSON.stringify(receipt, null, 2) + "\n"
  await fs.promises.writeFile(receiptFile, receiptContents)
  return {
    manifest,
    manifestFile,
    manifestSha256,
    receipt,
    receiptFile,
    receiptSha256: sha256(receiptContents),
  }
}

try {
  assert.throws(
    () =>
      parseArguments([
        "--gear-id",
        "camera-accessory",
        "--manifest",
        "manifest.json",
        "--receipt",
        "receipt.json",
        "--apply",
      ]),
    /--approve-card/
  )
  const parsed = parseArguments([
    "--gear-id=camera-accessory",
    "--manifest=manifest.json",
    "--receipt=receipt.json",
    "--dry-run",
  ])
  assert.equal(parsed.dryRun, true)

  const first = await createPreparedPackage(
    { r: 24, g: 62, b: 96 },
    "camera-accessory-one.jpg"
  )
  assert.deepEqual(
    validateGearImageReceipt(first).errors,
    []
  )
  const initial = planGearImagePublication({
    gearRecords: gearRecords(),
    imageRecords: imageRecords(),
    manifest: first.manifest,
    manifestSha256: first.manifestSha256,
    receipt: first.receipt,
    receiptSha256: first.receiptSha256,
  })
  assert.deepEqual(initial.errors, [])
  assert.equal(initial.changed, true)
  assert.equal(initial.assetId, "image-gear-camera-accessory")
  assert.equal(initial.revision, 1)
  assert.equal(
    initial.gearRecords.items[0].imageAssetId,
    "image-gear-camera-accessory"
  )
  assert.equal(initial.imageRecords.assets[0].renditions.length, 3)
  assert.match(
    buildMediaSrcset(initial.imageRecords.assets[0]),
    /320\.webp 320w, .*640\.webp 640w, .*960\.webp 780w/
  )
  assert.equal(
    initial.imageRecords.batches[0].sourceSha256,
    first.manifest.source.sha256
  )
  assert.deepEqual(
    validateGearImageRecords(initial.imageRecords, {
      gearItems: initial.gearRecords.items,
    }).errors,
    []
  )

  const repeated = planGearImagePublication({
    gearRecords: initial.gearRecords,
    imageRecords: initial.imageRecords,
    manifest: first.manifest,
    manifestSha256: first.manifestSha256,
    receipt: first.receipt,
    receiptSha256: first.receiptSha256,
  })
  assert.deepEqual(repeated.errors, [])
  assert.equal(repeated.changed, false)

  const second = await createPreparedPackage(
    { r: 110, g: 48, b: 30 },
    "camera-accessory-two.jpg"
  )
  const refusedReplacement = planGearImagePublication({
    gearRecords: initial.gearRecords,
    imageRecords: initial.imageRecords,
    manifest: second.manifest,
    manifestSha256: second.manifestSha256,
    receipt: second.receipt,
    receiptSha256: second.receiptSha256,
  })
  assert.match(refusedReplacement.errors.join("\n"), /--replace-image/)
  const replacement = planGearImagePublication({
    gearRecords: initial.gearRecords,
    imageRecords: initial.imageRecords,
    manifest: second.manifest,
    manifestSha256: second.manifestSha256,
    receipt: second.receipt,
    receiptSha256: second.receiptSha256,
    replaceImage: true,
  })
  assert.deepEqual(replacement.errors, [])
  assert.equal(replacement.revision, 2)
  assert.equal(replacement.imageRecords.batches.length, 2)

  const badReceipt = structuredClone(first.receipt)
  badReceipt.objects[0].sha256 = "0".repeat(64)
  assert.match(
    validateGearImageReceipt({
      ...first,
      receipt: badReceipt,
    }).errors.join("\n"),
    /Receipt does not match/
  )

  const gearRecordsFile = path.join(temporaryRoot, "records.json")
  const gearImagesFile = path.join(temporaryRoot, "images.json")
  await fs.promises.writeFile(
    gearRecordsFile,
    JSON.stringify(gearRecords(), null, 2) + "\n"
  )
  await fs.promises.writeFile(
    gearImagesFile,
    JSON.stringify(imageRecords(), null, 2) + "\n"
  )
  const context = {
    approvedGearTrackingRulePartnerIds: [],
    journeys: [],
    otherMedia: [],
    otherMediaIds: [],
    otherObjectKeys: [],
    partners: [],
  }
  const dryRun = await publishGearImage(
    {
      dryRun: true,
      gearId: "camera-accessory",
      manifest: first.manifestFile,
      receipt: first.receiptFile,
      replaceImage: false,
    },
    { context, gearImagesFile, gearRecordsFile }
  )
  assert.equal(dryRun.changed, true)
  assert.equal(JSON.parse(await fs.promises.readFile(gearImagesFile)).assets.length, 0)

  const applied = await publishGearImage(
    {
      apply: true,
      approveCard: true,
      build: false,
      dryRun: false,
      gearId: "camera-accessory",
      manifest: first.manifestFile,
      receipt: first.receiptFile,
      replaceImage: false,
    },
    {
      context,
      gearImagesFile,
      gearRecordsFile,
      runCommand: async () => ({ passed: true }),
    }
  )
  assert.equal(applied.changed, true)
  const appliedGearContents = await fs.promises.readFile(gearRecordsFile, "utf8")
  const appliedImageContents = await fs.promises.readFile(gearImagesFile, "utf8")
  assert.equal(JSON.parse(appliedImageContents).assets.length, 1)

  await assert.rejects(
    publishGearImage(
      {
        apply: true,
        approveCard: true,
        build: false,
        dryRun: false,
        gearId: "camera-accessory",
        manifest: second.manifestFile,
        receipt: second.receiptFile,
        replaceImage: true,
      },
      {
        context,
        gearImagesFile,
        gearRecordsFile,
        runCommand: async () => ({ passed: false }),
      }
    ),
    /generated Gear files were restored/
  )
  assert.equal(await fs.promises.readFile(gearRecordsFile, "utf8"), appliedGearContents)
  assert.equal(await fs.promises.readFile(gearImagesFile, "utf8"), appliedImageContents)

  console.log("Gear image publication tests passed.")
} finally {
  await fs.promises.rm(temporaryRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 50,
  })
}
