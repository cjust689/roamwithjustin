#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildPlaceCatalog } from "./lib/build-place-catalog.mjs"

const defaultSpotSource = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "curated-spots.json"
)
const defaultReviewedCitySource = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "reviewed-cities.json"
)

function usage() {
  return [
    "Build a deterministic GeoNames catalog.",
    "",
    "Required:",
    "  --source-dir <directory>",
    "  --output <file>",
    "  --revision <immutable revision>",
    "  --source-date <YYYY-MM-DD>",
    "",
    "Optional:",
    "  --previous <catalog.json>",
    "  --include-place-id <GeoNames ID> (repeatable or comma separated)",
    "  --spot-source <curated-spots.json>",
    "  --reviewed-city-source <reviewed-cities.json>",
  ].join("\n")
}

function parseArgs(argv) {
  const options = { includePlaceIds: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === "--help" || argument === "-h") options.help = true
    else if (argument === "--source-dir") options.sourceDirectory = value
    else if (argument === "--output") options.output = value
    else if (argument === "--revision") options.revision = value
    else if (argument === "--source-date") options.sourceSnapshotDate = value
    else if (argument === "--previous") options.previous = value
    else if (argument === "--spot-source") options.spotSourceFile = value
    else if (argument === "--reviewed-city-source")
      options.reviewedCitySourceFile = value
    else if (argument === "--include-place-id") {
      options.includePlaceIds.push(
        ...String(value || "")
          .split(",")
          .filter(Boolean)
      )
    } else throw new Error("Unknown argument: " + argument)

    if (argument.startsWith("--") && argument !== "--help") index += 1
  }
  return options
}

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    process.exit(0)
  }
  if (!options.output) throw new Error("--output is required")
  const previousCatalog = options.previous
    ? JSON.parse(fs.readFileSync(path.resolve(options.previous), "utf8"))
    : null
  const catalog = buildPlaceCatalog({
    ...options,
    previousCatalog,
    spotSourceFile: path.resolve(options.spotSourceFile || defaultSpotSource),
    reviewedCitySourceFile: path.resolve(
      options.reviewedCitySourceFile || defaultReviewedCitySource
    ),
  })
  const output = path.resolve(options.output)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(catalog) + "\n", "utf8")
  console.log(
    "Built " +
      output +
      " with " +
      catalog.stats.countries +
      " countries, " +
      catalog.stats.cities +
      " cities, " +
      catalog.stats.spots +
      " spots, and " +
      catalog.stats.deprecated +
      " deprecated records."
  )
} catch (error) {
  console.error(error.message)
  console.error(usage())
  process.exitCode = 1
}
