const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const projectRoot = path.resolve(__dirname, "..")
const defaultImageDirectory = path.join(projectRoot, "public", "img")
const supportedExtensions = new Set([".jpg", ".jpeg", ".png"])
const maximumDimension = 2560
const jpegQuality = 82

const formatBytes = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MiB`

function usage() {
  return `Image optimizer

Usage:
  npm run images:optimize
  npm run images:optimize:dry
  npm run images:optimize:copies -- --source <directory> --tag <label> [--dry-run]

Direct script usage:
  node scripts/optimize-images.js [--dry-run]
  node scripts/optimize-images.js --source <directory> --tag <label> [--dry-run]

Modes:
  Default
    Recursively scans public/img and optimizes oversized JPEG/PNG files in
    place. Files at or below 2560px are skipped.

  Numbered copies (--source and --tag)
    Scans JPEG/PNG files directly inside <directory> (not subdirectories),
    sorts them by filename, and creates compressed copies in that directory:
    <label>-1.ext, <label>-2.ext, <label>-3.ext, and so on.

    Originals are preserved. Existing numbered outputs are never overwritten.

Options:
  --source <directory>  Directory containing images to copy and compress
  --tag <label>         Filename label for the numbered copies
  --copy                Explicitly select copy mode (optional with --source/--tag)
  --dry-run             Report changes without keeping any output files
  --help, --h, -h       Show this help

Examples:
  node scripts/optimize-images.js --dry-run
  node scripts/optimize-images.js --source "C:\\photos\\trip" --tag "utah"
  node scripts/optimize-images.js --source ./photos --tag utah --dry-run`
}

function readOptionValue(args, index, option) {
  const value = args[index + 1]

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${option} requires a value\n\n${usage()}`)
  }

  return value
}

function parseArguments(args) {
  const options = {
    copyMode: false,
    dryRun: false,
    help: false,
    source: null,
    tag: null,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === "--copy") {
      options.copyMode = true
    } else if (argument === "--dry-run") {
      options.dryRun = true
    } else if (
      argument === "--help" ||
      argument === "--h" ||
      argument === "-h"
    ) {
      options.help = true
    } else if (argument === "--source") {
      options.source = readOptionValue(args, index, "--source")
      index += 1
    } else if (argument.startsWith("--source=")) {
      options.source = argument.slice("--source=".length)
    } else if (argument === "--tag") {
      options.tag = readOptionValue(args, index, "--tag")
      index += 1
    } else if (argument.startsWith("--tag=")) {
      options.tag = argument.slice("--tag=".length)
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`)
    }
  }

  if (options.help) return options

  options.copyMode =
    options.copyMode || options.source !== null || options.tag !== null

  if (options.copyMode && (!options.source || !options.tag)) {
    throw new Error(`Copy mode requires both --source and --tag\n\n${usage()}`)
  }

  if (options.tag) validateTag(options.tag)

  return options
}

function validateTag(tag) {
  if (tag.trim() !== tag || tag.length === 0) {
    throw new Error("--tag cannot be empty or start/end with whitespace")
  }

  const hasControlCharacter = [...tag].some(
    character => character.charCodeAt(0) <= 31
  )

  if (/[<>:"/\\|?*]/.test(tag) || hasControlCharacter || /[. ]$/.test(tag)) {
    throw new Error(
      '--tag must be a filename-safe label without < > : " / \\ | ? * or control characters'
    )
  }
}

async function removeIfPresent(file) {
  try {
    await fs.promises.unlink(file)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}

async function findImages(directory, recursive) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })
  const images = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (recursive && entry.isDirectory()) {
      images.push(...(await findImages(entryPath, true)))
    } else if (
      !entry.isDirectory() &&
      supportedExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      images.push(entryPath)
    }
  }

  return images
}

async function requireDirectory(directory) {
  let stats

  try {
    stats = await fs.promises.stat(directory)
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Source directory does not exist: ${directory}`)
    }

    throw error
  }

  if (!stats.isDirectory()) {
    throw new Error(`Source path is not a directory: ${directory}`)
  }
}

