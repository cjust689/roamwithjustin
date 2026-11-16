import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { normalizeSearchText } from "../../../src/features/my-atlas/catalog/search.mjs"

const sourceFiles = ["countryInfo.txt", "admin1CodesASCII.txt", "cities500.txt"]
const retiredCountryCodes = new Set(["AN", "CS"])

function readLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function parseCountries(file) {
  return readLines(file)
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const columns = line.split("\t")
      if (columns.length < 17) {
        throw new Error("Invalid countryInfo row: " + line)
      }
      return {
        iso2: columns[0],
        iso3: columns[1],
        name: columns[4],
        capital: columns[5],
        population: number(columns[7]),
        continent: columns[8],
        geonameId: columns[16],
      }
    })
    .filter(
      country =>
        /^[A-Z]{2}$/.test(country.iso2) &&
        !retiredCountryCodes.has(country.iso2)
    )
}

function parseAdmin1(file) {
  const byCode = new Map()
  readLines(file)
    .filter(Boolean)
    .forEach(line => {
      const [code, name, asciiName, geonameId] = line.split("\t")
      if (!code || !name) return
      byCode.set(code, { name, asciiName, geonameId })
    })
  return byCode
}

function parseCities(file) {
  return readLines(file)
    .filter(Boolean)
    .map(line => {
      const columns = line.split("\t")
      if (columns.length < 19) {
        throw new Error("Invalid cities500 row: " + line)
      }
      if (columns[6] !== "P") return null
      const latitude = number(columns[4], Number.NaN)
      const longitude = number(columns[5], Number.NaN)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Invalid city coordinates for GeoNames " + columns[0])
      }
      return {
        geonameId: columns[0],
        name: columns[1],
        asciiName: columns[2],
        aliases: columns[3] ? columns[3].split(",") : [],
        latitude,
        longitude,
        featureClass: columns[6],
        featureCode: columns[7],
        countryCode: columns[8],
        admin1Code: columns[10],
        population: number(columns[14]),
        modified: columns[18],
      }
    })
    .filter(Boolean)
}

function searchNames({ aliases, name, admin1Name, countryName, iso2, iso3 }) {
  const normalizedAliases = unique([name, ...(aliases || []), iso2, iso3])
    .map(normalizeSearchText)
    .filter(Boolean)
  const compositeNames = unique([
    normalizeSearchText([name, countryName].filter(Boolean).join(" ")),
    normalizeSearchText(
      [name, admin1Name, countryName].filter(Boolean).join(" ")
    ),
  ])
  return unique([...normalizedAliases, ...compositeNames])
}

function representativeCity(country, cities) {
  const countryCities = cities.filter(city => city.countryCode === country.iso2)
  const capital = normalizeSearchText(country.capital)
  const capitalRecord = countryCities.find(city =>
    unique([city.name, city.asciiName, ...city.aliases])
      .map(normalizeSearchText)
      .includes(capital)
  )
  if (capitalRecord) return { city: capitalRecord, kind: "capital" }

  const largest = [...countryCities].sort(
    (left, right) => right.population - left.population
  )[0]
  return largest ? { city: largest, kind: "largest-populated-place" } : null
}

function countryRecord(country, cities, revision) {
  const representative = representativeCity(country, cities)
  const aliases = unique([country.name, country.iso2, country.iso3])
  return {
    placeId: "iso-country:" + country.iso2,
    placeType: "country",
    name: country.name,
    asciiName: country.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""),
    aliases,
    searchNames: searchNames({
      aliases,
      name: country.name,
      iso2: country.iso2,
      iso3: country.iso3,
    }),
    countryCode: country.iso2,
    countryName: country.name,
    continent: country.continent,
    coordinates: representative
      ? [representative.city.longitude, representative.city.latitude]
      : null,
    coordinateKind: representative?.kind || "unresolved",
    population: country.population,
    source: {
      provider: "GeoNames",
      geonameId: country.geonameId,
      featureCode: "PCLI",
    },
    catalogRevision: revision,
    deprecated: false,
  }
}

