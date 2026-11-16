import { randomUUID } from "node:crypto"
import {
  ATLAS_POST_HEADERS,
  AUTOMATION_POST_HEADERS,
  EXISTING_POST_HEADERS,
  validatePostsHeaders,
} from "./editorial-baseline.mjs"

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

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

function contiguousRanges(indices) {
  const sorted = [...new Set(indices)].sort((left, right) => left - right)
  const ranges = []
  for (const index of sorted) {
    const current = ranges[ranges.length - 1]
    if (!current || index !== current.end) {
      ranges.push({ start: index, end: index + 1 })
    } else {
      current.end = index + 1
    }
  }
  return ranges
}

function assertNoDuplicatePostIds(rows) {
  const rowsById = new Map()
  rows.forEach((row, index) => {
    const postId = String(row.post_id || "").trim()
    if (!postId) return
    const rowNumbers = rowsById.get(postId) || []
    rowNumbers.push(index + 2)
    rowsById.set(postId, rowNumbers)
  })
  const duplicates = [...rowsById.entries()].filter(
    ([, rowNumbers]) => rowNumbers.length > 1
  )
  if (duplicates.length) {
    throw new Error(
      `Duplicate post_id values require review: ${duplicates
        .map(
          ([postId, rowNumbers]) => `${postId} (rows ${rowNumbers.join(", ")})`
        )
        .join("; ")}`
    )
  }
}

export function buildPostsMigration({
  sheetId,
  gridColumnCount,
  gridRowCount,
  headers,
  rows,
  eligibleAccount = "Roam",
  createPostId = randomUUID,
}) {
  const schema = validatePostsHeaders(headers)
  if (schema.missingExisting.length) {
    throw new Error(
      `Posts Sheet is missing existing header(s): ${schema.missingExisting.join(", ")}`
    )
  }
  assertNoDuplicatePostIds(rows)

  const appendedHeaders = [...schema.missingAtlas, ...schema.missingAutomation]
  const finalHeaders = [...headers, ...appendedHeaders]
  const atlasModeIndex = finalHeaders.indexOf("Atlas Mode")
  const postIdIndex = finalHeaders.indexOf("post_id")
  const automationIndices = AUTOMATION_POST_HEADERS.map(header =>
    finalHeaders.indexOf(header)
  )
  if (atlasModeIndex < 0 || postIdIndex < 0 || automationIndices.includes(-1)) {
    throw new Error("Migration could not resolve the managed Sheet columns")
  }

  const eligible = normalizeText(eligibleAccount)
  const eligibleRows = rows
    .map((row, index) => ({ row, rowIndex: index + 1, rowNumber: index + 2 }))
    .filter(entry => normalizeText(entry.row.Account) === eligible)
  const idAssignments = []
  const modeDefaults = []

  for (const entry of eligibleRows) {
    if (!String(entry.row["Atlas Mode"] || "").trim()) {
      modeDefaults.push({ rowNumber: entry.rowNumber, value: "Off" })
    }
    if (!String(entry.row.post_id || "").trim()) {
      idAssignments.push({
        rowNumber: entry.rowNumber,
        value: createPostId(),
      })
    }
  }

  const requests = []
  const requiredColumnCount = finalHeaders.length
  const hasMigrationChanges = Boolean(
    appendedHeaders.length || idAssignments.length || modeDefaults.length
  )
  if (!hasMigrationChanges) {
    return {
      requests,
      finalHeaders,
      idAssignments,
      modeDefaults,
      summary: {
        eligibleRows: eligibleRows.length,
        ignoredRows: rows.length - eligibleRows.length,
        visibleHeadersAdded: 0,
        automationHeadersAdded: 0,
        postIdsAssigned: 0,
        atlasModesDefaultedOff: 0,
        requestCount: 0,
      },
    }
  }
  if (requiredColumnCount > gridColumnCount) {
    requests.push({
      appendDimension: {
        sheetId,
        dimension: "COLUMNS",
        length: requiredColumnCount - gridColumnCount,
      },
    })
  }
  if (appendedHeaders.length) {
    requests.push({
      updateCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: headers.length,
          endColumnIndex: finalHeaders.length,
        },
        rows: [{ values: appendedHeaders.map(cellValue) }],
        fields: "userEnteredValue",
      },
    })
  }
  modeDefaults.forEach(assignment => {
    requests.push(
      updateCellRequest({
        sheetId,
        rowIndex: assignment.rowNumber - 1,
        columnIndex: atlasModeIndex,
        value: assignment.value,
      })
    )
  })
  idAssignments.forEach(assignment => {
    requests.push(
      updateCellRequest({
        sheetId,
        rowIndex: assignment.rowNumber - 1,
        columnIndex: postIdIndex,
        value: assignment.value,
      })
    )
  })

  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: "gridProperties.frozenRowCount",
    },
  })
  requests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: Math.max(gridRowCount, rows.length + 1),
        startColumnIndex: atlasModeIndex,
        endColumnIndex: atlasModeIndex + 1,
      },
      rule: {
        condition: {
          type: "ONE_OF_LIST",
          values: ["Off", "Preview", "Publish"].map(userEnteredValue => ({
            userEnteredValue,
          })),
        },
        strict: true,
        showCustomUi: true,
      },
    },
  })

  const automationRanges = contiguousRanges(automationIndices)
  automationRanges.forEach(range => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: range.start,
          endIndex: range.end,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    })
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId,
            startColumnIndex: range.start,
            endColumnIndex: range.end,
          },
          description: "Roam With Justin automation-owned metadata",
          warningOnly: true,
        },
      },
    })
  })

  return {
    requests,
    finalHeaders,
    idAssignments,
    modeDefaults,
    summary: {
      eligibleRows: eligibleRows.length,
      ignoredRows: rows.length - eligibleRows.length,
      visibleHeadersAdded: schema.missingAtlas.length,
      automationHeadersAdded: schema.missingAutomation.length,
      postIdsAssigned: idAssignments.length,
      atlasModesDefaultedOff: modeDefaults.length,
      requestCount: requests.length,
    },
  }
}

export async function applyPostsMigration({
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

export function originalFieldSnapshot(rows) {
  return rows.map(row =>
    Object.fromEntries(
      EXISTING_POST_HEADERS.map(header => [header, String(row[header] || "")])
    )
  )
}
