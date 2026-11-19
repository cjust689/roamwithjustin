#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const NPS_ENDPOINT = "https://developer.nps.gov/api/v1/parks"
const PARKS_CANADA_ENDPOINT =
  "https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/vw_Places_Public_lieux_public_APCA/FeatureServer/0/query"
const CONANP_ENDPOINT =
  "https://geoserver.conanp.gob.mx/geoserver/SIG-DES/wfs"

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ""
}

function clean(value) {
  return String(value || "").trim()
}

function publicName(value) {
  return clean(value)
    .replace(/\s*[\u2010-\u2015]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
}

function slug(value) {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function coordinatePairs(value, output = []) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  ) {
    output.push([Number(value[0]), Number(value[1])])
    return output
  }
  if (Array.isArray(value)) {
    value.forEach(item => coordinatePairs(item, output))
  }
  return output
}

function centerOfGeometry(geometry) {
  const pairs = coordinatePairs(geometry?.coordinates)
  if (!pairs.length) return null
  const longitudes = pairs.map(pair => pair[0])
  const latitudes = pairs.map(pair => pair[1])
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ]
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`${response.status} from ${new URL(url).hostname}`)
  }
  return response.json()
}

async function npsRecords(apiKey, retrieved) {
  const url = new URL(NPS_ENDPOINT)
  url.searchParams.set("limit", "600")
  url.searchParams.set("api_key", apiKey)
  const response = await getJson(url)
  const includedCodes = new Set(["npsa", "redw"])
  return response.data
    .filter(
      park =>
        clean(park.designation).startsWith("National Park") ||
        includedCodes.has(clean(park.parkCode))
    )
    .map(park => {
      const latitude = Number(park.latitude)
      const longitude = Number(park.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(`NPS park has no usable coordinates: ${park.fullName}`)
      }
      const aliases = []
      if (park.parkCode === "seki") {
        aliases.push("Sequoia National Park", "Kings Canyon National Park")
      }
      return {
        placeId: `park:us:nps:${clean(park.parkCode).toLowerCase()}`,
        name: publicName(park.fullName),
        aliases,
        countryCode: park.states === "AS" ? "AS" : park.states === "VI" ? "VI" : "US",
        admin1Name: clean(park.states),
        longitude,
        latitude,
        source: {
          provider: "National Park Service",
          recordId: clean(park.parkCode).toLowerCase(),
          sourceUrl: clean(park.url),
          retrieved,
        },
      }
    })
}

function attribute(attributes, ...names) {
  const entries = Object.entries(attributes || {})
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (match) return match[1]
  }
  return ""
}

async function parksCanadaRecords(retrieved) {
  const url = new URL(PARKS_CANADA_ENDPOINT)
  url.searchParams.set("where", "1=1")
  url.searchParams.set("outFields", "*")
  url.searchParams.set("returnGeometry", "true")
  url.searchParams.set("returnCentroid", "true")
  url.searchParams.set("outSR", "4326")
  url.searchParams.set("f", "json")
  const response = await getJson(url)
  return response.features
    .filter(feature =>
      ["National Park", "National Park Reserve"].includes(
        clean(attribute(feature.attributes, "PLACE_TYPE_E", "Place_Type_E"))
      )
    )
    .map(feature => {
      const attributes = feature.attributes
      const recordId = clean(attribute(attributes, "BAID", "OBJECTID"))
      const name = publicName(
        attribute(attributes, "PLACE_NAME_E", "Place_Name_E", "DESC_EN")
      )
      const point = feature.centroid || feature.geometry
      if (!recordId || !name || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        throw new Error(
          `Parks Canada record is incomplete: ${name || recordId} ${JSON.stringify({ attributes, point })}`
        )
      }
      return {
        placeId: `park:ca:pca:${slug(recordId)}`,
        name,
        aliases: [],
        countryCode: "CA",
        admin1Name: clean(attribute(attributes, "PROV_TERR_E", "Province_E")),
        longitude: point.x,
        latitude: point.y,
        source: {
          provider: "Parks Canada",
          recordId,
          sourceUrl: clean(attribute(attributes, "URL_E", "Url_E")) || "https://parks.canada.ca/",
          retrieved,
        },
      }
    })
}

async function conanpRecords(retrieved) {
  const url = new URL(CONANP_ENDPOINT)
  url.searchParams.set("service", "WFS")
  url.searchParams.set("version", "2.0.0")
  url.searchParams.set("request", "GetFeature")
  url.searchParams.set("typeNames", "SIG-DES:shp_anp")
  url.searchParams.set("outputFormat", "application/json")
  url.searchParams.set("srsName", "EPSG:4326")
  const response = await getJson(url)
  const records = response.features
    .filter(
      feature =>
        ["Parque Nacional", "PN"].includes(
          clean(attribute(feature.properties, "cat_manejo"))
        )
    )
    .map(feature => {
      const properties = feature.properties || {}
      const recordId = clean(
        attribute(properties, "id_anp", "num_anp") || feature.id
      )
      const coordinates = centerOfGeometry(feature.geometry)
      const name = publicName(attribute(properties, "nombre"))
      if (!recordId || !name || !coordinates) {
        throw new Error(`CONANP record is incomplete: ${recordId || "unknown"}`)
      }
      return {
        placeId: `park:mx:conanp:${slug(recordId)}`,
        name,
        aliases: [],
        countryCode: "MX",
        admin1Name: clean(attribute(properties, "estados")),
        longitude: coordinates[0],
        latitude: coordinates[1],
        source: {
          provider: "CONANP",
          recordId,
          sourceUrl: "https://sig.conanp.gob.mx/snd/",
          retrieved,
        },
      }
    })
  if (!records.length) {
    throw new Error(
      `CONANP returned no national parks. First properties: ${JSON.stringify(response.features?.[0]?.properties || {})}`
    )
  }
  return records
}

const output = argument("--output")
const apiKey = argument("--nps-api-key") || process.env.NPS_API_KEY || "DEMO_KEY"
if (!output) throw new Error("--output is required")
const retrieved = new Date().toISOString().slice(0, 10)
const records = [
  ...(await npsRecords(apiKey, retrieved)),
  ...(await parksCanadaRecords(retrieved)),
  ...(await conanpRecords(retrieved)),
].sort((left, right) => left.placeId.localeCompare(right.placeId))
const uniqueIds = new Set(records.map(record => record.placeId))
if (uniqueIds.size !== records.length) throw new Error("Official park IDs are not unique")
const document = {
  schemaVersion: 1,
  scope: "north-america-national-parks",
  sourceSnapshotDate: retrieved,
  sources: [
    { provider: "National Park Service", url: NPS_ENDPOINT },
    { provider: "Parks Canada", url: PARKS_CANADA_ENDPOINT },
    { provider: "CONANP", url: CONANP_ENDPOINT },
  ],
  stats: {
    unitedStates: records.filter(record => record.placeId.startsWith("park:us:")).length,
    canada: records.filter(record => record.placeId.startsWith("park:ca:")).length,
    mexico: records.filter(record => record.placeId.startsWith("park:mx:")).length,
    total: records.length,
  },
  records,
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
fs.writeFileSync(path.resolve(output), `${JSON.stringify(document, null, 2)}\n`, "utf8")
console.log(`Wrote ${records.length} official park records to ${path.resolve(output)}`)