function cityRecord(city, countries, admin1, revision) {
  const country = countries.get(city.countryCode)
  if (!country) {
    throw new Error(
      "GeoNames city " +
        city.geonameId +
        " references unknown country " +
        city.countryCode
    )
  }
  const admin = admin1.get(city.countryCode + "." + city.admin1Code)
  const aliases = unique([city.name, city.asciiName, ...city.aliases])
  return {
    placeId: "geonames:" + city.geonameId,
    placeType: "city",
    name: city.name,
    asciiName: city.asciiName,
    aliases,
    searchNames: searchNames({
      aliases,
      name: city.name,
      admin1Name: admin?.name || "",
      countryName: country.name,
    }),
    countryCode: city.countryCode,
    countryName: country.name,
    admin1Code: city.admin1Code,
    admin1Name: admin?.name || "",
    coordinates: [city.longitude, city.latitude],
    coordinateKind: "populated-place",
    population: city.population,
    source: {
      provider: "GeoNames",
      geonameId: city.geonameId,
      featureClass: city.featureClass,
      featureCode: city.featureCode,
      modified: city.modified,
    },
    catalogRevision: revision,
    deprecated: false,
  }
}

function assertStableIdentity(previous, current) {
  if (previous.placeType !== current.placeType) {
    throw new Error("Catalog identity type changed for " + current.placeId)
  }
  if (previous.countryCode !== current.countryCode) {
    throw new Error("Catalog identity country changed for " + current.placeId)
  }
  if (
    String(previous.source?.geonameId) !== String(current.source?.geonameId)
  ) {
    throw new Error("Catalog source identity changed for " + current.placeId)
  }
}

function mergePrevious(records, previousCatalog, revision) {
  if (!previousCatalog) return records
  const currentById = new Map(records.map(record => [record.placeId, record]))
  const previousRecords = previousCatalog.records || []

  previousRecords.forEach(previous => {
    const current = currentById.get(previous.placeId)
    if (current) {
      assertStableIdentity(previous, current)
      return
    }
    currentById.set(previous.placeId, {
      ...previous,
      catalogRevision: revision,
      deprecated: true,
    })
  })

  return [...currentById.values()]
}

function sourceManifest(sourceDirectory) {
  return sourceFiles.map(fileName => {
    const file = path.join(sourceDirectory, fileName)
    const stat = fs.statSync(file)
    return {
      file: fileName,
      bytes: stat.size,
      sha256: sha256(file),
    }
  })
}

export function buildPlaceCatalog({
  sourceDirectory,
  revision,
  sourceSnapshotDate,
  includePlaceIds = [],
  previousCatalog = null,
}) {
  if (!sourceDirectory || !revision || !sourceSnapshotDate) {
    throw new Error(
      "sourceDirectory, revision, and sourceSnapshotDate are required"
    )
  }
  sourceFiles.forEach(fileName => {
    const file = path.join(sourceDirectory, fileName)
    if (!fs.existsSync(file))
      throw new Error("Missing GeoNames source: " + file)
  })

  const countriesList = parseCountries(
    path.join(sourceDirectory, "countryInfo.txt")
  )
  const countries = new Map(
    countriesList.map(country => [country.iso2, country])
  )
  const admin1 = parseAdmin1(path.join(sourceDirectory, "admin1CodesASCII.txt"))
  const cities = parseCities(path.join(sourceDirectory, "cities500.txt"))
  const selectedIds = new Set(includePlaceIds.map(String))
  const selectedCities = selectedIds.size
    ? cities.filter(city => selectedIds.has(city.geonameId))
    : cities
  const missingIds = [...selectedIds].filter(
    id => !selectedCities.some(city => city.geonameId === id)
  )
  if (missingIds.length) {
    throw new Error(
      "GeoNames IDs not found in cities500: " + missingIds.join(", ")
    )
  }

  let records = [
    ...countriesList.map(country => countryRecord(country, cities, revision)),
    ...selectedCities.map(city =>
      cityRecord(city, countries, admin1, revision)
    ),
  ]
  records = mergePrevious(records, previousCatalog, revision).sort(
    (left, right) => left.placeId.localeCompare(right.placeId)
  )

  return {
    schemaVersion: 1,
    catalogRevision: revision,
    sourceSnapshotDate,
    attribution: {
      provider: "GeoNames",
      url: "https://www.geonames.org/",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
    selection: selectedIds.size
      ? { mode: "proof-subset", cityIds: [...selectedIds].sort() }
      : { mode: "all-cities500" },
    sources: sourceManifest(sourceDirectory),
    stats: {
      countries: records.filter(record => record.placeType === "country")
        .length,
      cities: records.filter(record => record.placeType === "city").length,
      deprecated: records.filter(record => record.deprecated).length,
    },
    records,
  }
}
