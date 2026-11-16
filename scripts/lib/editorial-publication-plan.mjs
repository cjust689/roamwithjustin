import crypto from "node:crypto"

const supportedModes = new Set(["Preview", "Publish"])

function required(row, field) {
  const value = String(row?.[field] || "").trim()
  if (!value) throw new Error(`Selected post is missing ${field}`)
  return value
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
    throw new Error(`Post ${required(selected.row, "post_id")} is not approved with Atlas Mode Publish`)
  }
  if (!apply && !supportedModes.has(mode)) {
    throw new Error(`Post ${required(selected.row, "post_id")} is not in Preview or Publish mode`)
  }
  for (const field of ["post_id", "journey_id", "Drive Folder"]) {
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
    throw new Error("Drive inventory fingerprint must be a 64 character SHA-256")
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

export function publicObjectUrl(objectKey, baseUrl = "https://media.roamwithjustin.com") {
  const encoded = String(objectKey || "")
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")
  if (!encoded) throw new Error("A media object key is required")
  return `${baseUrl.replace(/\/+$/, "")}/${encoded}`
}
