const combiningMarks = /[\u0300-\u036f]/g
const punctuation = /[^\p{L}\p{N}]+/gu

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(combiningMarks, "")
    .toLowerCase()
    .replace(punctuation, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function formatPlaceLabel(place) {
  if (!place) return ""
  if (place.placeType === "country") return place.name

  return [place.name, place.admin1Name, place.countryName]
    .filter(Boolean)
    .join(", ")
}

function searchScore(record, query) {
  const names = Array.isArray(record.searchNames) ? record.searchNames : []
  const canonicalNames = [...new Set([record.name, record.asciiName])]
    .map(normalizeSearchText)
    .filter(Boolean)
  let score = Number.POSITIVE_INFINITY

  canonicalNames.forEach(name => {
    if (name === query) score = Math.min(score, 0)
    else if (name.startsWith(query)) score = Math.min(score, 10)
  })

  names.forEach(name => {
    if (name === query) score = Math.min(score, 5)
    else if (name.startsWith(query)) score = Math.min(score, 15)
    else if (name.includes(" " + query)) score = Math.min(score, 20)
    else if (name.includes(query)) score = Math.min(score, 30)
  })

  return score
}

export function searchPlaceCatalog(
  catalog,
  query,
  { limit = 10, minQueryLength = 2, includeDeprecated = false } = {}
) {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < minQueryLength) return []

  const records = Array.isArray(catalog) ? catalog : catalog?.records || []

  return records
    .filter(record => includeDeprecated || !record.deprecated)
    .map(record => ({ record, score: searchScore(record, normalizedQuery) }))
    .filter(candidate => Number.isFinite(candidate.score))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score
      const populationDifference =
        Number(right.record.population || 0) -
        Number(left.record.population || 0)
      if (populationDifference) return populationDifference
      return formatPlaceLabel(left.record).localeCompare(
        formatPlaceLabel(right.record)
      )
    })
    .slice(0, Math.max(0, Math.min(10, limit)))
    .map(candidate => candidate.record)
}

export function resolveCatalogPlace(catalog, placeId) {
  const records = Array.isArray(catalog) ? catalog : catalog?.records || []
  return records.find(record => record.placeId === placeId) || null
}
