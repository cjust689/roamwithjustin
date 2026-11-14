const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const crypto = require("crypto")
const { pathToFileURL } = require("url")

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
  npm run images:optimize:copies -- --source <directory> --tag <label> [--use-suggested-tag] [--dry-run]
  npm run media:prepare -- --source <directory> --output <directory> --tag <label> --rights-owner <owner> --rights-status <status>

Direct script usage:
  node scripts/optimize-images.js [--dry-run]
  node scripts/optimize-images.js --source <directory> --tag <label> [--use-suggested-tag] [--dry-run]
  node scripts/optimize-images.js --package --source <directory> --output <directory> --tag <label> --rights-owner <owner> --rights-status <status>

Modes:
  Default
    Recursively scans public/img and optimizes oversized JPEG/PNG files in
    place. Files at or below 2560px are skipped.

  Numbered copies (--source and --tag)
    Scans JPEG/PNG files directly inside <directory> (not subdirectories),
    sorts them by filename, and creates compressed copies in that directory:
    <label>-1.ext, <label>-2.ext, <label>-3.ext, and so on.

    Originals are preserved. Existing numbered outputs are never overwritten.
    The label is compared with canonical Journeys and visited Places. A close
    match prints a confidence-ranked filename suggestion before processing.

  Journey publication package (--package)
    Resolves --tag (or --journey) to exactly one canonical Journey, writes
    optimized numbered files to <output>/<journey-slug>/, and creates a
    publication-manifest.json beside them. The package can be uploaded under
    the manifest's R2 prefix and then applied with npm run media:ingest.

    This mode requires explicit rights metadata. It never uploads files,
    publishes content, overwrites an existing package, or changes curated
    Journey hero/gallery fields.

Options:
  --source <directory>  Directory containing images to copy and compress
  --tag <label>         Filename label for the numbered copies
  --package             Build a Journey publication package and manifest
  --output <directory>  Parent directory for a Journey package
  --journey <id>        Explicit canonical Journey ID (optional tag override)
  --r2-prefix <prefix>  R2 parent prefix (default: images)
  --rights-owner <id>   Explicit rights owner stored in the manifest
  --rights-status <id>  Explicit rights status, such as owned or licensed
  --copy                Explicitly select copy mode (optional with --source/--tag)
  --use-suggested-tag   Use a confident, unambiguous canonical tag suggestion
  --dry-run             Report changes without keeping any output files
  --help, --h, -h       Show this help

