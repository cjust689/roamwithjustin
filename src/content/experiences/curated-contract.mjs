const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validId = value =>
  typeof value === "string" && value.length <= 120 && ID.test(value)
export const EXPERIENCE_CATEGORIES = Object.freeze({
  "boat-and-water": "Boat and water",
  outdoors: "Outdoors",
  food: "Food",
  culture: "Culture",
  "guided-tour": "Guided tours",
  family: "Family",
  photography: "Photography",
  stay: "Places to stay",
})
const FIELDS = new Set([
  "id",
  "slug",
  "journeyId",
  "visitId",
  "placeId",
  "title",
  "summary",
  "category",
  "firsthand",
  "evidenceRefs",
  "partnerId",
  "coverAssetId",
  "visibility",
  "sortOrder",
  "disclosure",
  "sourceOwner",
])

function publicText(value, maximum, required = false) {
  return (
    typeof value === "string" &&
    value.length <= maximum &&
    (!required || value.trim().length > 0) &&
    value === value.trim() &&
    !/[<>\p{Cc}\p{Cf}\u2010-\u2015;]|(?:^|\s)-(?=\s|$)|(?<!\d):/u.test(value) &&
    !/\b(?:coming soon|confirmed|unconfirmed|verified|unverified|placeholder|pending)\b/i.test(
      value
    )
  )
}

export function officialExperiencePartner(partner) {
  if (
    partner?.evidenceStatus !== "confirmed" ||
    partner.relationship !== "trip-operator"
  )
    return null
  try {
    const href = partner.externalLinks?.official
    const url = new URL(href)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !url.hostname.includes(".") ||
      /^(?:\d|\[)/.test(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal|test)$/.test(url.hostname)
    )
      return null
    return {
      name: partner.name,
      href,
      disclosure:
        "Official operator website. No sponsorship or affiliate relationship is asserted.",
    }
  } catch {
    return null
  }
}

export function validateCuratedExperiences(document, context) {
  const errors = []
  if (
    document?.schemaVersion !== 1 ||
    !Array.isArray(document.experiences) ||
    document.experiences.length > 500 ||
    Object.keys(document).some(
      key => !["schemaVersion", "experiences"].includes(key)
    )
  )
    return ["Expected schemaVersion 1 and at most 500 experiences"]
  const ids = new Set((context.generated || []).map(record => record.id))
  const slugs = new Set(
    (context.generated || []).map(
      record => `${record.journeyId}/${record.slug}`
    )
  )
  for (const record of document.experiences) {
    const owner = `Experience ${record?.id || "unknown"}`
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.keys(record).some(key => !FIELDS.has(key))
    ) {
      errors.push(`${owner} contains unsupported fields`)
      continue
    }
    if (!validId(record.id) || ids.has(record.id))
      errors.push(`${owner} has an invalid or duplicate ID`)
    ids.add(record.id)
    const slug = `${record.journeyId}/${record.slug}`
    if (!validId(record.slug) || slugs.has(slug))
      errors.push(`${owner} has an invalid or duplicate Journey slug`)
    slugs.add(slug)
    const journey = context.getJourney(record.journeyId)
    const visit = Array.isArray(journey?.visits)
      ? journey.visits.find(item => item.id === record.visitId)
      : null
    if (!journey || !visit || visit.placeId !== record.placeId)
      errors.push(
        `${owner} needs an exact canonical Journey, Visit and Place association`
      )
    if (
      !publicText(record.title, 120, true) ||
      !publicText(record.summary, 1200)
    )
      errors.push(`${owner} has invalid public title or summary copy`)
    if (!Object.hasOwn(EXPERIENCE_CATEGORIES, record.category))
      errors.push(`${owner} has an unknown category`)
    if (
      !["draft", "published"].includes(record.visibility) ||
      typeof record.firsthand !== "boolean" ||
      record.sourceOwner !== "curated" ||
      record.disclosure !== "independent" ||
      !Number.isInteger(record.sortOrder) ||
      record.sortOrder < 0
    )
      errors.push(`${owner} has invalid publication metadata`)
    if (record.visibility === "published" && !record.firsthand)
      errors.push(
        `${owner} needs explicit firsthand evidence before publication`
      )
    if (context.requireEvidence) {
      if (
        !Array.isArray(record.evidenceRefs) ||
        record.evidenceRefs.length > 10 ||
        record.evidenceRefs.some(
          value =>
            typeof value !== "string" ||
            !value.trim() ||
            value.length > 500 ||
            /[\p{Cc}\p{Cf}]/u.test(value)
        ) ||
        (record.visibility === "published" && !record.evidenceRefs.length)
      )
        errors.push(
          `${owner} needs private source references before publication`
        )
    } else if (record.evidenceRefs !== undefined)
      errors.push(
        `${owner} private evidence references must not enter the public registry`
      )
    if (
      record.partnerId &&
      (!officialExperiencePartner(context.getPartner(record.partnerId)) ||
        !visit?.partnerIds?.includes(record.partnerId))
    )
      errors.push(
        `${owner} references an operator without an established independent official link`
      )
    if (record.coverAssetId) {
      const asset = context.getMediaAsset(record.coverAssetId)
      const placed = (context.placements || []).some(
        placement =>
          placement.assetId === record.coverAssetId &&
          placement.visibility === "published" &&
          placement.journeyId === record.journeyId &&
          (placement.visitId
            ? placement.visitId === record.visitId
            : placement.placeId === record.placeId)
      )
      if (
        !asset ||
        asset.kind !== "image" ||
        asset.rights?.status !== "owned" ||
        !placed
      )
        errors.push(
          `${owner} cover must be an owned image already published at this visit`
        )
    }
  }
  return errors
}
