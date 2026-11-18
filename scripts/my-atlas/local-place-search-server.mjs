#!/usr/bin/env node
import crypto from "node:crypto"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { searchPlaceCatalog } from "../../src/features/my-atlas/catalog/search.mjs"
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

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === "--source-dir") options.sourceDirectory = value
    else if (argument === "--port") options.port = Number(value)
    else throw new Error("Unknown argument: " + argument)
    index += 1
  }
  return options
}

function sourceIdentity(sourceDirectory) {
  const cityFile = path.join(sourceDirectory, "cities500.txt")
  const stat = fs.statSync(cityFile)
  const hash = crypto.createHash("sha256")
  hash.update(fs.readFileSync(cityFile))
  hash.update(fs.readFileSync(defaultSpotSource))
  hash.update(fs.readFileSync(defaultReviewedCitySource))
  const sourceSnapshotDate = stat.mtime.toISOString().slice(0, 10)
  return {
    sourceSnapshotDate,
    revision: `local-${sourceSnapshotDate}-${hash.digest("hex").slice(0, 12)}`,
  }
}

function allowedLocalOrigin(origin) {
  if (!origin) return ""
  try {
    const parsed = new URL(origin)
    if (
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)
    ) {
      return parsed.origin
    }
  } catch (error) {
    return ""
  }
  return ""
}

function json(response, status, payload, origin = "") {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": origin,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  })
  response.end(JSON.stringify(payload))
}

export function createLocalPlaceSearchServer({ catalog }) {
  return http.createServer((request, response) => {
    const origin = allowedLocalOrigin(request.headers.origin)
    if (request.headers.origin && !origin) {
      json(response, 403, { error: "origin_not_allowed" })
      return
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Accept",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
      })
      response.end()
      return
    }

    if (request.method !== "GET") {
      json(response, 405, { error: "method_not_allowed" }, origin)
      return
    }

    const requestUrl = new URL(request.url || "/", "http://127.0.0.1")
    if (requestUrl.pathname === "/health") {
      json(
        response,
        200,
        {
          ok: true,
          catalogRevision: catalog.catalogRevision,
          records: catalog.records.length,
        },
        origin
      )
      return
    }
    if (requestUrl.pathname !== "/v1/places/search") {
      json(response, 404, { error: "not_found" }, origin)
      return
    }

    const query = String(requestUrl.searchParams.get("q") || "").slice(0, 80)
    const requestedLimit = Number(requestUrl.searchParams.get("limit") || 8)
    const limit = Number.isInteger(requestedLimit)
      ? Math.max(1, Math.min(10, requestedLimit))
      : 8
    const results = searchPlaceCatalog(catalog, query, { limit })
    json(
      response,
      200,
      {
        catalogRevision: catalog.catalogRevision,
        attribution: catalog.attribution,
        results,
      },
      origin
    )
  })
}

export function buildLocalPlaceSearchCatalog(sourceDirectory) {
  const identity = sourceIdentity(sourceDirectory)
  return buildPlaceCatalog({
    sourceDirectory,
    revision: identity.revision,
    sourceSnapshotDate: identity.sourceSnapshotDate,
    spotSourceFile: defaultSpotSource,
    reviewedCitySourceFile: defaultReviewedCitySource,
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.sourceDirectory) throw new Error("--source-dir is required")
  const sourceDirectory = path.resolve(options.sourceDirectory)
  const port = options.port || 8788
  const catalog = buildLocalPlaceSearchCatalog(sourceDirectory)
  const server = createLocalPlaceSearchServer({ catalog })
  server.listen(port, "127.0.0.1", () => {
    console.log(
      `My Atlas local search ready on http://127.0.0.1:${port} with ${catalog.stats.cities} cities, ${catalog.stats.countries} countries, and ${catalog.stats.spots} curated spots.`
    )
  })
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isEntryPoint) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
