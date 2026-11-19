import {
  gearContract,
  gearRecords,
  gearUsageRecords,
  getGearItem,
} from "../gear/index.mjs"
import { getMediaAsset } from "../media/index.mjs"
import { getPartner } from "../partners/index.mjs"
import { resolveMediaReference } from "./media.mjs"

function isPublishedUsage(usage) {
  return (
    usage.visibility === "published" &&
    usage.evidence !== "needs-review" &&
    gearContract.PUBLIC_GEAR_USAGE_TYPES.includes(usage.usageType)
  )
}

function isPublishedItem(item) {
  return item?.verificationStatus === "verified"
}

function publicLinks(item, surface) {
  return (item.links || [])
    .filter(
      link =>
        link.verified &&
        /^https:\/\//i.test(link.url || "") &&
        (link.allowedSurfaces || []).includes(surface)
    )
    .map(link => {
      const partner = link.partnerId ? getPartner(link.partnerId) : null
      return {
        ...link,
        disclosure: partner?.disclosure || "",
        rel: link.affiliate
          ? "sponsored noopener noreferrer"
          : "noopener noreferrer",
      }
    })
}

function uniqueById(items) {
  return items.filter(
    (item, index, all) =>
      item && all.findIndex(candidate => candidate?.id === item.id) === index
  )
}

function gearView(item, usage = [], surface = "public-gear") {
  const image = item.imageAssetId
    ? resolveMediaReference({ assetId: item.imageAssetId })
    : null
  const links = publicLinks(item, surface)
  const orderedUsage = [...usage].sort(
    (left, right) =>
      Number(Boolean(right.featured)) - Number(Boolean(left.featured)) ||
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.sortOrder ?? Number.MAX_SAFE_INTEGER)
  )
  const leadUsage = orderedUsage[0] || null

  return Object.freeze({
    id: item.id,
    name: item.name,
    category: item.category,
    brand: item.brand,
    model: item.model,
    description: item.description,
    image: image?.src || "",
    imageSrcset: image?.srcset || "",
    imageAlt: image?.alt || item.name,
    links: Object.freeze(links),
    primaryLink: links[0] || null,
    affiliateDisclosures: Object.freeze([
      ...new Set(
        links
          .filter(link => link.affiliate && link.disclosure)
          .map(link => link.disclosure)
      ),
    ]),
    notes: leadUsage?.notes || "",
    whyItWorked: leadUsage?.whyItWorked || "",
    limitations: leadUsage?.limitations || "",
    wouldBringAgain: leadUsage?.wouldBringAgain ?? null,
    usageType: leadUsage?.usageType || null,
    usage: Object.freeze(orderedUsage),
  })
}

function selectUsage(predicate, options = {}) {
  const includeDrafts = Boolean(options.includeDrafts)
  const selected = gearUsageRecords.filter(
    usage => predicate(usage) && (includeDrafts || isPublishedUsage(usage))
  )
  const usageByGearId = new Map()

  selected.forEach(usage => {
    const values = usageByGearId.get(usage.gearId) || []
    values.push(usage)
    usageByGearId.set(usage.gearId, values)
  })

  return [...usageByGearId.entries()]
    .map(([gearId, usage]) => {
      const item = getGearItem(gearId)
      if (!item || (!includeDrafts && !isPublishedItem(item))) return null
      return gearView(item, usage, options.surface || "public-journey")
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.category.localeCompare(right.category) ||
        left.name.localeCompare(right.name)
    )
}

export function getGearItemView(gearId, options = {}) {
  const item = getGearItem(gearId)
  if (!item || (!options.includeDrafts && !isPublishedItem(item))) return null
  const usage = gearUsageRecords.filter(
    record =>
      record.gearId === gearId &&
      (options.includeDrafts || isPublishedUsage(record))
  )
  return gearView(item, usage, options.surface || "public-gear")
}

export function getGearCatalog(options = {}) {
  return gearRecords
    .map(item => getGearItemView(item.id, options))
    .filter(Boolean)
}

export function getJourneyGear(journeyId, options = {}) {
  return selectUsage(usage => usage.journeyId === journeyId, {
    ...options,
    surface: "public-journey",
  })
}

export function getVisitGear(visitId, options = {}) {
  return selectUsage(usage => usage.visitId === visitId, {
    ...options,
    surface: "public-journey",
  })
}

export function getExperienceGear(experienceId, options = {}) {
  return selectUsage(usage => usage.experienceId === experienceId, {
    ...options,
    surface: "public-journey",
  })
}

export function getMediaGear(assetId, options = {}) {
  const visibleGear = selectUsage(
    usage => (usage.mediaAssetIds || []).includes(assetId),
    { ...options, surface: "public-journey" }
  )
  const media = getMediaAsset(assetId)
  const captureGearIds = uniqueById(
    [
      media?.capture?.cameraGearId,
      media?.capture?.lensGearId,
      ...(media?.capture?.gearIds || []),
    ].map(getGearItem)
  )
  const captureGear = captureGearIds
    .map(item =>
      getGearItemView(item.id, { ...options, surface: "public-journey" })
    )
    .filter(Boolean)

  return Object.freeze({
    captureGear: Object.freeze(captureGear),
    visibleGear: Object.freeze(visibleGear),
  })
}
