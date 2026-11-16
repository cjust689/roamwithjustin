import crypto from "node:crypto"

const supportedModes = new Set(["Preview", "Publish"])
const atlasDestinations = new Set(["Atlas", "Both"])

function required(row, field) {
  const value = String(row?.[field] || "").trim()
  if (!value) throw new Error(`Selected post is missing ${field}`)
  return value
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function aliasMatches(record, value) {
  const target = normalize(value)
  return (record.aliases || []).some(alias => normalize(alias) === target)
}

export function resolvePublicationTarget({ row, catalog }) {
  const publishTo = required(row, "Publish To")
  if (!atlasDestinations.has(publishTo)) {
    throw new Error(
      `Selected post has Publish To ${publishTo}; choose Atlas or Both`
    )
  }
  const journeyInput = required(row, "Atlas Journey")
  const journeyMatches = catalog.records.filter(
    record =>
      record.entityType === "journey" && aliasMatches(record, journeyInput)
  )
  if (journeyMatches.length !== 1) {
    throw new Error(
      `Atlas Journey ${journeyInput} resolved to ${journeyMatches.length} canonical Journeys`
    )
  }
  const journey = journeyMatches[0]
  const resolvedRow = {
    ...row,
    journey_id: journey.id,
    place_id: "",
    visit_id: "",
  }
  const placeInput = String(row["Atlas Place"] || "").trim()
  if (!placeInput) {
    return {
      row: resolvedRow,
      journey,
      place: null,
      visit: null,
      scope: "journey",
    }
  }
  if (/^new:\s*.+/i.test(placeInput)) {
    throw new Error(
      `Atlas Place ${placeInput} is an explicit registration request; keep Atlas Mode Off and run editorial:register:place first`
    )
  }
  const visitMatches = catalog.records.filter(
    record =>
      record.entityType === "visit" &&
      record.journeyId === journey.id &&
      aliasMatches(record, placeInput)
  )
  if (visitMatches.length > 1) {
    throw new Error(
      `Atlas Place ${placeInput} is ambiguous within ${journey.label}`
    )
  }
  if (!visitMatches.length) {
    const placeMatches = catalog.records.filter(
      record =>
        record.entityType === "place" && aliasMatches(record, placeInput)
    )
    if (placeMatches.length) {
      throw new Error(
        `Atlas Place ${placeInput} exists but ${journey.label} has no matching Visit`
      )
    }
    throw new Error(
      `Atlas Place ${placeInput} is not in the canonical Atlas Reference`
    )
  }
  const visit = visitMatches[0]
  const place = catalog.records.find(
    record => record.entityType === "place" && record.id === visit.placeId
  )
  if (!place) {
    throw new Error(
      `Visit ${visit.id} references missing Place ${visit.placeId}`
    )
  }
  resolvedRow.place_id = place.id
  resolvedRow.visit_id = visit.id
  return {
    row: resolvedRow,
    journey,
    place,
    visit,
    scope: "visit",
  }
}

export function selectPublicationRow({
  rows,
  account = "Roam",
  postId = null,
  apply = false,
}) {
  const eligible = (rows || [])
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(entry => String(entry.row.Account || "").trim() === account)
  let matches
  if (postId) {
    matches = eligible.filter(
      entry => String(entry.row.post_id || "").trim() === String(postId).trim()
    )
  } else {
    matches = eligible.filter(entry =>
      apply
        ? String(entry.row["Atlas Mode"] || "").trim() === "Publish"
        : supportedModes.has(String(entry.row["Atlas Mode"] || "").trim())
    )
  }
  if (matches.length !== 1) {
    if (postId && matches.length === 0) {
      throw new Error(`No ${account} row has post_id ${postId}`)
    }
    throw new Error(
      `Expected exactly one ${apply ? "Publish" : "Preview or Publish"} row, found ${matches.length}; use --post-id to select one`
    )
  }
  const selected = matches[0]
  const mode = String(selected.row["Atlas Mode"] || "").trim()
  if (apply && mode !== "Publish") {
    throw new Error(
      `Post ${required(selected.row, "post_id")} is not approved with Atlas Mode Publish`
    )
  }
  if (!apply && !supportedModes.has(mode)) {
    throw new Error(
      `Post ${required(selected.row, "post_id")} is not in Preview or Publish mode`
    )
  }
  for (const field of ["post_id", "Drive Folder"]) {
    required(selected.row, field)
  }
  if (
    String(selected.row.visit_id || "").trim() &&
    !String(selected.row.place_id || "").trim()
  ) {
    throw new Error("Selected post cannot bind a Visit without its Place")
  }
  return { ...selected, mode }
}

export function publicationSourceHash({ sheetSourceHash, driveFingerprint }) {
  if (!/^[a-f0-9]{64}$/.test(String(sheetSourceHash || ""))) {
    throw new Error("Sheet source hash must be a 64 character SHA-256")
  }
  if (!/^[a-f0-9]{64}$/.test(String(driveFingerprint || ""))) {
    throw new Error(
      "Drive inventory fingerprint must be a 64 character SHA-256"
    )
  }
  return crypto
    .createHash("sha256")
    .update(`sheet:${sheetSourceHash}\ndrive:${driveFingerprint}\n`)
    .digest("hex")
}

export function nextSourceRevision(row) {
  const current = String(row?.source_revision || "").trim()
  if (!current) return "1"
  if (!/^\d+$/.test(current)) {
    throw new Error(`Invalid source_revision ${current}`)
  }
  return String(Number(current) + 1)
}

export function publicObjectUrl(
  objectKey,
  baseUrl = "https://media.roamwithjustin.com"
) {
  const encoded = String(objectKey || "")
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")
  if (!encoded) throw new Error("A media object key is required")
  return `${baseUrl.replace(/\/+$/, "")}/${encoded}`
}
