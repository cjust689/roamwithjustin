import {
  AUTOMATION_POST_HEADERS,
  postSourceHash,
} from "./editorial-baseline.mjs"

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
    source_hash: expectedSheetSourceHash,
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
