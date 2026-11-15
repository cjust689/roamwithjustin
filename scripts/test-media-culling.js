const assert = require("assert")
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { replaceFileAtomically } = require("./lib/media-culling.js")

const projectRoot = path.resolve(__dirname, "..")
const testRoot = path.join(projectRoot, ".tmp-media-culling-test")
const sourceRecordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "media",
  "generated",
  "records.json"
)
const testRecordsFile = path.join(testRoot, "records.json")

function runCull(args, expectedStatus = 0) {
  const result = spawnSync(
    process.execPath,
    ["scripts/cull-media.js", ...args],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        MEDIA_CULL_RECORDS_FILE: testRecordsFile,
      },
    }
  )
  assert.strictEqual(
    result.status,
    expectedStatus,
    `${args.join(" ")} returned ${result.status}\n${result.stdout}\n${result.stderr}`
  )
  return result
}

async function main() {
  const resolvedRoot = path.resolve(testRoot)
  if (!resolvedRoot.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Unsafe test directory: ${resolvedRoot}`)
  }

  fs.rmSync(testRoot, { recursive: true, force: true })
  fs.mkdirSync(testRoot, { recursive: true })

  try {
    const sourceContents = fs.readFileSync(sourceRecordsFile, "utf8")
    const sourceRecords = JSON.parse(sourceContents)
    const publishedPlacement = sourceRecords.placements.find(
      placement => placement.visibility === "published"
    )
    assert.ok(publishedPlacement, "test registry requires a published placement")
    const assetId = publishedPlacement.assetId
    const matchingPlacementIds = sourceRecords.placements
      .filter(placement => placement.assetId === assetId)
      .map(placement => placement.id)

    fs.writeFileSync(testRecordsFile, sourceContents)
    const dryRun = runCull(["--asset-id", assetId, "--dry-run"])
    assert.match(dryRun.stdout, /Dry run complete/)
    assert.strictEqual(fs.readFileSync(testRecordsFile, "utf8"), sourceContents)

    const applied = runCull(["--asset-id", assetId, "--apply"])
    assert.match(applied.stdout, /Culled \d+ placement\(s\)/)
    const appliedRecords = JSON.parse(fs.readFileSync(testRecordsFile, "utf8"))
    appliedRecords.placements
      .filter(placement => matchingPlacementIds.includes(placement.id))
      .forEach(placement => assert.strictEqual(placement.visibility, "draft"))
    assert.deepStrictEqual(appliedRecords.assets, sourceRecords.assets)
    assert.deepStrictEqual(appliedRecords.batches, sourceRecords.batches)

    const repeated = runCull([`--asset-id=${assetId}`, "--apply"])
    assert.match(repeated.stdout, /every placement is already draft/)

    const unknown = runCull(
      ["--asset-id", "image-not-in-generated-registry", "--dry-run"],
      1
    )
    assert.match(unknown.stderr, /Unknown generated Media asset/)

    const missingMode = runCull(["--asset-id", assetId], 1)
    assert.match(missingMode.stderr, /Choose exactly one/)

    const rollbackFile = path.join(testRoot, "rollback.json")
    fs.writeFileSync(rollbackFile, '{"state":"original"}\n')
    await assert.rejects(
      replaceFileAtomically(
        rollbackFile,
        '{"state":"changed"}\n',
        async () => {
          throw new Error("forced validation failure")
        }
      ),
      /rolled back/
    )
    assert.strictEqual(
      fs.readFileSync(rollbackFile, "utf8"),
      '{"state":"original"}\n'
    )

    console.log("Media culling tests passed.")
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
