const path = require("path")
const gearContract = require("../../src/content/gear/contract.js")

const gearIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const inputItemKeys = new Set([
  "gearId",
  "usageId",
  "category",
  "brand",
  "model",
  "name",
  "description",
  "image",
  "imageAssetId",
  "aliases",
  "links",
  "verificationStatus",
  "usage",
  "usageType",
  "evidence",
  "notes",
  "whyItWorked",
  "limitations",
  "wouldBringAgain",
  "featured",
  "sortOrder",
  "visitId",
  "experienceId",
  "experienceIds",
  "mediaAssetId",
  "mediaAssetIds",
  "visibility",
  "website",
  "websiteLabel",
  "websiteVerified",
  "affiliateUrl",
  "affiliateLabel",
  "affiliateVerified",
])

function isUnknown(value) {
  if (value === null || value === undefined) return true
  if (typeof value !== "string") return false
  return ["", "unknown", "null", "none", "n/a", "tbd", "to-confirm"].includes(
    value.trim().toLowerCase().replace(/\s+/g, "-")
  )
}

function nullable(value) {
  return isUnknown(value) ? null : value
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseScalar(rawValue) {
  const value = rawValue.trim()
  if (isUnknown(value)) return null

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      return JSON.parse(value)
    } catch (error) {
      throw new Error(`Invalid inline JSON value "${value}": ${error.message}`)
    }
  }

  return value
}

