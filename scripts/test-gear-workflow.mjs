import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {
  loadWorkflow,
  parseArguments,
  runGearWorkflow,
} from "./gear-workflow.mjs"

const temporaryDirectory = await fs.promises.mkdtemp(
  path.join(os.tmpdir(), "rwj-gear-workflow-")
)
try {
  const recordSource = path.join(temporaryDirectory, "product.json")
  const imageSource = path.join(temporaryDirectory, "product.jpg")
  const workflowSource = path.join(temporaryDirectory, "workflow.json")
  const recordsFile = path.join(temporaryDirectory, "records.json")
  await fs.promises.writeFile(
    recordSource,
    JSON.stringify({
      schemaVersion: 1,
      journeyId: "test-journey",
      items: [
        {
          gearId: "creator-camera-bag",
          name: "Creator Camera Bag",
          category: "bag",
          usageType: "used",
        },
      ],
    })
  )
  await fs.promises.writeFile(imageSource, "fixture")
  await fs.promises.writeFile(
    recordsFile,
    '{"schemaVersion":1,"items":[],"usage":[]}\n'
  )
  await fs.promises.writeFile(
    workflowSource,
    JSON.stringify({
      schemaVersion: 1,
      gearId: "creator-camera-bag",
      journeyId: "test-journey",
      recordSource: "./product.json",
      image: {
        source: "./product.jpg",
        output: "./ready",
        rightsOwner: "roam-with-justin",
        rightsStatus: "owned",
        rightsReviewed: true,
        alt: "Creator camera bag on a table",
      },
    })
  )

  assert.deepEqual(parseArguments(["--source", workflowSource, "--dry-run"]), {
    apply: false,
    approveCard: false,
    build: false,
    dryRun: true,
    help: false,
    replaceImage: false,
    source: workflowSource,
    through: "prepare",
  })
  assert.throws(
    () =>
      parseArguments([
        "--source",
        workflowSource,
        "--apply",
        "--through",
        "publish",
      ]),
    /--approve-card/
  )

  const workflow = await loadWorkflow(workflowSource)
  assert.equal(workflow.gearId, "creator-camera-bag")
  assert.equal(workflow.recordSource, recordSource)
  assert.equal(workflow.image.source, imageSource)

  const calls = []
  const packageDirectory = path.join(temporaryDirectory, "ready", "package")
  const dependencies = {
    recordsFile,
    runCommand: async (_command, args) => {
      calls.push(["record", args.includes("--dry-run") ? "preview" : "apply"])
      return { passed: true }
    },
    prepareImage: async options => {
      calls.push(["image", options.dryRun ? "preview" : "apply"])
      return {
        packageDirectory,
        status: options.dryRun ? "dry-run" : "created",
      }
    },
    log: () => {},
  }
  const preview = await runGearWorkflow(
    parseArguments(["--source", workflowSource, "--dry-run"]),
    dependencies
  )
  assert.equal(preview.stage, "preview")
  assert.deepEqual(calls, [
    ["record", "preview"],
    ["image", "preview"],
  ])

  calls.length = 0
  const prepared = await runGearWorkflow(
    parseArguments([
      "--source",
      workflowSource,
      "--apply",
      "--through",
      "prepare",
    ]),
    dependencies
  )
  assert.equal(prepared.stage, "prepare")
  assert.deepEqual(calls, [
    ["record", "preview"],
    ["image", "preview"],
    ["record", "apply"],
    ["image", "apply"],
  ])

  await assert.rejects(
    runGearWorkflow(
      parseArguments([
        "--source",
        workflowSource,
        "--apply",
        "--through",
        "publish",
        "--approve-card",
      ]),
      dependencies
    ),
    /already prepared package/
  )
  assert.equal(
    await fs.promises.readFile(recordsFile, "utf8"),
    '{"schemaVersion":1,"items":[],"usage":[]}\n'
  )

  await fs.promises.mkdir(packageDirectory, { recursive: true })
  await fs.promises.writeFile(
    path.join(packageDirectory, "gear-image-manifest.json"),
    "{}\n"
  )
  calls.length = 0
  const publishDependencies = {
    ...dependencies,
    runCommand: async (_command, args) => {
      const stage = args.includes("--dry-run") ? "preview" : "apply"
      calls.push(["record", stage])
      if (stage === "apply") {
        await fs.promises.writeFile(recordsFile, '{"changed":true}\n')
      }
      return { passed: true }
    },
    uploadPackage: async () => {
      calls.push(["upload", "apply"])
      return { receipt: true }
    },
    publishImage: async () => {
      calls.push(["publish", "apply"])
      return { changed: true }
    },
  }
  const published = await runGearWorkflow(
    parseArguments([
      "--source",
      workflowSource,
      "--apply",
      "--through",
      "publish",
      "--approve-card",
    ]),
    publishDependencies
  )
  assert.equal(published.stage, "publish")
  assert.deepEqual(calls, [
    ["record", "preview"],
    ["image", "preview"],
    ["record", "apply"],
    ["image", "apply"],
    ["upload", "apply"],
    ["publish", "apply"],
  ])

  const rollbackBaseline = '{"before":"publish"}\n'
  await fs.promises.writeFile(recordsFile, rollbackBaseline)
  await assert.rejects(
    runGearWorkflow(
      parseArguments([
        "--source",
        workflowSource,
        "--apply",
        "--through",
        "publish",
        "--approve-card",
      ]),
      {
        ...publishDependencies,
        publishImage: async () => {
          throw new Error("publication fixture failed")
        },
      }
    ),
    /canonical Gear records were restored.*Uploaded objects are immutable/
  )
  assert.equal(
    await fs.promises.readFile(recordsFile, "utf8"),
    rollbackBaseline
  )
} finally {
  await fs.promises.rm(temporaryDirectory, { recursive: true, force: true })
}

console.log("Gear workflow tests passed.")
