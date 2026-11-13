const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const imageDirectory = path.resolve(__dirname, "..", "public", "img")
const supportedExtensions = new Set([".jpg", ".jpeg", ".png"])
const maximumDimension = 2560
const jpegQuality = 82
const dryRun = process.argv.includes("--dry-run")

const unknownArguments = process.argv
  .slice(2)
  .filter(argument => argument !== "--dry-run")

if (unknownArguments.length > 0) {
  throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}`)
}

const formatBytes = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MiB`

async function removeIfPresent(file) {
  try {
    await fs.promises.unlink(file)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}

async function findImages(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })
  const images = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      images.push(...(await findImages(entryPath)))
    } else if (
      supportedExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      images.push(entryPath)
    }
  }

  return images
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

async function optimizeImage(file) {
  const extension = path.extname(file).toLowerCase()
  const original = await fs.promises.stat(file)
  const input = await fs.promises.readFile(file)
  const metadata = await sharp(input).metadata()
  const largestDimension = Math.max(metadata.width || 0, metadata.height || 0)
  const relativePath = path.relative(path.resolve(__dirname, ".."), file)

  if (largestDimension <= maximumDimension) {
    return { status: "within-limit", originalBytes: original.size }
  }

  const temporaryFile = `${file}.optimize-${process.pid}-${Date.now()}`

  try {
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

    const output = await pipeline.toFile(temporaryFile)

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

async function main() {
  const images = (await findImages(imageDirectory)).sort((left, right) =>
    left.localeCompare(right)
  )
  const summary = {
    scanned: images.length,
    withinLimit: 0,
    notSmaller: 0,
    optimized: 0,
    failed: 0,
    savedBytes: 0,
  }

  console.log(
    `${dryRun ? "Dry run: " : ""}checking ${images.length} JPEG/PNG images in public/img (maximum dimension ${maximumDimension}px)`
  )

  for (const file of images) {
    try {
      const result = await optimizeImage(file)

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
    `${dryRun ? "Would optimize" : "Optimized"}: ${summary.optimized}`
  )
  console.log(`Already within limit: ${summary.withinLimit}`)
  console.log(`Not smaller: ${summary.notSmaller}`)
  console.log(`Failed: ${summary.failed}`)
  console.log(
    `${dryRun ? "Potential savings" : "Saved"}: ${formatBytes(summary.savedBytes)}`
  )

  if (summary.failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