function parseMarkdown(contents) {
  const lines = contents.replace(/^\uFEFF/, "").split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => line.trim())

  if (firstContentLine < 0 || lines[firstContentLine].trim() !== "---") {
    throw new Error(
      "Markdown gear input must start with YAML frontmatter (---)"
    )
  }

  const closingLine = lines.findIndex(
    (line, index) => index > firstContentLine && line.trim() === "---"
  )
  if (closingLine < 0) {
    throw new Error(
      "Markdown gear input is missing the closing frontmatter ---"
    )
  }

  const document = { items: [] }
  for (let index = firstContentLine + 1; index < closingLine; index += 1) {
    const line = lines[index].trim()
    if (!line || line.startsWith("#")) continue

    const match = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)
    if (!match) {
      throw new Error(`Invalid frontmatter on line ${index + 1}: ${line}`)
    }
    if (Object.prototype.hasOwnProperty.call(document, match[1])) {
      throw new Error(`Duplicate frontmatter field "${match[1]}"`)
    }
    document[match[1]] = parseScalar(match[2])
  }

  let item = null
  for (let index = closingLine + 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue

    const heading = line.match(/^##\s+(.+)$/)
    if (heading) {
      item = { name: heading[1].trim() }
      document.items.push(item)
      continue
    }
    if (/^#\s+/.test(line) || !line.startsWith("-")) continue
    if (!item) {
      throw new Error(
        `Gear field appears before an ## item on line ${index + 1}`
      )
    }

    const field = line.match(/^-\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)
    if (!field) {
      throw new Error(`Invalid gear field on line ${index + 1}: ${line}`)
    }
    if (!inputItemKeys.has(field[1])) {
      throw new Error(`Unknown gear field "${field[1]}" on line ${index + 1}`)
    }
    if (Object.prototype.hasOwnProperty.call(item, field[1])) {
      throw new Error(
        `Duplicate field "${field[1]}" for "${item.name}" on line ${index + 1}`
      )
    }
    item[field[1]] = parseScalar(field[2])
  }

  return document
}

function parseGearSource(contents, filename = "input.md") {
  const extension = path.extname(filename).toLowerCase()

  if (extension === ".json" || contents.trimStart().startsWith("{")) {
    let document
    try {
      document = JSON.parse(contents)
    } catch (error) {
      throw new Error(`Invalid JSON gear input: ${error.message}`)
    }
    if (!document || Array.isArray(document) || typeof document !== "object") {
      throw new Error("JSON gear input must be an object")
    }
    return document
  }

  if (extension && extension !== ".md" && extension !== ".markdown") {
    throw new Error("Gear source must be Markdown (.md) or JSON (.json)")
  }

  return parseMarkdown(contents)
}

function asList(value) {
  if (isUnknown(value)) return []
  if (Array.isArray(value)) return value.filter(item => !isUnknown(item))
  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(item => !isUnknown(item))
}

function booleanValue(value, field, owner, errors) {
  if (isUnknown(value)) return null
  if (typeof value === "boolean") return value
  errors.push(`${owner} field "${field}" must be true, false, or unknown`)
  return null
}

function numericValue(value, field, owner, errors) {
  if (isUnknown(value)) return null
  if (Number.isFinite(value)) return value
  errors.push(`${owner} field "${field}" must be a number or unknown`)
  return null
}

function hasAny(source, keys) {
  return keys.some(key => Object.prototype.hasOwnProperty.call(source, key))
}

function normalizeLinks(source, owner, errors) {
  const linkFields = [
    "links",
    "website",
    "websiteLabel",
    "websiteVerified",
    "affiliateUrl",
    "affiliateLabel",
    "affiliateVerified",
  ]
  if (!hasAny(source, linkFields)) return undefined

  if (source.links !== undefined && source.links !== null) {
    if (!Array.isArray(source.links)) {
      errors.push(`${owner} field "links" must be an array`)
      return []
    }
    return source.links.map(link => ({
      kind: nullable(link?.kind) || "retailer",
      label: nullable(link?.label) || "View product",
      url: nullable(link?.url),
      affiliate: Boolean(link?.affiliate),
      verified: Boolean(link?.verified),
    }))
  }

  const links = []
  const website = nullable(source.website)
  const affiliateUrl = nullable(source.affiliateUrl)

  if (website) {
    links.push({
      kind: "manufacturer",
      label: nullable(source.websiteLabel) || "Manufacturer website",
      url: website,
      affiliate: false,
      verified: Boolean(source.websiteVerified),
    })
  }
  if (affiliateUrl) {
    links.push({
      kind: /amazon|amzn/i.test(affiliateUrl)
        ? "amazon-associates"
        : "affiliate",
      label: nullable(source.affiliateLabel) || "View product",
      url: affiliateUrl,
      affiliate: true,
      verified: Boolean(source.affiliateVerified),
    })
  }

  return links
}

function normalizeInputItem(source, index, journeyId, errors) {
  const owner = `Item ${index + 1}${source?.name ? ` ("${source.name}")` : ""}`
  if (!source || Array.isArray(source) || typeof source !== "object") {
    errors.push(`${owner} must be an object`)
    return null
  }

  Object.keys(source).forEach(field => {
    if (!inputItemKeys.has(field)) {
      errors.push(`${owner} has unknown field "${field}"`)
    }
  })

  const rawGearId = nullable(source.gearId)
  const gearId = rawGearId ? String(rawGearId).trim() : null
  if (!gearId) {
    const suggestion = slugify(source.name)
    errors.push(
      `${owner} needs an explicit gearId${suggestion ? `; suggested ID: "${suggestion}"` : ""}`
    )
    return null
  }
  if (!gearIdPattern.test(gearId)) {
    errors.push(`${owner} gearId must be lowercase ASCII kebab-case`)
  }

  const gearPatch = {}
  ;["name", "category", "brand", "model", "description"].forEach(field => {
    const value = nullable(source[field])
    if (value !== null) gearPatch[field] = String(value).trim()
  })

  const imageAssetId = nullable(
    source.imageAssetId !== undefined
      ? source.imageAssetId
      : source.image?.assetId
  )
  if (imageAssetId) gearPatch.imageAssetId = String(imageAssetId).trim()
  if (Object.prototype.hasOwnProperty.call(source, "aliases")) {
    gearPatch.aliases = asList(source.aliases).map(value =>
      String(value).trim()
    )
  }
  if (Object.prototype.hasOwnProperty.call(source, "verificationStatus")) {
    const value = nullable(source.verificationStatus)
    if (value) gearPatch.verificationStatus = String(value).trim()
  }
  const links = normalizeLinks(source, owner, errors)
  if (links !== undefined) gearPatch.links = links

  const usageType = nullable(
    source.usageType !== undefined ? source.usageType : source.usage
  )
  if (!usageType) {
    errors.push(`${owner} needs usage or usageType`)
  }

  const visitId = nullable(source.visitId)
  const experienceIds = asList(
    source.experienceIds !== undefined
      ? source.experienceIds
      : source.experienceId
  )
  if (experienceIds.length > 1) {
    errors.push(`${owner} can reference only one experienceId per usage record`)
  }
  const mediaAssetIds = asList(source.mediaAssetIds)
  const singleMediaAssetId = nullable(source.mediaAssetId)
  if (singleMediaAssetId) mediaAssetIds.push(singleMediaAssetId)

  const scopePart = visitId || experienceIds[0] || "journey"
  const defaultUsageId = slugify(`gearuse-${journeyId}-${scopePart}-${gearId}`)
  const usageId = nullable(source.usageId) || defaultUsageId
  if (!gearIdPattern.test(usageId)) {
    errors.push(`${owner} usageId must be lowercase ASCII kebab-case`)
  }

  const usagePatch = {
    id: usageId,
    gearId,
    journeyId,
    visitId: visitId ? String(visitId).trim() : null,
    experienceId: experienceIds[0] ? String(experienceIds[0]).trim() : null,
  }
  if (usageType) usagePatch.usageType = String(usageType).trim()
  ;["evidence", "notes", "whyItWorked", "limitations", "visibility"].forEach(
    field => {
      const value = nullable(source[field])
      if (value !== null) usagePatch[field] = String(value).trim()
    }
  )
  if (Object.prototype.hasOwnProperty.call(source, "wouldBringAgain")) {
    usagePatch.wouldBringAgain = booleanValue(
      source.wouldBringAgain,
      "wouldBringAgain",
      owner,
      errors
    )
  }
  if (Object.prototype.hasOwnProperty.call(source, "featured")) {
    usagePatch.featured = booleanValue(
      source.featured,
      "featured",
      owner,
      errors
    )
  }
  if (Object.prototype.hasOwnProperty.call(source, "sortOrder")) {
    usagePatch.sortOrder = numericValue(
      source.sortOrder,
      "sortOrder",
      owner,
      errors
    )
  }
  if (
    Object.prototype.hasOwnProperty.call(source, "mediaAssetIds") ||
    Object.prototype.hasOwnProperty.call(source, "mediaAssetId")
  ) {
    usagePatch.mediaAssetIds = [...new Set(mediaAssetIds.map(String))]
  }

  return { owner, gearId, gearPatch, usagePatch }
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function createGearRecord(gearId, patch) {
  return {
    id: gearId,
    category: patch.category,
    brand: patch.brand || null,
    model: patch.model || null,
    name: patch.name,
    description: patch.description || "",
    imageAssetId: patch.imageAssetId || null,
    aliases: [...new Set(patch.aliases || [])],
    links: patch.links || [],
    verificationStatus: patch.verificationStatus || "needs-review",
  }
}

function updateGearRecord(existing, patch) {
  return {
    ...existing,
    ...patch,
    aliases: patch.aliases
      ? [...new Set([...(existing.aliases || []), ...patch.aliases])]
      : [...(existing.aliases || [])],
    links:
      patch.links !== undefined ? patch.links : [...(existing.links || [])],
  }
}

function createUsageRecord(patch) {
  return {
    id: patch.id,
    gearId: patch.gearId,
    journeyId: patch.journeyId,
    visitId: patch.visitId,
    experienceId: patch.experienceId,
    usageType: patch.usageType,
    evidence: patch.evidence || "needs-review",
    notes: patch.notes || "",
    whyItWorked: patch.whyItWorked || "",
    limitations: patch.limitations || "",
    wouldBringAgain: patch.wouldBringAgain ?? null,
    featured: patch.featured ?? false,
    sortOrder: patch.sortOrder ?? null,
    mediaAssetIds: patch.mediaAssetIds || [],
    visibility: patch.visibility || "draft",
  }
}

function normalizeIdentity(value) {
  return slugify(value)
}

function duplicateIdentity(records, gearId, patch) {
  const proposed = new Set(
    [
      patch.name,
      patch.brand && patch.model ? `${patch.brand} ${patch.model}` : null,
    ]
      .filter(Boolean)
      .map(normalizeIdentity)
  )
  if (!proposed.size) return null

  return records.find(record => {
    if (record.id === gearId) return false
    const identities = [
      record.id,
      record.name,
      record.brand && record.model ? `${record.brand} ${record.model}` : null,
      ...(record.aliases || []),
    ]
      .filter(Boolean)
      .map(normalizeIdentity)
    return identities.some(identity => proposed.has(identity))
  })
}

function validateGearRecords(records, context = {}) {
  const errors = []
  const warnings = []
  const items = Array.isArray(records?.items) ? records.items : []
  const usage = Array.isArray(records?.usage) ? records.usage : []
  const mediaById = new Map((context.media || []).map(item => [item.id, item]))
  const journeyById = new Map(
    (context.journeys || []).map(item => [item.id, item])
  )
  const itemById = new Map()
  const identityOwners = new Map()

  if (records?.schemaVersion !== gearContract.schemaVersion) {
    errors.push(
      `Gear records schemaVersion must be ${gearContract.schemaVersion}`
    )
  }
  if (!Array.isArray(records?.items)) {
    errors.push("Gear records items must be an array")
  }
  if (!Array.isArray(records?.usage)) {
    errors.push("Gear records usage must be an array")
  }

  items.forEach(item => {
    const owner = `Gear "${item?.id || "unknown"}"`
    if (!gearIdPattern.test(item?.id || "")) {
      errors.push(`${owner} has an invalid ID`)
    } else if (itemById.has(item.id)) {
      errors.push(`${owner} duplicates another gear ID`)
    } else {
      itemById.set(item.id, item)
    }
    if (!item?.name || typeof item.name !== "string") {
      errors.push(`${owner} needs a name`)
    }
    if (!gearContract.GEAR_CATEGORIES.includes(item?.category)) {
      errors.push(
        `${owner} has unsupported category "${item?.category}"; expected one of: ${gearContract.GEAR_CATEGORIES.join(", ")}`
      )
    }
    if (
      !gearContract.GEAR_VERIFICATION_STATUSES.includes(
        item?.verificationStatus
      )
    ) {
      errors.push(`${owner} has invalid verificationStatus`)
    }
    if (!Array.isArray(item?.aliases) || !Array.isArray(item?.links)) {
      errors.push(`${owner} must expose aliases and links arrays`)
    }
    ;[
      item?.id,
      item?.name,
      item?.brand && item?.model ? `${item.brand} ${item.model}` : null,
      ...(item?.aliases || []),
    ]
      .filter(Boolean)
      .forEach(identity => {
        const normalized = normalizeIdentity(identity)
        if (!normalized) {
          errors.push(`${owner} has an empty identity or alias`)
        } else if (
          identityOwners.has(normalized) &&
          identityOwners.get(normalized) !== item.id
        ) {
          errors.push(
            `${owner} identity "${identity}" conflicts with gear "${identityOwners.get(normalized)}"`
          )
        } else identityOwners.set(normalized, item.id)
      })
    ;(item?.aliases || []).forEach(alias => {
      if (typeof alias !== "string") {
        errors.push(`${owner} alias values must be strings`)
      }
    })
    ;(item?.links || []).forEach((link, index) => {
      const linkOwner = `${owner} link ${index + 1}`
      if (!link?.kind || !link?.label) {
        errors.push(`${linkOwner} needs kind and label`)
      }
      if (!/^https:\/\//i.test(link?.url || "")) {
        errors.push(`${linkOwner} must use a verified HTTPS URL`)
      }
      if (
        typeof link?.affiliate !== "boolean" ||
        typeof link?.verified !== "boolean"
      ) {
        errors.push(`${linkOwner} needs affiliate and verified booleans`)
      }
    })
    if (item?.imageAssetId) {
      const asset = mediaById.get(item.imageAssetId)
      if (!asset) {
        errors.push(`${owner} references unknown image "${item.imageAssetId}"`)
      } else if (asset.kind !== "image") {
        errors.push(`${owner} imageAssetId must reference image media`)
      }
    }
  })

  const usageIds = new Set()
  const usageScopes = new Map()
  usage.forEach(record => {
    const owner = `Gear usage "${record?.id || "unknown"}"`
    if (!gearIdPattern.test(record?.id || "")) {
      errors.push(`${owner} has an invalid ID`)
    } else if (usageIds.has(record.id)) {
      errors.push(`${owner} duplicates another usage ID`)
    } else usageIds.add(record.id)

    const item = itemById.get(record?.gearId)
    if (!item)
      errors.push(`${owner} references unknown gear "${record?.gearId}"`)
    const journey = journeyById.get(record?.journeyId)
    if (!journey) {
      errors.push(`${owner} references unknown journey "${record?.journeyId}"`)
    }
    if (
      record?.visitId &&
      !journey?.visits?.some(visit => visit.id === record.visitId)
    ) {
      errors.push(`${owner} references unknown visit "${record.visitId}"`)
    }
    if (record?.experienceId) {
      errors.push(
        `${owner} references experience "${record.experienceId}", but this repository has no canonical Experience registry yet`
      )
    }
    if (!gearContract.GEAR_USAGE_TYPES.includes(record?.usageType)) {
      errors.push(`${owner} has unsupported usageType "${record?.usageType}"`)
    }
    if (!gearContract.GEAR_EVIDENCE_STATUSES.includes(record?.evidence)) {
      errors.push(`${owner} has invalid evidence`)
    }
    if (!gearContract.GEAR_VISIBILITIES.includes(record?.visibility)) {
      errors.push(`${owner} has invalid visibility`)
    }
    if (!Array.isArray(record?.mediaAssetIds)) {
      errors.push(`${owner} mediaAssetIds must be an array`)
    }
    ;(record?.mediaAssetIds || []).forEach(assetId => {
      if (!mediaById.has(assetId)) {
        errors.push(`${owner} references unknown media "${assetId}"`)
      }
    })
    if (record?.visibility === "published") {
      if (record.evidence === "needs-review") {
        errors.push(`${owner} cannot publish needs-review evidence`)
      }
      if (item?.verificationStatus !== "verified") {
        errors.push(
          `${owner} cannot publish unverified gear "${record.gearId}"`
        )
      }
    }

    const scope = [
      record?.gearId,
      record?.journeyId,
      record?.visitId || "",
      record?.experienceId || "",
    ].join("|")
    if (usageScopes.has(scope)) {
      errors.push(
        `${owner} duplicates the scope owned by "${usageScopes.get(scope)}"`
      )
    } else usageScopes.set(scope, record?.id)
  })
  ;(context.media || []).forEach(asset => {
    const captureGearIds = [
      asset.capture?.cameraGearId,
      asset.capture?.lensGearId,
      ...(asset.capture?.gearIds || []),
    ].filter(Boolean)

    captureGearIds.forEach(gearId => {
      if (!itemById.has(gearId)) {
        errors.push(
          `Media "${asset.id}" references unknown capture gear "${gearId}"`
        )
      }
    })
  })

  return { errors, warnings }
}

function planGearIngestion({ document, journeyId, records, context }) {
  const errors = []
  const warnings = []
  const sourceJourneyId = nullable(document?.journeyId)

  Object.keys(document || {}).forEach(field => {
    if (!["schemaVersion", "journeyId", "mode", "items"].includes(field)) {
      errors.push(`Input has unknown top-level field "${field}"`)
    }
  })

  if (document?.schemaVersion !== gearContract.schemaVersion) {
    errors.push(`Input schemaVersion must be ${gearContract.schemaVersion}`)
  }
  if ((document?.mode || "upsert") !== "upsert") {
    errors.push('Only mode "upsert" is currently supported')
  }
  if (!journeyId) errors.push("--journey is required")
  if (sourceJourneyId && sourceJourneyId !== journeyId) {
    errors.push(
      `--journey "${journeyId}" conflicts with source journeyId "${sourceJourneyId}"`
    )
  }

  const journey = (context.journeys || []).find(item => item.id === journeyId)
  if (journeyId && !journey) {
    errors.push(`Unknown canonical journey "${journeyId}"`)
  }
  if (!Array.isArray(document?.items) || !document.items.length) {
    errors.push("Gear input must contain at least one item")
  }

  const initialValidation = validateGearRecords(records, context)
  errors.push(
    ...initialValidation.errors.map(error => `Existing data: ${error}`)
  )
  warnings.push(...initialValidation.warnings)

  const normalizedItems = (document?.items || [])
    .map((item, index) => normalizeInputItem(item, index, journeyId, errors))
    .filter(Boolean)
  const inputGearIds = new Set()
  const inputUsageIds = new Set()
  normalizedItems.forEach(item => {
    if (inputGearIds.has(item.gearId)) {
      errors.push(`Input duplicates gearId "${item.gearId}"`)
    }
    inputGearIds.add(item.gearId)
    if (inputUsageIds.has(item.usagePatch.id)) {
      errors.push(`Input duplicates usageId "${item.usagePatch.id}"`)
    }
    inputUsageIds.add(item.usagePatch.id)
  })

  const nextItems = (records.items || []).map(item => ({ ...item }))
  const nextUsage = (records.usage || []).map(item => ({ ...item }))
  const summary = {
    created: [],
    updated: [],
    linked: [],
    usageUpdated: [],
    unchanged: [],
    skipped: [],
  }

  normalizedItems.forEach(input => {
    const existingIndex = nextItems.findIndex(item => item.id === input.gearId)
    const existing = existingIndex >= 0 ? nextItems[existingIndex] : null
    const duplicate = duplicateIdentity(
      nextItems,
      input.gearId,
      input.gearPatch
    )

    if (duplicate) {
      errors.push(
        `${input.owner} appears to duplicate gear "${duplicate.id}"; reuse that gearId or add a reviewed alias`
      )
      summary.skipped.push(input.gearId)
      return
    }

    let nextItem
    if (existing) {
      nextItem = updateGearRecord(existing, input.gearPatch)
      nextItems[existingIndex] = nextItem
      if (deepEqual(existing, nextItem)) summary.unchanged.push(input.gearId)
      else summary.updated.push(input.gearId)
    } else {
      if (!input.gearPatch.name || !input.gearPatch.category) {
        errors.push(`${input.owner} is new and requires both name and category`)
        summary.skipped.push(input.gearId)
        return
      }
      nextItem = createGearRecord(input.gearId, input.gearPatch)
      nextItems.push(nextItem)
      summary.created.push(input.gearId)
    }

    const usageIndex = nextUsage.findIndex(
      record => record.id === input.usagePatch.id
    )
    const existingUsage = usageIndex >= 0 ? nextUsage[usageIndex] : null
    const nextUsageRecord = existingUsage
      ? { ...existingUsage, ...input.usagePatch }
      : createUsageRecord(input.usagePatch)

    if (existingUsage) {
      nextUsage[usageIndex] = nextUsageRecord
      if (deepEqual(existingUsage, nextUsageRecord)) {
        if (!summary.unchanged.includes(input.gearId)) {
          summary.unchanged.push(input.gearId)
        }
      } else summary.usageUpdated.push(nextUsageRecord.id)
    } else {
      nextUsage.push(nextUsageRecord)
      summary.linked.push(nextUsageRecord.id)
    }
  })

  const nextRecords = {
    schemaVersion: gearContract.schemaVersion,
    items: nextItems.sort((left, right) => left.id.localeCompare(right.id)),
    usage: nextUsage.sort((left, right) => left.id.localeCompare(right.id)),
  }
  const nextValidation = validateGearRecords(nextRecords, context)
  errors.push(...nextValidation.errors)
  warnings.push(...nextValidation.warnings)

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    summary,
    records: nextRecords,
    changed: !deepEqual(records, nextRecords),
  }
}

function serializeGearRecords(records) {
  return `${JSON.stringify(records, null, 2)}\n`
}

module.exports = {
  gearContract,
  parseGearSource,
  planGearIngestion,
  serializeGearRecords,
  slugify,
  validateGearRecords,
}
