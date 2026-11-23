import {
  AUTOMATION_POST_HEADERS,
  postSourceHash,
  storySourceHash,
} from "./editorial-baseline.mjs"
import { requirePublicCopy } from "./editorial-public-copy.mjs"

function cellValue(value) {
  return { userEnteredValue: { stringValue: String(value) } }
}

function updateCellRequest({ sheetId, rowIndex, columnIndex, value }) {
  return {
    updateCells: {
      range: {
        sheetId,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      rows: [{ values: [cellValue(value)] }],
      fields: "userEnteredValue",
    },
  }
}

export function buildPublicationWriteback({
  sheetId,
  headers,
  rows,
  postId,
  expectedSheetSourceHash,
  publishedSheetSourceHash = expectedSheetSourceHash,
  processedHash,
  deploymentSha,
  atlasUrl,
  atlasUrlLevel,
  verifiedAt,
  experienceId = null,
  momentId = null,
  sourceRevision = null,
  journeyId,
  placeId = "",
  visitId = "",
}) {
  const missing = AUTOMATION_POST_HEADERS.filter(
    header => !headers.includes(header)
  )
  if (missing.length) {
    throw new Error(
      `Posts Sheet is missing publication metadata: ${missing.join(", ")}`
    )
  }
  const matches = rows
    .map((row, index) => ({ row, rowIndex: index + 1, rowNumber: index + 2 }))
    .filter(entry => String(entry.row.post_id || "").trim() === postId)
  if (matches.length !== 1) {
    throw new Error(
      matches.length
        ? `Duplicate post_id ${postId} blocks publication write-back`
        : `Post ID ${postId} no longer exists in the Sheet`
    )
  }
  const target = matches[0]
  if (String(target.row["Atlas Mode"] || "").trim() !== "Publish") {
    throw new Error(
      `Post ID ${postId} is no longer approved for Atlas publication`
    )
  }
  const currentSourceHash = postSourceHash(target.row)
  if (currentSourceHash !== expectedSheetSourceHash) {
    throw new Error(`Post ID ${postId} changed after publication planning`)
  }
  if (!/^[a-f0-9]{64}$/.test(String(publishedSheetSourceHash || ""))) {
    throw new Error("publishedSheetSourceHash must be a 64 character SHA-256")
  }
  for (const [label, value] of Object.entries({
    processedHash,
    deploymentSha,
    atlasUrl,
    atlasUrlLevel,
    verifiedAt,
    journeyId,
  })) {
    if (!String(value || "").trim())
      throw new Error(`${label} is required for write-back`)
  }

  const values = {
    journey_id: journeyId,
    place_id: placeId,
    visit_id: visitId,
    atlas_status: "Published",
    atlas_url: atlasUrl,
    atlas_url_level: atlasUrlLevel,
    // Recovery may verify an unchanged published payload while a social-only
    // field has since changed. Guard the current row, retain the deployed hash.
    source_hash: publishedSheetSourceHash,
    last_processed_hash: processedHash,
    last_deployment: deploymentSha,
    last_verified_at: verifiedAt,
    sync_error: "",
    ...(experienceId ? { experience_id: experienceId } : {}),
    ...(momentId ? { moment_id: momentId } : {}),
    ...(sourceRevision ? { source_revision: sourceRevision } : {}),
  }
  const alreadyApplied = Object.entries(values).every(
    ([header, value]) => String(target.row[header] || "") === String(value)
  )
  const requests = alreadyApplied
    ? []
    : Object.entries(values).map(([header, value]) =>
        updateCellRequest({
          sheetId,
          rowIndex: target.rowIndex,
          columnIndex: headers.indexOf(header),
          value,
        })
      )
  return {
    requests,
    postId,
    rowNumber: target.rowNumber,
    currentSourceHash,
    values,
    alreadyApplied,
  }
}

export function buildAtlasStoryWriteback({
  sheetId,
  headers,
  rows,
  postId,
  expectedStorySourceHash,
  story,
}) {
  if (!headers.includes("Atlas Story")) {
    throw new Error("Posts Sheet is missing Atlas Story")
  }
  const matches = rows
    .map((row, index) => ({ row, rowIndex: index + 1, rowNumber: index + 2 }))
    .filter(entry => String(entry.row.post_id || "").trim() === postId)
  if (matches.length !== 1) {
    throw new Error(
      matches.length
        ? `Duplicate post_id ${postId} blocks Atlas Story write-back`
        : `Post ID ${postId} no longer exists in the Sheet`
    )
  }
  const target = matches[0]
  if (
    !["Preview", "Publish"].includes(
      String(target.row["Atlas Mode"] || "").trim()
    )
  ) {
    throw new Error(`Post ID ${postId} is no longer approved for Atlas preview`)
  }
  const currentSourceHash = storySourceHash(target.row)
  if (currentSourceHash !== expectedStorySourceHash) {
    throw new Error(`Post ID ${postId} changed during Atlas Story generation`)
  }
  const value = requirePublicCopy(story, "Generated Atlas Story", {
    maxLength: 2400,
  })
  return {
    requests: [
      updateCellRequest({
        sheetId,
        rowIndex: target.rowIndex,
        columnIndex: headers.indexOf("Atlas Story"),
        value,
      }),
    ],
    postId,
    rowNumber: target.rowNumber,
    currentSourceHash,
    values: { "Atlas Story": value },
  }
}

export function buildPlaceRegistrationWriteback({
  sheetId,
  headers,
  rows,
  postId,
  expectedSheetSourceHash,
  requestedPlace,
  placeLabel,
  journeyId,
  placeId,
  visitId,
}) {
  const requiredHeaders = [
    "Atlas Place",
    "post_id",
    "journey_id",
    "place_id",
    "visit_id",
    "sync_error",
  ]
  const missing = requiredHeaders.filter(header => !headers.includes(header))
  if (missing.length) {
    throw new Error(
      `Posts Sheet is missing Place registration metadata: ${missing.join(", ")}`
    )
  }
  const matches = rows
    .map((row, index) => ({ row, rowIndex: index + 1, rowNumber: index + 2 }))
    .filter(entry => String(entry.row.post_id || "").trim() === postId)
  if (matches.length !== 1) {
    throw new Error(
      matches.length
        ? `Duplicate post_id ${postId} blocks Place registration write-back`
        : `Post ID ${postId} no longer exists in the Sheet`
    )
  }
  const target = matches[0]
  const values = {
    "Atlas Place": placeLabel,
    journey_id: journeyId,
    place_id: placeId,
    visit_id: visitId,
    sync_error: "",
  }
  const alreadyApplied = Object.entries(values).every(
    ([header, value]) => String(target.row[header] || "") === String(value)
  )
  if (alreadyApplied) {
    return {
      requests: [],
      postId,
      rowNumber: target.rowNumber,
      values,
      alreadyApplied: true,
    }
  }
  if (String(target.row["Atlas Mode"] || "").trim() !== "Off") {
    throw new Error(
      `Post ID ${postId} must keep Atlas Mode Off during Place registration`
    )
  }
  if (String(target.row["Atlas Place"] || "").trim() !== requestedPlace) {
    throw new Error(`Post ID ${postId} changed its requested Atlas Place`)
  }
  const currentSourceHash = postSourceHash(target.row)
  if (currentSourceHash !== expectedSheetSourceHash) {
    throw new Error(
      `Post ID ${postId} changed after Place registration planning`
    )
  }
  return {
    requests: Object.entries(values).map(([header, value]) =>
      updateCellRequest({
        sheetId,
        rowIndex: target.rowIndex,
        columnIndex: headers.indexOf(header),
        value,
      })
    ),
    postId,
    rowNumber: target.rowNumber,
    currentSourceHash,
    values,
    alreadyApplied: false,
  }
}

export async function applyPublicationWriteback({
  auth,
  spreadsheetId,
  requests,
  request = null,
}) {
  if (!requests.length) return { data: { replies: [] } }
  const execute = request || (options => auth.request(options))
  return execute({
    method: "POST",
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    data: {
      includeSpreadsheetInResponse: false,
      requests,
    },
  })
}
