import crypto from "node:crypto"
import {
  DASH_PUNCTUATION,
  requirePublicCopy,
} from "./editorial-public-copy.mjs"

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const dashPunctuation = DASH_PUNCTUATION

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function validateEditorialRecords(records, context) {
  const errors = []
  const journeyById = new Map(
    (context.journeys || []).map(item => [item.id, item])
  )
  const experienceIds = new Set()
  const slugsByJourney = new Set()
  const postIds = new Set()
  if (records?.schemaVersion !== 1)
    errors.push("Editorial records must use schema version 1")
  for (const field of ["experiences", "moments", "batches"]) {
    if (!Array.isArray(records?.[field]))
      errors.push(`Editorial field "${field}" must be an array`)
  }
  if (errors.length) return errors

  for (const experience of records.experiences) {
    const owner = `Experience "${experience?.id || "unknown"}"`
    if (
      !idPattern.test(experience?.id || "") ||
      experienceIds.has(experience.id)
    ) {
      errors.push(`${owner} has an invalid or duplicate ID`)
    }
    experienceIds.add(experience.id)
    if (!idPattern.test(experience?.slug || ""))
      errors.push(`${owner} has an invalid slug`)
    const slugKey = `${experience.journeyId}:${experience.slug}`
    if (slugsByJourney.has(slugKey))
      errors.push(`${owner} duplicates a Journey slug`)
    slugsByJourney.add(slugKey)
    const journey = journeyById.get(experience.journeyId)
    if (!journey) errors.push(`${owner} references an unknown Journey`)
    const visit = journey?.visits?.find(item => item.id === experience.visitId)
    if ((experience.placeId === null) !== (experience.visitId === null)) {
      errors.push(`${owner} must declare Place and Visit together`)
    } else if (
      experience.visitId &&
      (!visit || visit.placeId !== experience.placeId)
    ) {
      errors.push(`${owner} has an invalid Place or Visit association`)
    }
    if (!experience.title || dashPunctuation.test(experience.title)) {
      errors.push(`${owner} has invalid public title copy`)
    }
    if (experience.summary && dashPunctuation.test(experience.summary)) {
      errors.push(`${owner} has invalid public summary copy`)
    }
    if (!Number.isInteger(experience.sortOrder) || experience.sortOrder < 0) {
      errors.push(`${owner} has invalid sort order`)
    }
    if (!["draft", "published"].includes(experience.visibility)) {
      errors.push(`${owner} has invalid visibility`)
    }
  }
  for (const moment of records.moments) {
    const owner = `Moment "${moment?.id || "unknown"}"`
    if (!idPattern.test(moment?.id || ""))
      errors.push(`${owner} has an invalid ID`)
    if (!experienceIds.has(moment.experienceId))
      errors.push(`${owner} references an unknown Experience`)
    if (!moment.postId || postIds.has(moment.postId))
      errors.push(`${owner} has a missing or duplicate Post ID`)
    postIds.add(moment.postId)
    for (const field of ["title", "notes", "travelDate"]) {
      if (moment[field] && dashPunctuation.test(moment[field])) {
        errors.push(`${owner} ${field} uses dash punctuation`)
      }
    }
    if (!moment.title) errors.push(`${owner} has no title`)
    if (!Number.isInteger(moment.sortOrder) || moment.sortOrder < 0) {
      errors.push(`${owner} has invalid sort order`)
    }
    if (!["draft", "published"].includes(moment.visibility)) {
      errors.push(`${owner} has invalid visibility`)
    }
    if (!Array.isArray(moment.mediaAssetIds))
      errors.push(`${owner} has no media array`)
  }
  return errors
}

function stableId(prefix, value) {
  const slug = slugify(value)
  if (slug) return `${prefix}-${slug}`.slice(0, 120).replace(/-+$/g, "")
  return `${prefix}-${crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16)}`
}

function requireMatchingExperienceScope(experience, row) {
  const visitId = String(row.visit_id || "").trim() || null
  const placeId = visitId ? String(row.place_id || "").trim() || null : null
  if (experience.visitId !== visitId || experience.placeId !== placeId) {
    throw new Error(
      `Experience "${experience.title}" is bound to a different Atlas Place; reparent it explicitly before publishing this row`
    )
  }
}

function resolveExperience({ row, current, journeyId, visibility }) {
  const input = String(row["Atlas Experience"] || "").trim()
  if (!input) return { experience: null, created: false }
  const currentId = String(row.experience_id || "").trim()
  if (currentId) {
    const match = current.experiences.find(item => item.id === currentId)
    if (!match || match.journeyId !== journeyId) {
      throw new Error(
        `Bound experience_id "${currentId}" is invalid for this Journey`
      )
    }
    requireMatchingExperienceScope(match, row)
    return { experience: match, created: false }
  }
  const newMatch = input.match(/^new:\s*(.+)$/i)
  const requestedTitle = requirePublicCopy(
    newMatch ? newMatch[1] : input,
    "Atlas Experience"
  )
  const matches = current.experiences.filter(
    item =>
      item.journeyId === journeyId &&
      normalize(item.title) === normalize(requestedTitle)
  )
  if (matches.length > 1)
    throw new Error(`Atlas Experience "${requestedTitle}" is ambiguous`)
  if (matches.length === 1) {
    requireMatchingExperienceScope(matches[0], row)
    return { experience: matches[0], created: false }
  }
  if (!newMatch) {
    throw new Error(
      `Atlas Experience "${requestedTitle}" does not exist; prefix a new title with "New:"`
    )
  }
  const baseId = stableId(`experience-${journeyId}`, requestedTitle)
  if (current.experiences.some(item => item.id === baseId)) {
    throw new Error(`Generated Experience ID collision: ${baseId}`)
  }
  const nextSortOrder =
    current.experiences
      .filter(item => item.journeyId === journeyId)
      .reduce((maximum, item) => Math.max(maximum, item.sortOrder), -1) + 1
  return {
    created: true,
    experience: {
      id: baseId,
      slug: slugify(requestedTitle),
      journeyId,
      visitId: String(row.visit_id || "").trim() || null,
      placeId: String(row.visit_id || "").trim()
        ? String(row.place_id || "").trim() || null
        : null,
      title: requestedTitle,
      summary: "",
      sortOrder: nextSortOrder,
      visibility,
      sourceOwner: "sheet",
    },
  }
}

