import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"

import {
  planGearImagePublication,
  serializeGeneratedRecords,
  sha256,
} from "./lib/gear-image-publication.mjs"

const require = createRequire(import.meta.url)
const { loadPreparedPackage, readVerifiedAsset } = require("./upload-media.js")
const { validateGearRecords } = require("./lib/gear-ingestion.js")

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const defaultGearRecordsFile = path.join(
  projectRoot,
  "src",
  "content",
  "gear",
  "generated",
  "records.json"
)
const defaultGearImagesFile = path.join(
  projectRoot,
  "src",
  "content",
  "gear",
  "generated",
  "images.json"
)

export function usage() {
  return `Gear image publication

Usage:
  npm run gear:publish-image -- --gear-id <id> --manifest <file> --receipt <file> --dry-run [--replace-image]
  npm run gear:publish-image -- --gear-id <id> --manifest <file> --receipt <file> --apply --approve-card [--replace-image] [--build]

Options:
  --gear-id <id>     Existing canonical Gear ID and explicit target guard
  --manifest <file>  Applied gear-image-manifest.json from gear:prepare
  --receipt <file>   gear-r2-verification.json from gear:upload
  --dry-run          Verify bytes and receipt, then print the canonical plan
  --apply            Update the Gear image shard and exactly one Gear item
  --approve-card     Required with --apply after reviewing the image and card
  --replace-image    Explicitly approve replacing an existing Gear image
  --build            Run the full production build before committing files
  --help, --h, -h    Show this help

The command never uploads, creates a Gear product, changes usage or merchant
links, deletes old R2 objects, commits, pushes, or deploys. A failed content
validation or optional build restores both generated files.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(option + " requires a value\n\n" + usage())
  }
  return value
}

export function parseArguments(args) {
  const options = {
    apply: false,
    approveCard: false,
    build: false,
    dryRun: false,
    gearId: null,
    help: false,
    manifest: null,
    receipt: null,
    replaceImage: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") options.apply = true
    else if (argument === "--approve-card") options.approveCard = true
    else if (argument === "--build") options.build = true
    else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--replace-image") options.replaceImage = true
    else if (["--help", "--h", "-h"].includes(argument)) options.help = true
    else if (["--gear-id", "--manifest", "--receipt"].includes(argument)) {
      const field = {
        "--gear-id": "gearId",
        "--manifest": "manifest",
        "--receipt": "receipt",
      }[argument]
      options[field] = readValue(args, index, argument)
      index += 1
    } else {
      const match = argument.match(/^--(gear-id|manifest|receipt)=(.+)$/)
      if (!match) throw new Error("Unknown argument: " + argument + "\n\n" + usage())
      const field = {
        "gear-id": "gearId",
        manifest: "manifest",
        receipt: "receipt",
      }[match[1]]
      options[field] = match[2]
    }
  }
  if (options.help) return options
  if (options.apply === options.dryRun) {
    throw new Error("Choose exactly one of --dry-run or --apply")
  }
  if (!options.gearId || !options.manifest || !options.receipt) {
    throw new Error("--gear-id, --manifest, and --receipt are required\n\n" + usage())
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.gearId)) {
    throw new Error("--gear-id must be lowercase ASCII kebab-case")
  }
  if (options.apply && !options.approveCard) {
    throw new Error("--apply requires --approve-card after reviewing the card")
  }
  if (options.build && !options.apply) {
    throw new Error("--build requires --apply")
  }
  return options
}

function readJson(file, label) {
  let contents
  try {
    contents = fs.readFileSync(file, "utf8")
  } catch (error) {
    throw new Error(label + " cannot be read at " + file + ": " + error.message)
  }
  try {
    return {
      contents,
      value: JSON.parse(contents.replace(/^\uFEFF/, "")),
    }
  } catch (error) {
    throw new Error(label + " is not valid JSON: " + error.message)
  }
}

async function importContent(relativePath) {
  return import(pathToFileURL(path.join(projectRoot, relativePath)).href)
}

async function loadContext(imageRecords) {
  const [journeyModule, mediaModule, partnerModule] = await Promise.all([
    importContent("src/content/journeys/index.mjs"),
    importContent("src/content/media/index.mjs"),
    importContent("src/content/partners/index.mjs"),
  ])
  const gearImageIds = new Set(imageRecords.assets.map(asset => asset.id))
  const otherMedia = mediaModule.mediaRecords.filter(
    asset => !gearImageIds.has(asset.id)
  )
  return {
    approvedGearTrackingRulePartnerIds: [],
    journeys: journeyModule.journeyRecords,
    otherMedia,
    otherMediaIds: otherMedia.map(asset => asset.id),
    otherObjectKeys: otherMedia
      .map(asset => asset.source?.objectKey)
      .filter(Boolean),
    partners: partnerModule.partnerRecords,
  }
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  return { label, passed: result.status === 0 }
}

async function createFileTransaction(entries) {
  const stamp = process.pid + "-" + Date.now()
  const staged = entries.map(entry => ({
    ...entry,
    backup: entry.file + ".backup-" + stamp,
    temporary: entry.file + ".incoming-" + stamp,
  }))
  try {
    for (const entry of staged) {
      await fs.promises.writeFile(entry.temporary, entry.contents, {
        encoding: "utf8",
        flag: "wx",
      })
    }
    for (const entry of staged) {
      await fs.promises.rename(entry.file, entry.backup)
      await fs.promises.rename(entry.temporary, entry.file)
    }
  } catch (error) {
    for (const entry of [...staged].reverse()) {
      const hasBackup = await fs.promises.access(entry.backup).then(
        () => true,
        () => false
      )
      if (hasBackup) {
        await fs.promises.unlink(entry.file).catch(unlinkError => {
          if (unlinkError.code !== "ENOENT") throw unlinkError
        })
        await fs.promises.rename(entry.backup, entry.file)
      }
      await fs.promises.unlink(entry.temporary).catch(unlinkError => {
        if (unlinkError.code !== "ENOENT") throw unlinkError
      })
    }
    throw error
  }

  return {
    async commit() {
      for (const entry of staged) {
        await fs.promises.unlink(entry.backup).catch(() => {})
      }
    },
    async rollback() {
      for (const entry of [...staged].reverse()) {
        await fs.promises.unlink(entry.file).catch(unlinkError => {
          if (unlinkError.code !== "ENOENT") throw unlinkError
        })
        await fs.promises.rename(entry.backup, entry.file)
      }
    },
  }
}

export async function publishGearImage(options, dependencies = {}) {
  if (Boolean(options.apply) === Boolean(options.dryRun)) {
    throw new Error("Choose exactly one of dry run or apply")
  }
  if (options.apply && !options.approveCard) {
    throw new Error("Applying a Gear image requires explicit card approval")
  }
  const gearRecordsFile = dependencies.gearRecordsFile || defaultGearRecordsFile
  const gearImagesFile = dependencies.gearImagesFile || defaultGearImagesFile
  const manifestFile = path.resolve(process.cwd(), options.manifest)
  const receiptFile = path.resolve(process.cwd(), options.receipt)
  const mediaPackage = await loadPreparedPackage(manifestFile, { gear: true })
  for (const prepared of mediaPackage.preparedAssets) {
    await readVerifiedAsset(prepared)
  }
  const receiptInput = readJson(receiptFile, "Gear image receipt")
  const gearInput = readJson(gearRecordsFile, "Canonical Gear records")
  const imagesInput = readJson(gearImagesFile, "Generated Gear images")
  const manifest = mediaPackage.manifest
  if (manifest.gearId !== options.gearId) {
    throw new Error(
      `--gear-id "${options.gearId}" does not match manifest Gear "${manifest.gearId}"`
    )
  }
  const context =
    dependencies.context || (await loadContext(imagesInput.value))
  const plan = planGearImagePublication({
    context,
    gearRecords: gearInput.value,
    imageRecords: imagesInput.value,
    manifest,
    manifestSha256: mediaPackage.manifestSha256,
    receipt: receiptInput.value,
    receiptSha256: sha256(receiptInput.contents),
    replaceImage: options.replaceImage,
  })

  const nextMedia = [
    ...(context.otherMedia || []),
    ...plan.imageRecords.assets,
  ]
  const gearValidation = validateGearRecords(plan.gearRecords, {
    approvedGearTrackingRulePartnerIds:
      context.approvedGearTrackingRulePartnerIds || [],
    journeys: context.journeys || [],
    media: nextMedia,
    partners: context.partners || [],
  })
  plan.errors.push(...gearValidation.errors)
  if (plan.errors.length) {
    throw new Error("Gear image publication rejected:\n- " + plan.errors.join("\n- "))
  }
  if (options.dryRun || !plan.changed) return { ...plan, dryRun: options.dryRun }

  const transaction = await createFileTransaction([
    {
      file: gearRecordsFile,
      contents: serializeGeneratedRecords(plan.gearRecords),
    },
    {
      file: gearImagesFile,
      contents: serializeGeneratedRecords(plan.imageRecords),
    },
  ])
  const runCommandImpl = dependencies.runCommand || runCommand
  try {
    const validation = await runCommandImpl(
      process.execPath,
      [path.join(projectRoot, "scripts", "validate-content.js")],
      "content validation"
    )
    if (!validation.passed) throw new Error("Content validation failed")
    if (options.build) {
      const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
      const build = await runCommandImpl(
        npmCommand,
        ["run", "build"],
        "production build"
      )
      if (!build.passed) throw new Error("Production build failed")
    }
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw new Error(error.message + "; generated Gear files were restored")
  }
  return { ...plan, dryRun: false }
}

function printPlan(result, options) {
  console.log("Gear: " + options.gearId)
  console.log("Asset: " + result.assetId)
  console.log("Revision: " + result.revision)
  console.log("Action: " + (result.changed ? "update canonical image" : "unchanged"))
  result.imageRecords.assets
    .find(asset => asset.id === result.assetId)
    ?.renditions.forEach(rendition => {
      console.log(
        rendition.role +
          ": https://media.roamwithjustin.com/" +
          rendition.objectKey
      )
    })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  const result = await publishGearImage(options)
  printPlan(result, options)
  if (options.dryRun) {
    console.log("Dry run complete; no canonical files were written.")
  } else if (!result.changed) {
    console.log("Canonical Gear image publication is already current.")
  } else {
    console.log("Gear image publication complete.")
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
