export function cleanCatalogAttribution(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Catalog attribution is invalid.")
  }
  const attribution = {}
  for (const key of ["provider", "url", "license", "licenseUrl"]) {
    if (typeof value[key] === "string" && value[key]) {
      attribution[key] = value[key]
    }
  }
  if (!attribution.provider || !attribution.license) {
    throw new Error("Catalog attribution is invalid.")
  }
  return Object.freeze(attribution)
}

export function projectCatalogPlace(record) {
  if (
    !record ||
    typeof record.placeId !== "string" ||
    !["country", "city"].includes(record.placeType) ||
    typeof record.name !== "string" ||
    !Array.isArray(record.coordinates) ||
    record.coordinates.length !== 2 ||
    !record.coordinates.every(Number.isFinite)
  ) {
    throw new Error("A catalog place is unavailable.")
  }
  return Object.freeze({
    placeId: record.placeId,
    placeType: record.placeType,
    name: record.name,
    ...(typeof record.countryCode === "string" && record.countryCode
      ? { countryCode: record.countryCode }
      : {}),
    ...(typeof record.admin1Name === "string" && record.admin1Name
      ? { admin1Name: record.admin1Name }
      : {}),
    ...(typeof record.countryName === "string" && record.countryName
      ? { countryName: record.countryName }
      : {}),
    ...(typeof record.continent === "string" && record.continent
      ? { continent: record.continent }
      : {}),
    ...(typeof record.source?.featureCode === "string" &&
    record.source.featureCode
      ? { featureCode: record.source.featureCode }
      : {}),
    coordinates: Object.freeze([...record.coordinates]),
  })
}
