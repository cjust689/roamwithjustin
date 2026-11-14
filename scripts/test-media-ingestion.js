const assert = require("assert")
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const sharp = require("sharp")
const {
  planMediaIngestion,
  sha256,
  validateManifest,
} = require("./lib/media-ingestion.js")

const projectRoot = path.resolve(__dirname, "..")
const testRoot = path.join(projectRoot, ".tmp-media-ingestion-test")
const sourceDirectory = path.join(testRoot, "source")
const outputDirectory = path.join(testRoot, "ready")

function runNode(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
  })
  assert.strictEqual(
    result.status,
    expectedStatus,
    `${args.join(" ")} returned ${result.status}\n${result.stdout}\n${result.stderr}`
  )
  return result
}

function emptyRecords() {
  return { schemaVersion: 1, assets: [], placements: [], batches: [] }
}

async function main() {
  const resolvedRoot = path.resolve(testRoot)
  if (!resolvedRoot.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Unsafe test directory: ${resolvedRoot}`)
  }

  fs.rmSync(testRoot, { recursive: true, force: true })
  fs.mkdirSync(sourceDirectory, { recursive: true })

  try {
    await sharp({
      create: {
        width: 320,
        height: 200,
        channels: 3,
        background: { r: 30, g: 90, b: 140 },
      },
    })
      .jpeg({ quality: 94 })
      .toFile(path.join(sourceDirectory, "IMG_0001.jpg"))

    const listedPlaces = runNode([
      "scripts/ingest-media.js",
      "--places",
      "--journey",
      "usvi-st-john-2025",
    ])
    assert.match(
      listedPlaces.stdout,
      /usvi-st-john-2025\twaterlemon-cay\tusvi-st-john-2025-waterlemon-cay\tWaterlemon Cay/
    )

    const prepareArgs = [
      "scripts/optimize-images.js",
      "--package",
      "--source",
      sourceDirectory,
      "--output",
      outputDirectory,
      "--tag",
      "usvi",
      "--rights-owner",
      "roam-with-justin",
      "--rights-status",
      "owned",
    ]
    const prepared = runNode(prepareArgs)
    assert.match(prepared.stdout, /usvi-st-john-2025/)

    const packageDirectory = path.join(outputDirectory, "usvi")
    const manifestFile = path.join(
      packageDirectory,
      "publication-manifest.json"
    )
    const manifestContents = fs.readFileSync(manifestFile, "utf8")
    const manifest = JSON.parse(manifestContents)
    assert.strictEqual(manifest.journeyId, "usvi-st-john-2025")
    assert.strictEqual(manifest.r2Prefix, `images/usvi/${manifest.batchId}/`)
    assert.strictEqual(manifest.assets.length, 1)
    assert.strictEqual(manifest.assets[0].rights.status, "owned")

    const output = manifest.assets[0].output
    const imageData = fs.readFileSync(
      path.join(packageDirectory, output.relativePath)
    )
    assert.strictEqual(imageData.length, output.byteSize)
    assert.strictEqual(sha256(imageData), output.sha256)

    const journey = {
      id: "usvi-st-john-2025",
      slug: "usvi",
      title: "St. John, USVI",
      visits: [
        {
          id: "usvi-st-john-2025-waterlemon-cay",
          placeId: "waterlemon-cay",
        },
      ],
    }
    assert.deepStrictEqual(
      validateManifest(manifest, { journeys: [journey] }).errors,
      []
    )

    const context = {
      journeys: [journey],
      staticMedia: [],
      manifestSha256: sha256(manifestContents),
      verification: { method: "receipt-sha256" },
    }
    const firstPlan = planMediaIngestion(manifest, emptyRecords(), context)
    assert.deepStrictEqual(firstPlan.errors, [])
    assert.strictEqual(firstPlan.changed, true)
    assert.strictEqual(firstPlan.records.assets.length, 1)
    assert.strictEqual(firstPlan.records.placements.length, 1)
    const secondPlan = planMediaIngestion(manifest, firstPlan.records, context)
    assert.deepStrictEqual(secondPlan.errors, [])
    assert.strictEqual(secondPlan.changed, false)

    const revisionManifest = JSON.parse(JSON.stringify(manifest))
    revisionManifest.batchId = "media-usvi-explicit-revision"
    revisionManifest.r2Prefix = "images/usvi/media-usvi-explicit-revision/"
    revisionManifest.assets[0].assetId = firstPlan.assetIds[0]
    revisionManifest.assets[0].revision = 2
    revisionManifest.assets[0].output.objectKey = `${revisionManifest.r2Prefix}${output.relativePath}`
    const revisionPlan = planMediaIngestion(
      revisionManifest,
      firstPlan.records,
      {
        ...context,
        manifestSha256: sha256(JSON.stringify(revisionManifest)),
      }
    )
    assert.deepStrictEqual(revisionPlan.errors, [])
    assert.strictEqual(revisionPlan.records.assets.length, 1)
    assert.strictEqual(revisionPlan.records.assets[0].publication.revision, 2)
    assert.strictEqual(revisionPlan.records.batches[1].sequence, 2)
    assert.strictEqual(
      revisionPlan.records.placements[0].publicationSequence,
      1
    )

    const staleRevision = JSON.parse(JSON.stringify(revisionManifest))
    staleRevision.batchId = "media-usvi-stale-revision"
    staleRevision.r2Prefix = "images/usvi/media-usvi-stale-revision/"
    staleRevision.assets[0].output.objectKey = `${staleRevision.r2Prefix}${output.relativePath}`
    const stalePlan = planMediaIngestion(staleRevision, revisionPlan.records, {
      ...context,
      manifestSha256: sha256(JSON.stringify(staleRevision)),
    })
    assert.match(stalePlan.errors.join("\n"), /must follow current revision 2/)

    const receiptFile = path.join(testRoot, "verification-receipt.json")
    fs.writeFileSync(
      receiptFile,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          batchId: manifest.batchId,
          objects: [
            {
              objectKey: output.objectKey,
              byteSize: output.byteSize,
              sha256: output.sha256,
            },
          ],
        },
        null,
        2
      )}\n`
    )
    const dryRun = runNode([
      "scripts/ingest-media.js",
      "--manifest",
      manifestFile,
      "--verification-receipt",
      receiptFile,
      "--dry-run",
    ])
    assert.match(dryRun.stdout, /Dry run complete/)
    assert.match(dryRun.stdout, /receipt-sha256/)

    const unverifiedDryRun = runNode([
      "scripts/ingest-media.js",
      "--manifest",
      manifestFile,
      "--dry-run",
    ])
    assert.match(unverifiedDryRun.stdout, /not-verified-dry-run/)

    const placeOutputDirectory = path.join(testRoot, "ready-place")
    const placePrepared = runNode([
      "scripts/optimize-images.js",
      "--package",
      "--source",
      sourceDirectory,
      "--output",
      placeOutputDirectory,
      "--tag",
      "waterlemon cay",
      "--journey",
      "usvi-st-john-2025",
      "--place",
      "waterlemon-cay",
      "--rights-owner",
      "roam-with-justin",
      "--rights-status",
      "owned",
    ])
    assert.match(placePrepared.stdout, /Place scope: Waterlemon Cay/)
    const placePackageDirectory = path.join(
      placeOutputDirectory,
      "usvi-waterlemon-cay"
    )
    const placeManifestContents = fs.readFileSync(
      path.join(placePackageDirectory, "publication-manifest.json"),
      "utf8"
    )
    const placeManifest = JSON.parse(placeManifestContents)
    assert.strictEqual(placeManifest.placeId, "waterlemon-cay")
    assert.strictEqual(
      placeManifest.visitId,
      "usvi-st-john-2025-waterlemon-cay"
    )
    assert.strictEqual(
      placeManifest.assets[0].output.relativePath,
      "waterlemon-cay-001.jpg"
    )
    assert.strictEqual(
      placeManifest.r2Prefix,
      `images/usvi/waterlemon-cay/${placeManifest.batchId}/`
    )
    assert.deepStrictEqual(placeManifest.assets[0].associations, {
      journeyId: "usvi-st-john-2025",
      visitId: "usvi-st-john-2025-waterlemon-cay",
      placeId: "waterlemon-cay",
      experienceId: null,
    })
    assert.deepStrictEqual(
      validateManifest(placeManifest, { journeys: [journey] }).errors,
      []
    )

    const placePlan = planMediaIngestion(placeManifest, emptyRecords(), {
      journeys: [journey],
      staticMedia: [],
      manifestSha256: sha256(placeManifestContents),
      verification: { method: "receipt-sha256" },
    })
    assert.deepStrictEqual(placePlan.errors, [])
    assert.strictEqual(
      placePlan.records.placements[0].placeId,
      "waterlemon-cay"
    )
    assert.strictEqual(
      placePlan.records.placements[0].visitId,
      "usvi-st-john-2025-waterlemon-cay"
    )

    const collisionPlan = planMediaIngestion(
      placeManifest,
      firstPlan.records,
      {
        ...context,
        manifestSha256: sha256(placeManifestContents),
      }
    )
    assert.match(
      collisionPlan.errors.join("\n"),
      /collides with generated ID/
    )

    const reassociationContext = {
      ...context,
      manifestSha256: sha256(placeManifestContents),
      reassociateExisting: true,
    }
    const reassociationPlan = planMediaIngestion(
      placeManifest,
      firstPlan.records,
      reassociationContext
    )
    assert.deepStrictEqual(reassociationPlan.errors, [])
    assert.strictEqual(reassociationPlan.changed, true)
    assert.strictEqual(reassociationPlan.records.assets.length, 1)
    assert.strictEqual(reassociationPlan.records.placements.length, 1)
    assert.strictEqual(reassociationPlan.records.batches.length, 2)
    assert.strictEqual(
      reassociationPlan.records.assets[0].id,
      firstPlan.assetIds[0]
    )
    assert.strictEqual(
      reassociationPlan.records.assets[0].source.objectKey,
      placeManifest.assets[0].output.objectKey
    )
    assert.strictEqual(
      reassociationPlan.records.assets[0].publication.revision,
      2
    )
    assert.strictEqual(
      reassociationPlan.records.assets[0].publication.batchId,
      placeManifest.batchId
    )
    assert.strictEqual(
      reassociationPlan.records.placements[0].placeId,
      "waterlemon-cay"
    )
    assert.strictEqual(
      reassociationPlan.records.placements[0].visitId,
      "usvi-st-john-2025-waterlemon-cay"
    )
    assert.strictEqual(
      reassociationPlan.records.placements[0].batchId,
      placeManifest.batchId
    )
    assert.match(reassociationPlan.message, /Reassociated 1 existing Media/)

    const repeatedReassociation = planMediaIngestion(
      placeManifest,
      reassociationPlan.records,
      reassociationContext
    )
    assert.deepStrictEqual(repeatedReassociation.errors, [])
    assert.strictEqual(repeatedReassociation.changed, false)

    const weakVerificationPlan = planMediaIngestion(
      placeManifest,
      firstPlan.records,
      {
        ...reassociationContext,
        verification: { method: "public-head-size-and-mime" },
      }
    )
    assert.match(
      weakVerificationPlan.errors.join("\n"),
      /requires checksum verification from a receipt/
    )

    const alreadyScopedManifest = JSON.parse(JSON.stringify(placeManifest))
    alreadyScopedManifest.batchId = "media-usvi-already-scoped"
    alreadyScopedManifest.r2Prefix =
      "images/usvi/waterlemon-cay/media-usvi-already-scoped/"
    alreadyScopedManifest.assets[0].output.objectKey =
      `${alreadyScopedManifest.r2Prefix}${alreadyScopedManifest.assets[0].output.relativePath}`
    const alreadyScopedPlan = planMediaIngestion(
      alreadyScopedManifest,
      reassociationPlan.records,
      {
        ...reassociationContext,
        manifestSha256: sha256(JSON.stringify(alreadyScopedManifest)),
      }
    )
    assert.match(
      alreadyScopedPlan.errors.join("\n"),
      /must have exactly one Journey-only placement/
    )

    const explicitRevisionManifest = JSON.parse(JSON.stringify(placeManifest))
    explicitRevisionManifest.batchId = "media-usvi-explicit-reassociation"
    explicitRevisionManifest.r2Prefix =
      "images/usvi/waterlemon-cay/media-usvi-explicit-reassociation/"
    explicitRevisionManifest.assets[0].assetId = firstPlan.assetIds[0]
    explicitRevisionManifest.assets[0].revision = 2
    explicitRevisionManifest.assets[0].output.objectKey =
      `${explicitRevisionManifest.r2Prefix}${explicitRevisionManifest.assets[0].output.relativePath}`
    const explicitRevisionPlan = planMediaIngestion(
      explicitRevisionManifest,
      firstPlan.records,
      {
        ...reassociationContext,
        manifestSha256: sha256(JSON.stringify(explicitRevisionManifest)),
      }
    )
    assert.match(
      explicitRevisionPlan.errors.join("\n"),
      /accepts only a newly prepared manifest/
    )

    const reassociationWithoutReceipt = runNode(
      [
        "scripts/ingest-media.js",
        "--manifest",
        path.join(placePackageDirectory, "publication-manifest.json"),
        "--reassociate-existing",
        "--dry-run",
      ],
      1
    )
    assert.match(
      reassociationWithoutReceipt.stderr,
      /requires --verification-receipt/
    )

    runNode(prepareArgs, 1)
    runNode(
      [
        "scripts/optimize-images.js",
        "--package",
        "--source",
        sourceDirectory,
        "--output",
        path.join(testRoot, "wrong-place"),
        "--tag",
        "arches",
        "--journey",
        "usvi-st-john-2025",
        "--place",
        "arches-national-park",
        "--rights-owner",
        "roam-with-justin",
        "--rights-status",
        "owned",
      ],
      1
    )
    runNode(
      [
        "scripts/optimize-images.js",
        "--package",
        "--source",
        sourceDirectory,
        "--output",
        path.join(testRoot, "place-without-journey"),
        "--tag",
        "waterlemon cay",
        "--place",
        "waterlemon-cay",
        "--rights-owner",
        "roam-with-justin",
        "--rights-status",
        "owned",
      ],
      1
    )
    runNode(
      [
        "scripts/optimize-images.js",
        "--package",
        "--source",
        sourceDirectory,
        "--output",
        path.join(testRoot, "unknown"),
        "--tag",
        "definitely-not-a-journey",
        "--rights-owner",
        "roam-with-justin",
        "--rights-status",
        "owned",
      ],
      1
    )

    // Published Place/Visit media should become the default visual only when
    // no curated hero exists. A Journey cover must never leak across every
    // stop merely to fill an empty image slot.
    const { atlasPresentation } = await import(
      "../src/content/atlas/presentation.mjs"
    )
    const { getJourney: getCanonicalJourney, getJourneyVisit } = await import(
      "../src/content/journeys/index.mjs"
    )
    const { buildAtlasNodeView, buildTripLocationView } = await import(
      "../src/content/selectors/projections.mjs"
    )
    const { getVisitPublishedMedia } = await import(
      "../src/content/selectors/media.mjs"
    )
    const canonicalJourney = getCanonicalJourney("usvi-st-john-2025")
    const journeyCover = "/img/locations/usvi/usvi-full.jpg"
    const childPresentations = atlasPresentation.filter(
      item =>
        item.journeyId === canonicalJourney.id && item.id !== "st-john"
    )

    childPresentations.forEach(presentation => {
      const placeId = presentation.placeId
      const canonicalVisit = getJourneyVisit(canonicalJourney.id, placeId)
      const tripLocation = buildTripLocationView(
        canonicalJourney,
        canonicalVisit
      )
      const atlasNode = buildAtlasNodeView(presentation)
      const publishedImages = getVisitPublishedMedia(
        canonicalJourney.id,
        canonicalVisit.id
      ).filter(media => media.kind === "image")

      assert.notStrictEqual(tripLocation.image, journeyCover)
      assert.notStrictEqual(atlasNode.image, journeyCover)

      if (publishedImages.length) {
        assert.strictEqual(tripLocation.image, publishedImages[0].src)
        assert.strictEqual(atlasNode.image, publishedImages[0].src)
        assert.strictEqual(tripLocation.mediaPending, false)
        return
      }

      assert.strictEqual(tripLocation.image, "")
      assert.strictEqual(atlasNode.image, "")
      assert.strictEqual(tripLocation.mediaPending, true)
    })

    const rootNode = buildAtlasNodeView(
      atlasPresentation.find(item => item.id === "st-john")
    )
    assert.strictEqual(rootNode.image, journeyCover)

    console.log("Media ingestion tests passed.")
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