function compressedPipeline(input, extension) {
  let pipeline = sharp(input)
    .autoOrient()
    .resize({
      width: maximumDimension,
      height: maximumDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")

  if (extension === ".jpg" || extension === ".jpeg") {
    pipeline = pipeline.jpeg({
      quality: jpegQuality,
      mozjpeg: true,
      progressive: true,
    })
  } else {
    pipeline = pipeline.png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
  }

  return pipeline
}

async function replaceFile(source, replacement) {
  const backup = `${source}.optimize-backup-${process.pid}-${Date.now()}`

  await fs.promises.rename(source, backup)

  try {
    await fs.promises.rename(replacement, source)
  } catch (error) {
    await fs.promises.rename(backup, source)
    throw error
  }

  await fs.promises.unlink(backup)
}

async function optimizeImageInPlace(file, dryRun) {
  const extension = path.extname(file).toLowerCase()
  const original = await fs.promises.stat(file)
  const input = await fs.promises.readFile(file)
  const metadata = await sharp(input).metadata()
  const largestDimension = Math.max(metadata.width || 0, metadata.height || 0)
  const relativePath = path.relative(projectRoot, file)

  if (largestDimension <= maximumDimension) {
    return { status: "within-limit", originalBytes: original.size }
  }

  const temporaryFile = `${file}.optimize-${process.pid}-${Date.now()}`

  try {
    const output = await compressedPipeline(input, extension).toFile(
      temporaryFile
    )

    if (output.size >= original.size) {
      console.log(
        `SKIP ${relativePath}: output would not be smaller (${formatBytes(original.size)})`
      )
      return { status: "not-smaller", originalBytes: original.size }
    }

    const savedBytes = original.size - output.size
    const reduction = ((savedBytes / original.size) * 100).toFixed(1)
    const action = dryRun ? "WOULD OPTIMIZE" : "OPTIMIZED"

    if (!dryRun) {
      await replaceFile(file, temporaryFile)
    }

    console.log(
      `${action} ${relativePath}: ${formatBytes(original.size)} -> ${formatBytes(output.size)} (${reduction}% smaller, ${output.width}x${output.height})`
    )

    return {
      status: dryRun ? "would-optimize" : "optimized",
      originalBytes: original.size,
      outputBytes: output.size,
      savedBytes,
    }
  } finally {
    await removeIfPresent(temporaryFile)
  }
}

function numberedTargets(images, sourceDirectory, tag) {
  return images.map((file, index) => ({
    source: file,
    target: path.join(
      sourceDirectory,
      `${tag}-${index + 1}${path.extname(file).toLowerCase()}`
    ),
  }))
}

async function requireAvailableTargets(items) {
  const collisions = []

  for (const item of items) {
    try {
      await fs.promises.access(item.target)
      collisions.push(item.target)
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
  }

  if (collisions.length > 0) {
    const names = collisions.map(file => path.basename(file)).join(", ")
    throw new Error(
      `Refusing to overwrite existing output file(s): ${names}. Choose another --tag or move the existing files.`
    )
  }
}

async function createCompressedCopy(source, target, dryRun) {
  const extension = path.extname(source).toLowerCase()
  const original = await fs.promises.stat(source)
  const input = await fs.promises.readFile(source)
  const temporaryFile = `${target}.optimize-${process.pid}-${Date.now()}`
  const sourceName = path.basename(source)
  const targetName = path.basename(target)

  try {
    const output = await compressedPipeline(input, extension).toFile(
      temporaryFile
    )
    const isSmaller = output.size < original.size
    const outputBytes = isSmaller ? output.size : original.size
    const savedBytes = original.size - outputBytes
    const reduction = original.size
      ? ((savedBytes / original.size) * 100).toFixed(1)
      : "0.0"

    if (!dryRun) {
      if (!isSmaller) {
        await removeIfPresent(temporaryFile)
        await fs.promises.copyFile(source, temporaryFile)
      }

      await fs.promises.rename(temporaryFile, target)
    }

    const action = dryRun ? "WOULD CREATE" : "CREATED"
    const result = isSmaller
      ? `${formatBytes(original.size)} -> ${formatBytes(outputBytes)} (${reduction}% smaller, ${output.width}x${output.height})`
      : `${formatBytes(original.size)} (compressed version was not smaller; copied original bytes)`

    console.log(`${action} ${targetName} from ${sourceName}: ${result}`)

    return {
      status: isSmaller ? "compressed" : "copied-original",
      originalBytes: original.size,
      outputBytes,
      savedBytes,
    }
  } finally {
    await removeIfPresent(temporaryFile)
  }
}

function createSummary(scanned) {
  return {
    scanned,
    withinLimit: 0,
    notSmaller: 0,
    optimized: 0,
    failed: 0,
    savedBytes: 0,
  }
}

async function runInPlaceMode(options) {
  await requireDirectory(defaultImageDirectory)

  const images = (await findImages(defaultImageDirectory, true)).sort(
    (left, right) => left.localeCompare(right)
  )
  const summary = createSummary(images.length)

  console.log(
    `${options.dryRun ? "Dry run: " : ""}checking ${images.length} JPEG/PNG images in public/img (maximum dimension ${maximumDimension}px)`
  )

  for (const file of images) {
    try {
      const result = await optimizeImageInPlace(file, options.dryRun)

      if (result.status === "within-limit") summary.withinLimit += 1
      if (result.status === "not-smaller") summary.notSmaller += 1
      if (result.status === "optimized" || result.status === "would-optimize") {
        summary.optimized += 1
        summary.savedBytes += result.savedBytes
      }
    } catch (error) {
      summary.failed += 1
      console.error(`${path.relative(process.cwd(), file)}: ${error.message}`)
    }
  }

  console.log("")
  console.log(`Scanned: ${summary.scanned}`)
  console.log(
    `${options.dryRun ? "Would optimize" : "Optimized"}: ${summary.optimized}`
  )
  console.log(`Already within limit: ${summary.withinLimit}`)
  console.log(`Not smaller: ${summary.notSmaller}`)
  console.log(`Failed: ${summary.failed}`)
  console.log(
    `${options.dryRun ? "Potential savings" : "Saved"}: ${formatBytes(summary.savedBytes)}`
  )

  if (summary.failed > 0) process.exitCode = 1
}

async function runCopyMode(options) {
  const sourceDirectory = path.resolve(process.cwd(), options.source)
  await requireDirectory(sourceDirectory)

  const images = (await findImages(sourceDirectory, false)).sort(
    (left, right) => left.localeCompare(right)
  )
  const items = numberedTargets(images, sourceDirectory, options.tag)
  const summary = {
    scanned: images.length,
    compressed: 0,
    copiedOriginal: 0,
    failed: 0,
    savedBytes: 0,
  }

  await requireAvailableTargets(items)

  console.log(
    `${options.dryRun ? "Dry run: " : ""}creating numbered copies of ${images.length} JPEG/PNG images in ${sourceDirectory} with tag "${options.tag}"`
  )

  for (const item of items) {
    try {
      const result = await createCompressedCopy(
        item.source,
        item.target,
        options.dryRun
      )

      if (result.status === "compressed") summary.compressed += 1
      if (result.status === "copied-original") summary.copiedOriginal += 1
      summary.savedBytes += result.savedBytes
    } catch (error) {
      summary.failed += 1
      console.error(`${path.basename(item.source)}: ${error.message}`)
    }
  }

  console.log("")
  console.log(`Scanned: ${summary.scanned}`)
  console.log(
    `${options.dryRun ? "Would create" : "Created"}: ${summary.compressed + summary.copiedOriginal}`
  )
  console.log(`Compressed: ${summary.compressed}`)
  console.log(`Copied without recompression: ${summary.copiedOriginal}`)
  console.log(`Failed: ${summary.failed}`)
  console.log(
    `${options.dryRun ? "Potential savings" : "Saved in copies"}: ${formatBytes(summary.savedBytes)}`
  )

  if (summary.failed > 0) process.exitCode = 1
}

async function main() {
  const options = parseArguments(process.argv.slice(2))

  if (options.help) {
    console.log(usage())
    return
  }

  if (options.copyMode) {
    await runCopyMode(options)
  } else {
    await runInPlaceMode(options)
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