Examples:
  node scripts/optimize-images.js --dry-run
  node scripts/optimize-images.js --source "C:\\photos\\trip" --tag "utah"
  node scripts/optimize-images.js --source ./photos --tag "trunk bay" --use-suggested-tag
  node scripts/optimize-images.js --source ./photos --tag utah --dry-run
  node scripts/optimize-images.js --package --source ./exports --output ./ready --tag usvi --rights-owner roam-with-justin --rights-status owned`
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
    journey: null,
    output: null,
    packageMode: false,
    r2Prefix: "images",
    rightsOwner: null,
    rightsStatus: null,
    source: null,
    tag: null,
    useSuggestedTag: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === "--copy") {
      options.copyMode = true
    } else if (argument === "--package") {
      options.packageMode = true
    } else if (argument === "--use-suggested-tag") {
      options.useSuggestedTag = true
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
    } else if (argument === "--output") {
      options.output = readOptionValue(args, index, "--output")
      index += 1
    } else if (argument.startsWith("--output=")) {
      options.output = argument.slice("--output=".length)
    } else if (argument === "--journey") {
      options.journey = readOptionValue(args, index, "--journey")
      index += 1
    } else if (argument.startsWith("--journey=")) {
      options.journey = argument.slice("--journey=".length)
    } else if (argument === "--r2-prefix") {
      options.r2Prefix = readOptionValue(args, index, "--r2-prefix")
      index += 1
    } else if (argument.startsWith("--r2-prefix=")) {
      options.r2Prefix = argument.slice("--r2-prefix=".length)
    } else if (argument === "--rights-owner") {
      options.rightsOwner = readOptionValue(args, index, "--rights-owner")
      index += 1
    } else if (argument.startsWith("--rights-owner=")) {
      options.rightsOwner = argument.slice("--rights-owner=".length)
    } else if (argument === "--rights-status") {
      options.rightsStatus = readOptionValue(args, index, "--rights-status")
      index += 1
    } else if (argument.startsWith("--rights-status=")) {
      options.rightsStatus = argument.slice("--rights-status=".length)
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

  if (options.packageMode) {
    if (options.copyMode || options.useSuggestedTag) {
      throw new Error(
        `--package cannot be combined with --copy or --use-suggested-tag\n\n${usage()}`
      )
    }
    if (!options.source || !options.output || !options.tag) {
      throw new Error(
        `Package mode requires --source, --output, and --tag\n\n${usage()}`
      )
    }
    if (!options.rightsOwner || !options.rightsStatus) {
      throw new Error(
        `Package mode requires --rights-owner and --rights-status; rights are never inferred\n\n${usage()}`
      )
    }
    validateTag(options.tag)
    validateR2Prefix(options.r2Prefix)
    return options
  }

  options.copyMode =
    options.copyMode || options.source !== null || options.tag !== null

  if (
    options.output ||
    options.journey ||
    options.rightsOwner ||
    options.rightsStatus ||
    options.r2Prefix !== "images"
  ) {
    throw new Error(
      `--output, --journey, --r2-prefix, and rights options require --package\n\n${usage()}`
    )
  }

  if (options.copyMode && (!options.source || !options.tag)) {
    throw new Error(`Copy mode requires both --source and --tag\n\n${usage()}`)
  }

  if (options.useSuggestedTag && !options.copyMode) {
    throw new Error(
      `--use-suggested-tag requires copy mode with --source and --tag\n\n${usage()}`
    )
  }

  if (options.tag) validateTag(options.tag)

  return options
}

function validateR2Prefix(value) {
  const prefix = String(value || "").replace(/^\/+|\/+$/g, "")
  if (!prefix || prefix.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("--r2-prefix must be a safe relative object-key prefix")
  }
  if (/\\|[\u0000-\u001f]/.test(prefix)) {
    throw new Error("--r2-prefix cannot contain backslashes or control characters")
  }
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

function normalizeMatchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function levenshteinDistance(left, right) {
  if (!left.length) return right.length
  if (!right.length) return left.length

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      )
    }

    previous = current
  }

  return previous[right.length]
}

function scoreMatch(query, candidate) {
  const normalizedQuery = normalizeMatchText(query)
  const normalizedCandidate = normalizeMatchText(candidate)

  if (!normalizedQuery || !normalizedCandidate) return 0
  if (normalizedQuery === normalizedCandidate) return 1

  const maximumLength = Math.max(
    normalizedQuery.length,
    normalizedCandidate.length
  )
  const editSimilarity =
    1 -
    levenshteinDistance(normalizedQuery, normalizedCandidate) / maximumLength
  const queryTokens = new Set(normalizedQuery.split("-"))
  const candidateTokens = new Set(normalizedCandidate.split("-"))
  const sharedTokens = [...queryTokens].filter(token =>
    candidateTokens.has(token)
  ).length
  const queryCoverage = sharedTokens / queryTokens.size
  const candidateCoverage = sharedTokens / candidateTokens.size
  const prefixCoverage =
    normalizedCandidate.startsWith(normalizedQuery) ||
    normalizedQuery.startsWith(normalizedCandidate)
      ? Math.min(normalizedQuery.length, normalizedCandidate.length) /
        maximumLength
      : 0
  const tokenSimilarity =
    queryCoverage * 0.65 + candidateCoverage * 0.25 + prefixCoverage * 0.1

  return Math.max(editSimilarity, tokenSimilarity)
}

function uniqueNonEmpty(values) {
  return [
    ...new Set(values.map(value => String(value || "").trim()).filter(Boolean)),
  ]
}

function buildTagMatchCandidates(journeys, places, placeAliases) {
  const placeById = new Map(places.map(place => [place.id, place]))
  const aliasesByPlaceId = new Map()

  Object.entries(placeAliases).forEach(([alias, placeId]) => {
    const aliases = aliasesByPlaceId.get(placeId) || []
    aliases.push(alias)
    aliasesByPlaceId.set(placeId, aliases)
  })

  return journeys.flatMap(journey => {
    const visitedPlaceIds = new Set(journey.visits.map(visit => visit.placeId))
    const ancestorTerms = []

    journey.visits.forEach(visit => {
      let place = placeById.get(visit.placeId)

      while (place?.parentPlaceId) {
        place = placeById.get(place.parentPlaceId)

        if (place && !visitedPlaceIds.has(place.id)) {
          ancestorTerms.push(place.id, place.name)
        }
      }
    })

    const journeyCandidate = {
      key: `journey:${journey.id}`,
      type: "journey",
      journey,
      place: null,
      suggestedTag: journey.slug,
      terms: uniqueNonEmpty([
        journey.id,
        journey.id.replace(/-\d{4}$/, ""),
        journey.slug,
        journey.title,
        ...journey.title.split(","),
        ...ancestorTerms,
      ]),
    }
    const placeCandidates = []
    const seenPlaces = new Set()

    journey.visits.forEach(visit => {
      if (seenPlaces.has(visit.placeId)) return
      seenPlaces.add(visit.placeId)

      const place = placeById.get(visit.placeId)
      if (!place) return

      placeCandidates.push({
        key: `place:${journey.id}:${place.id}`,
        type: "place",
        journey,
        place,
        suggestedTag: `${journey.slug}-${place.id}`,
        terms: uniqueNonEmpty([
          place.id,
          place.name,
          `${journey.slug}-${place.id}`,
          `${journey.title} ${place.name}`,
          ...(aliasesByPlaceId.get(place.id) || []),
        ]),
      })
    })

    return [journeyCandidate, ...placeCandidates]
  })
}

function confidenceLevel(score) {
  if (score >= 0.9) return "high"
  if (score >= 0.75) return "medium"
  return "low"
}

function describeTagCandidate(candidate) {
  if (candidate.type === "journey") {
    return `Journey "${candidate.journey.title}" [${candidate.journey.id}]`
  }

  return `Place "${candidate.place.name}" [${candidate.place.id}] in Journey "${candidate.journey.title}"`
}

async function matchCanonicalTag(tag) {
  const contentRoot = path.join(projectRoot, "src", "content")
  const [journeyModule, placeModule, aliasModule] = await Promise.all([
    import(pathToFileURL(path.join(contentRoot, "journeys", "index.mjs")).href),
    import(pathToFileURL(path.join(contentRoot, "places", "index.mjs")).href),
    import(pathToFileURL(path.join(contentRoot, "places", "aliases.mjs")).href),
  ])
  const candidates = buildTagMatchCandidates(
    journeyModule.journeyRecords,
    placeModule.placeRecords,
    aliasModule.placeAliases
  )
    .map(candidate => ({
      ...candidate,
      score: Math.max(...candidate.terms.map(term => scoreMatch(tag, term))),
    }))
    .sort((left, right) => right.score - left.score)
  const best = candidates[0] || null
  const runnerUp = candidates[1] || null
  const ambiguous = Boolean(
    best &&
      runnerUp &&
      best.score >= 0.6 &&
      runnerUp.score >= 0.6 &&
      best.score - runnerUp.score < 0.08
  )
  const confident = Boolean(best && best.score >= 0.75 && !ambiguous)

  return {
    best,
    alternatives: candidates.slice(1, 3),
    ambiguous,
    confident,
  }
}

async function resolvePackageJourney(tag, journeyId) {
  const journeyModule = await import(
    pathToFileURL(
      path.join(projectRoot, "src", "content", "journeys", "index.mjs")
    ).href
  )

  if (journeyId) {
    const journey = journeyModule.getJourney(journeyId)
    if (!journey) {
      throw new Error(
        `Unknown canonical Journey "${journeyId}". Run npm run media:journeys to list valid IDs.`
      )
    }
    return { journey, score: 1, explicit: true }
  }

  const candidates = journeyModule.journeyRecords
    .map(journey => ({
      journey,
      score: Math.max(
        ...uniqueNonEmpty([
          journey.id,
          journey.id.replace(/-\d{4}$/, ""),
          journey.slug,
          journey.title,
          ...journey.title.split(","),
        ]).map(term => scoreMatch(tag, term))
      ),
    }))
    .sort((left, right) => right.score - left.score)
  const best = candidates[0]
  const runnerUp = candidates[1]
  const ambiguous = Boolean(
    best &&
      runnerUp &&
      best.score >= 0.6 &&
      runnerUp.score >= 0.6 &&
      best.score - runnerUp.score < 0.08
  )

  if (!best || best.score < 0.75 || ambiguous) {
    const suggestions = candidates
      .slice(0, 3)
      .filter(candidate => candidate.score >= 0.5)
      .map(
        candidate =>
          `${candidate.journey.id} (${Math.round(candidate.score * 100)}%)`
      )
      .join(", ")
    throw new Error(
      `Cannot confidently resolve --tag "${tag}" to one Journey.${
        suggestions ? ` Candidates: ${suggestions}.` : ""
      } Use a more specific tag or pass --journey <canonical-id>.`
    )
  }

  return { journey: best.journey, score: best.score, explicit: false }
}

function reportTagMatch(tag, match) {
  if (!match.best || match.best.score < 0.6) {
    console.log(
      `Tag match: no likely canonical Journey or visited Place found for "${tag}".`
    )
    return
  }

  if (match.ambiguous) {
    const candidates = [match.best, ...match.alternatives]
      .filter(candidate => candidate.score >= 0.6)
      .map(
        candidate =>
          `${describeTagCandidate(candidate)} (${Math.round(candidate.score * 100)}%)`
      )
      .join("; ")

    console.log(`Tag match: "${tag}" is ambiguous: ${candidates}`)
    console.log("Suggested filename label: none; use a more specific --tag.")
    return
  }

  const percentage = Math.round(match.best.score * 100)
  console.log(
    `Tag match: ${describeTagCandidate(match.best)} (${percentage}% ${confidenceLevel(match.best.score)} confidence).`
  )

  if (match.confident) {
    console.log(`Suggested filename label: ${match.best.suggestedTag}`)
  } else {
    console.log(
      `Possible filename label: ${match.best.suggestedTag}; use a more specific --tag before adopting it.`
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

function mimeTypeForExtension(extension) {
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg"
  if (extension === ".png") return "image/png"
  throw new Error(`Unsupported image extension: ${extension}`)
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

async function createPackageAsset(source, filename, index, context) {
  const extension = path.extname(source).toLowerCase()
  const input = await fs.promises.readFile(source)
  const { data, info } = await compressedPipeline(input, extension).toBuffer({
    resolveWithObject: true,
  })
  const checksum = sha256(data)
  const objectKey = `${context.r2Prefix}/${filename}`

  if (!context.dryRun) {
    await fs.promises.writeFile(path.join(context.stagingDirectory, filename), data, {
      flag: "wx",
    })
  }

  console.log(
    `${context.dryRun ? "WOULD PACKAGE" : "PACKAGED"} ${filename} from ${path.basename(source)}: ${formatBytes(data.length)}, ${info.width}x${info.height}`
  )

  return {
    provisionalId: `local-${context.journey.slug}-${String(index + 1).padStart(3, "0")}-${checksum.slice(0, 12)}`,
    assetId: null,
    source: {
      originalFilename: path.basename(source),
    },
    output: {
      relativePath: filename,
      objectKey,
      mimeType: mimeTypeForExtension(extension),
      width: info.width,
      height: info.height,
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
      journeyId: context.journey.id,
      visitId: null,
      placeId: null,
      experienceId: null,
    },
    placement: {
      role: "gallery",
      visibility: "published",
      sortOrder: index + 1,
    },
    rights: {
      owner: context.rightsOwner,
      status: context.rightsStatus,
    },
  }
}

async function pathExists(target) {
  try {
    await fs.promises.access(target)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

async function runPackageMode(options) {
  const sourceDirectory = path.resolve(process.cwd(), options.source)
  const outputDirectory = path.resolve(process.cwd(), options.output)
  await requireDirectory(sourceDirectory)

  const resolution = await resolvePackageJourney(options.tag, options.journey)
  const journey = resolution.journey
  const percentage = Math.round(resolution.score * 100)
  console.log(
    `Journey match: "${options.tag}" -> ${journey.title} [${journey.id}] (${resolution.explicit ? "explicit" : `${percentage}% confidence`}).`
  )

  const images = (await findImages(sourceDirectory, false)).sort((left, right) =>
    left.localeCompare(right)
  )
  if (!images.length) {
    throw new Error(`No JPEG/PNG images found directly inside ${sourceDirectory}`)
  }

  const packageDirectory = path.join(outputDirectory, journey.slug)
  if (await pathExists(packageDirectory)) {
    throw new Error(
      `Refusing to overwrite existing Journey package: ${packageDirectory}`
    )
  }

  const normalizedPrefix = options.r2Prefix.replace(/^\/+|\/+$/g, "")
  const r2Prefix = `${normalizedPrefix}/${journey.slug}`
  const stagingDirectory = path.join(
    outputDirectory,
    `.${journey.slug}-prepare-${process.pid}-${Date.now()}`
  )
  const context = {
    dryRun: options.dryRun,
    journey,
    r2Prefix,
    rightsOwner: options.rightsOwner,
    rightsStatus: options.rightsStatus,
    stagingDirectory,
  }

  if (!options.dryRun) {
    await fs.promises.mkdir(outputDirectory, { recursive: true })
    await fs.promises.mkdir(stagingDirectory, { recursive: false })
  }

  try {
    const assets = []
    for (let index = 0; index < images.length; index += 1) {
      const extension = path.extname(images[index]).toLowerCase()
      const filename = `${journey.slug}-${String(index + 1).padStart(3, "0")}${extension}`
      assets.push(
        await createPackageAsset(images[index], filename, index, context)
      )
    }

    const batchSeed = JSON.stringify({
      journeyId: journey.id,
      r2Prefix,
      assets: assets.map(asset => ({
        objectKey: asset.output.objectKey,
        sha256: asset.output.sha256,
      })),
    })
    const manifest = {
      schemaVersion: 1,
      manifestType: "journey-media-publication",
      batchId: `media-${journey.slug}-${sha256(batchSeed).slice(0, 16)}`,
      journeyId: journey.id,
      journeySlug: journey.slug,
      inputTag: options.tag,
      r2Prefix: `${r2Prefix}/`,
      assets,
    }

    if (!options.dryRun) {
      await fs.promises.writeFile(
        path.join(stagingDirectory, "publication-manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        { flag: "wx" }
      )
      await fs.promises.rename(stagingDirectory, packageDirectory)
    }

    console.log("")
    console.log(
      `${options.dryRun ? "Would create" : "Created"} Journey package with ${assets.length} image(s).`
    )
    console.log(`Canonical Journey: ${journey.id}`)
    console.log(`R2 prefix: ${manifest.r2Prefix}`)
    console.log(
      `Manifest: ${path.join(packageDirectory, "publication-manifest.json")}`
    )
    if (!options.dryRun) {
      console.log(
        "Upload every packaged image at its manifest objectKey, then run npm run media:ingest with a verification receipt."
      )
    }
  } catch (error) {
    if (!options.dryRun && (await pathExists(stagingDirectory))) {
      await fs.promises.rm(stagingDirectory, { recursive: true, force: true })
    }
    throw error
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

  let tagMatch = null

  try {
    tagMatch = await matchCanonicalTag(options.tag)
    reportTagMatch(options.tag, tagMatch)
  } catch (error) {
    if (options.useSuggestedTag) {
      throw new Error(`Canonical tag matching failed: ${error.message}`)
    }

    console.warn(`Tag matching unavailable: ${error.message}`)
  }

  if (options.useSuggestedTag && !tagMatch?.confident) {
    throw new Error(
      `Cannot use a suggested tag for "${options.tag}": the canonical match is missing, weak, or ambiguous. Use a more specific --tag.`
    )
  }

  const outputTag = options.useSuggestedTag
    ? tagMatch.best.suggestedTag
    : options.tag

  if (outputTag !== options.tag) {
    console.log(`Using suggested filename label: ${outputTag}`)
  } else if (
    tagMatch?.confident &&
    tagMatch.best.suggestedTag !== options.tag
  ) {
    console.log(
      `Using supplied label "${options.tag}". Add --use-suggested-tag to use "${tagMatch.best.suggestedTag}".`
    )
  }

  const images = (await findImages(sourceDirectory, false)).sort(
    (left, right) => left.localeCompare(right)
  )
  const items = numberedTargets(images, sourceDirectory, outputTag)
  const summary = {
    scanned: images.length,
    compressed: 0,
    copiedOriginal: 0,
    failed: 0,
    savedBytes: 0,
  }

  await requireAvailableTargets(items)

  console.log(
    `${options.dryRun ? "Dry run: " : ""}creating numbered copies of ${images.length} JPEG/PNG images in ${sourceDirectory} with tag "${outputTag}"`
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

  if (options.packageMode) {
    await runPackageMode(options)
  } else if (options.copyMode) {
    await runCopyMode(options)
  } else {
    await runInPlaceMode(options)
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