export function planEditorialCompilation({
  currentEditorial,
  currentMedia,
  row,
  processedHash,
  mediaBatchIds,
  journeys,
  mode = "Publish",
}) {
  if (!["Preview", "Publish"].includes(mode))
    throw new Error("Compilation mode must be Preview or Publish")
  const postId = String(row.post_id || "").trim()
  const journeyId = String(row.journey_id || "").trim()
  if (!postId || !idPattern.test(postId))
    throw new Error("A stable lowercase Post ID is required")
  const journey = journeys.find(item => item.id === journeyId)
  if (!journey)
    throw new Error(`Post references unknown Journey "${journeyId}"`)
  const placeId = String(row.place_id || "").trim()
  const visitId = String(row.visit_id || "").trim()
  if (visitId && !placeId)
    throw new Error("Post cannot bind a Visit without its Place")
  if (visitId) {
    const visit = journey.visits.find(item => item.id === visitId)
    if (!visit || visit.placeId !== placeId)
      throw new Error("Post has an invalid Place or Visit binding")
  }
  if (!processedHash || !/^[a-f0-9]{64}$/.test(processedHash)) {
    throw new Error("A combined 64 character source hash is required")
  }
  const batches = mediaBatchIds.map(batchId => {
    const batch = currentMedia.batches.find(item => item.id === batchId)
    if (!batch || batch.journeyId !== journeyId) {
      throw new Error(
        `Media batch "${batchId}" is missing or belongs to another Journey`
      )
    }
    return batch
  })
  const mediaAssetIds = [...new Set(batches.flatMap(batch => batch.assetIds))]
  if (!mediaAssetIds.length)
    throw new Error("At least one ingested Media asset is required")
  const visibility = mode === "Publish" ? "published" : "draft"
  const editorial = JSON.parse(JSON.stringify(currentEditorial))
  const media = JSON.parse(JSON.stringify(currentMedia))
  const resolved = resolveExperience({
    row,
    current: editorial,
    journeyId,
    visibility,
  })
  if (!resolved.experience) {
    return {
      changed: false,
      editorial,
      media,
      experienceId: null,
      momentId: null,
      mediaAssetIds,
      message: "Journey media has no Experience or Moment association.",
    }
  }
  if (resolved.created) editorial.experiences.push(resolved.experience)
  const experienceId = resolved.experience.id
  const momentId = stableId("moment", postId)
  const existingMoment = editorial.moments.find(item => item.postId === postId)
  if (existingMoment && existingMoment.experienceId !== experienceId) {
    throw new Error(`Post ${postId} is already assigned to another Experience`)
  }
  const momentSortOrder = existingMoment
    ? existingMoment.sortOrder
    : editorial.moments
        .filter(item => item.experienceId === experienceId)
        .reduce((maximum, item) => Math.max(maximum, item.sortOrder), -1) + 1
  const moment = {
    id: existingMoment?.id || momentId,
    experienceId,
    postId,
    title: requirePublicCopy(
      row["Moment / Angle"] || row["Series/Post"],
      "Moment / Angle"
    ),
    notes: requirePublicCopy(row["Atlas Story"], "Atlas Story"),
    travelDate: requirePublicCopy(
      row["Travel Date / Range"],
      "Travel Date / Range",
      { optional: true }
    ),
    sortOrder: momentSortOrder,
    visibility,
    mediaAssetIds,
    sourceHash: processedHash,
  }
  if (existingMoment) {
    editorial.moments.splice(
      editorial.moments.indexOf(existingMoment),
      1,
      moment
    )
  } else editorial.moments.push(moment)

  for (const placement of media.placements) {
    if (!mediaAssetIds.includes(placement.assetId)) continue
    if (placement.experienceId && placement.experienceId !== experienceId) {
      throw new Error(
        `Media placement "${placement.id}" belongs to another Experience`
      )
    }
    placement.experienceId = experienceId
  }
  const batchId = stableId(`editorial-${postId}`, processedHash.slice(0, 16))
  const previousBatch = editorial.batches.find(item => item.id === batchId)
  if (!previousBatch) {
    editorial.batches.push({
      id: batchId,
      postId,
      sourceHash: processedHash,
      experienceId,
      momentId: moment.id,
      mediaBatchIds: [...mediaBatchIds],
      mediaAssetIds,
    })
  }
  const errors = validateEditorialRecords(editorial, { journeys })
  if (errors.length)
    throw new Error(`Editorial compilation rejected:\n- ${errors.join("\n- ")}`)
  return {
    changed:
      JSON.stringify(editorial) !== JSON.stringify(currentEditorial) ||
      JSON.stringify(media) !== JSON.stringify(currentMedia),
    editorial,
    media,
    experienceId,
    momentId: moment.id,
    mediaAssetIds,
    message: resolved.created
      ? `Prepared Experience "${resolved.experience.title}" and its first Moment.`
      : `Prepared a Moment for Experience "${resolved.experience.title}".`,
  }
}

export function serializeEditorialRecords(records) {
  return `${JSON.stringify(records, null, 2)}\n`
}

export { validateEditorialRecords }
