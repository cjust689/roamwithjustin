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

function tableColumnProperties({ table, finalHeaders, overrides }) {
  const start = table.range?.startColumnIndex || 0
  const existingByName = new Map(
    (table.columnProperties || []).map(property => [
      property.columnName === "Publish To:"
        ? "Publish To"
        : property.columnName,
      property,
    ])
  )
  return finalHeaders.map((header, index) => {
    const existing = existingByName.get(header) || {}
    const override = overrides.get(header)
    const property = {
      columnIndex: index - start,
      columnName: header,
    }
    if (override) return { ...property, ...override }
    if (existing.columnType) property.columnType = existing.columnType
    if (existing.dataValidationRule) {
      property.dataValidationRule = existing.dataValidationRule
    }
    return property
  })
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
  placeLabelById = new Map(),
  tables = [],
}) {
  if (headers.includes("Publish To") && headers.includes("Publish To:")) {
    throw new Error("Posts Sheet has both Publish To and Publish To: headers")
  }
  const renamedHeaders = headers
    .map((header, index) => ({ header, index }))
    .filter(entry => entry.header === "Publish To:")
    .map(entry => ({ ...entry, value: "Publish To" }))
  const effectiveHeaders = headers.map(header =>
    header === "Publish To:" ? "Publish To" : header
  )
  const schema = validatePostsHeaders(effectiveHeaders)
  if (schema.missingExisting.length) {
    throw new Error(
      `Posts Sheet is missing existing header(s): ${schema.missingExisting.join(", ")}`
    )
  }
  assertNoDuplicatePostIds(rows)

  const existingAutomation = AUTOMATION_POST_HEADERS.filter(header =>
    effectiveHeaders.includes(header)
  )
  if (existingAutomation.length && schema.missingAutomation.length) {
    throw new Error("Posts Sheet has a partial automation schema")
  }
  const automationStart = effectiveHeaders.indexOf(AUTOMATION_POST_HEADERS[0])
  const insertedAtlasHeaders = automationStart >= 0 ? schema.missingAtlas : []
  const appendedHeaders =
    automationStart >= 0
      ? schema.missingAutomation
      : [...schema.missingAtlas, ...schema.missingAutomation]
  const finalHeaders =
    automationStart >= 0
      ? [
          ...effectiveHeaders.slice(0, automationStart),
          ...insertedAtlasHeaders,
          ...effectiveHeaders.slice(automationStart),
          ...schema.missingAutomation,
        ]
      : [...effectiveHeaders, ...appendedHeaders]
  const atlasModeIndex = finalHeaders.indexOf("Atlas Mode")
  const publishToIndex = finalHeaders.indexOf("Publish To")
  const atlasPlaceIndex = finalHeaders.indexOf("Atlas Place")
  const postIdIndex = finalHeaders.indexOf("post_id")
  const automationIndices = AUTOMATION_POST_HEADERS.map(header =>
    finalHeaders.indexOf(header)
  )
  const matchingTables = tables.filter(
    table =>
      (table.range?.startRowIndex || 0) === 0 &&
      (table.range?.startColumnIndex || 0) === 0 &&
      table.range?.endColumnIndex >= effectiveHeaders.length
  )
  if (matchingTables.length > 1) {
    throw new Error("Posts Sheet has multiple overlapping tables")
  }
  const postsTable = matchingTables[0] || null
  if (
    atlasModeIndex < 0 ||
    publishToIndex < 0 ||
    atlasPlaceIndex < 0 ||
    postIdIndex < 0 ||
    automationIndices.includes(-1)
  ) {
    throw new Error("Migration could not resolve the managed Sheet columns")
  }

  const eligible = normalizeText(eligibleAccount)
  const eligibleRows = rows
    .map((row, index) => ({ row, rowIndex: index + 1, rowNumber: index + 2 }))
    .filter(entry => normalizeText(entry.row.Account) === eligible)
  const idAssignments = []
  const modeDefaults = []
  const publishToDefaults = []
  const atlasPlaceDefaults = []

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
    if (
      !String(entry.row["Publish To"] || entry.row["Publish To:"] || "").trim()
    ) {
      publishToDefaults.push({
        rowNumber: entry.rowNumber,
        value: "Social",
      })
    }
    if (
      !String(entry.row["Atlas Place"] || "").trim() &&
      String(entry.row.visit_id || "").trim()
    ) {
      const placeLabel = placeLabelById.get(
        String(entry.row.place_id || "").trim()
      )
      if (placeLabel) {
        atlasPlaceDefaults.push({
          rowNumber: entry.rowNumber,
          value: placeLabel,
        })
      }
    }
  }

  const requests = []
  const requiredColumnCount = finalHeaders.length
  const hasMigrationChanges = Boolean(
    insertedAtlasHeaders.length ||
      appendedHeaders.length ||
      renamedHeaders.length ||
      idAssignments.length ||
      modeDefaults.length ||
      publishToDefaults.length ||
      atlasPlaceDefaults.length
  )
  if (!hasMigrationChanges) {
    return {
      requests,
      finalHeaders,
      idAssignments,
      modeDefaults,
      publishToDefaults,
      atlasPlaceDefaults,
      summary: {
        eligibleRows: eligibleRows.length,
        ignoredRows: rows.length - eligibleRows.length,
        visibleHeadersAdded: 0,
        automationHeadersAdded: 0,
        postIdsAssigned: 0,
        atlasModesDefaultedOff: 0,
        publishTargetsDefaultedSocial: 0,
        atlasPlacesBackfilled: 0,
        requestCount: 0,
      },
    }
  }
  if (insertedAtlasHeaders.length) {
    requests.push({
      insertDimension: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: automationStart,
          endIndex: automationStart + insertedAtlasHeaders.length,
        },
        inheritFromBefore: false,
      },
    })
  }
  renamedHeaders.forEach(assignment => {
    requests.push(
      updateCellRequest({
        sheetId,
        rowIndex: 0,
        columnIndex: assignment.index,
        value: assignment.value,
      })
    )
  })
  const columnCountAfterInsertion =
    gridColumnCount + insertedAtlasHeaders.length
  if (requiredColumnCount > columnCountAfterInsertion) {
    requests.push({
      appendDimension: {
        sheetId,
        dimension: "COLUMNS",
        length: requiredColumnCount - columnCountAfterInsertion,
      },
    })
  }
  if (insertedAtlasHeaders.length) {
    requests.push({
      updateCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: automationStart,
          endColumnIndex: automationStart + insertedAtlasHeaders.length,
        },
        rows: [{ values: insertedAtlasHeaders.map(cellValue) }],
        fields: "userEnteredValue",
      },
    })
  }
  if (appendedHeaders.length) {
    const appendStart = finalHeaders.length - appendedHeaders.length
    requests.push({
      updateCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: appendStart,
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
  publishToDefaults.forEach(assignment => {
    requests.push(
      updateCellRequest({
        sheetId,
        rowIndex: assignment.rowNumber - 1,
        columnIndex: publishToIndex,
        value: assignment.value,
      })
    )
  })
  atlasPlaceDefaults.forEach(assignment => {
    requests.push(
      updateCellRequest({
        sheetId,
        rowIndex: assignment.rowNumber - 1,
        columnIndex: atlasPlaceIndex,
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
  if (postsTable) {
    const dropdown = values => ({
      columnType: "DROPDOWN",
      dataValidationRule: {
        condition: {
          type: "ONE_OF_LIST",
          values: values.map(userEnteredValue => ({ userEnteredValue })),
        },
      },
    })
    requests.push({
      updateTable: {
        table: {
          tableId: postsTable.tableId,
          range: {
            ...postsTable.range,
            endColumnIndex:
              (postsTable.range?.startColumnIndex || 0) + finalHeaders.length,
          },
          columnProperties: tableColumnProperties({
            table: postsTable,
            finalHeaders,
            overrides: new Map([
              ["Publish To", dropdown(["Social", "Atlas", "Both"])],
              ["Atlas Mode", dropdown(["Off", "Preview", "Publish"])],
            ]),
          }),
        },
        fields: "range,columnProperties",
      },
    })
  } else {
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
    requests.push({
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: Math.max(gridRowCount, rows.length + 1),
          startColumnIndex: publishToIndex,
          endColumnIndex: publishToIndex + 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: ["Social", "Atlas", "Both"].map(userEnteredValue => ({
              userEnteredValue,
            })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    })
  }

  const automationRanges = contiguousRanges(automationIndices)
  if (schema.missingAutomation.length)
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
    publishToDefaults,
    atlasPlaceDefaults,
    summary: {
      eligibleRows: eligibleRows.length,
      ignoredRows: rows.length - eligibleRows.length,
      visibleHeadersAdded: schema.missingAtlas.length,
      automationHeadersAdded: schema.missingAutomation.length,
      postIdsAssigned: idAssignments.length,
      atlasModesDefaultedOff: modeDefaults.length,
      publishTargetsDefaultedSocial: publishToDefaults.length,
      atlasPlacesBackfilled: atlasPlaceDefaults.length,
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
