#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildWorkerPlaceCatalogArtifacts } from "./lib/build-worker-place-catalog.mjs"

function usage() {
  return [
    "Build immutable My Atlas Worker catalog shards.",
    "",
    "Required:",
    "  --catalog <versioned catalog.json>",
    "  --output-dir <artifact directory>",
    "",
    "Optional:",
    "  --revision <immutable artifact revision>",
  ].join("\n")
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === "--help" || argument === "-h") options.help = true
    else if (argument === "--catalog") options.catalog = value
    else if (argument === "--output-dir") options.outputDirectory = value
    else if (argument === "--revision") options.artifactRevision = value
    else throw new Error(`Unknown argument: ${argument}`)
    if (argument.startsWith("--") && argument !== "--help") index += 1
  }
  return options
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.catalog || !options.outputDirectory) {
    throw new Error("--catalog and --output-dir are required")
  }
  const catalog = JSON.parse(
    fs.readFileSync(path.resolve(options.catalog), "utf8")
  )
  const manifest = buildWorkerPlaceCatalogArtifacts({
    catalog,
    outputDirectory: path.resolve(options.outputDirectory),
    artifactRevision: options.artifactRevision,
  })
  console.log(
    `Built ${manifest.catalogRevision}: ${manifest.recordShards.count} record shards, ${manifest.searchShards.count} search shards, ${manifest.shardStats.recordCompressedBytes + manifest.shardStats.searchCompressedBytes} compressed bytes.`
  )
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isEntryPoint) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    console.error(usage())
    process.exitCode = 1
  }
}
