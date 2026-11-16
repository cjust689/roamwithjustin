import crypto from "node:crypto"
import { NEW_PLACE_REQUEST_LABEL } from "./editorial-baseline.mjs"

export const ATLAS_CATALOG_TITLE = "Atlas Catalog"
export const ATLAS_REFERENCE_TITLE = "Atlas Reference"
export const ATLAS_CATALOG_HEADERS = Object.freeze([
  "entity_type",
  "entity_id",
  "display_label",
  "parent_id",
  "journey_id",
  "place_id",
  "owner",
  "url",
  "aliases",
])
export const ATLAS_REFERENCE_HEADERS = Object.freeze([
  "Type",
  "Journey",
  "Atlas Place",
  "Atlas Experience",
  "Visit Available",
  "Publishes To",
  "URL",
  "Entity ID",
])

const protectionDescription = "Roam With Justin automation-owned Atlas Catalog"
const referenceProtectionDescription =
  "Roam With Justin automation-owned Atlas Reference"

function cellValue(value) {
  return { userEnteredValue: { stringValue: String(value || "") } }
}

export function buildAtlasCatalogRows(catalog) {
  return catalog.records.map(record => [
    record.entityType,
    record.id,
    record.label,
    record.parentId,
    record.journeyId,
    record.placeId,
    record.owner,
    record.url,
    record.aliases.join(" | "),
  ])
}

export function buildAtlasReferenceRows(catalog) {
  const journeys = new Map(
    catalog.records
      .filter(record => record.entityType === "journey")
      .map(record => [record.id, record])
  )
  const places = new Map(
    catalog.records
      .filter(record => record.entityType === "place")
      .map(record => [record.id, record])
  )
  const visits = catalog.records.filter(record => record.entityType === "visit")
  const visitKeys = new Set(
    visits.map(record => `${record.journeyId}\u0000${record.placeId}`)
  )
  const journeyRows = [...journeys.values()].map(record => [
    "Journey",
    record.label,
    "",
    "",
    "Journey scope",
    "Journey",
    record.url,
    record.id,
  ])
  const visitRows = visits.map(record => [
    "Visit",
    journeys.get(record.journeyId)?.label || record.journeyId,
    places.get(record.placeId)?.label || record.placeId,
    "",
    "Yes",
    "Visit",
    record.url,
    record.id,
  ])
  const experienceRows = catalog.records
    .filter(record => record.entityType === "experience")
    .map(record => [
      "Experience",
      journeys.get(record.journeyId)?.label || record.journeyId,
      places.get(record.placeId)?.label || "",
      record.label,
      record.placeId &&
      visitKeys.has(`${record.journeyId}\u0000${record.placeId}`)
        ? "Yes"
        : "Journey scope",
      "Experience",
      record.url,
      record.id,
    ])
  const compare = (left, right) =>
    String(left[1]).localeCompare(String(right[1])) ||
    String(left[2]).localeCompare(String(right[2])) ||
    String(left[3]).localeCompare(String(right[3])) ||
    String(left[7]).localeCompare(String(right[7]))
  return [
    ...journeyRows.sort(compare),
    ...visitRows.sort(compare),
    ...experienceRows.sort(compare),
  ]
}

function chooseSheetId(existingSheets, createSheetId, reserved = new Set()) {
  const used = new Set([
    ...existingSheets.map(sheet => sheet.sheetId),
    ...reserved,
  ])
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = createSheetId()
    if (
      Number.isSafeInteger(candidate) &&
      candidate > 0 &&
      candidate <= 2147483647 &&
      !used.has(candidate)
    ) {
      return candidate
    }
  }
  throw new Error("Could not allocate a unique Atlas Catalog sheet ID")
}

function appendManagedReferenceRequests({
  requests,
  existing,
  sheetId,
  values,
}) {
  const requiredRows = values.length
  const requiredColumns = ATLAS_REFERENCE_HEADERS.length
  if (!existing) {
    requests.push({
      addSheet: {
        properties: {
          sheetId,
          title: ATLAS_REFERENCE_TITLE,
          hidden: false,
          gridProperties: {
            rowCount: Math.max(requiredRows, 250),
            columnCount: requiredColumns,
            frozenRowCount: 1,
          },
        },
      },
    })
  } else {
    if (requiredRows > existing.gridProperties.rowCount) {
      requests.push({
        appendDimension: {
          sheetId,
          dimension: "ROWS",
          length: requiredRows - existing.gridProperties.rowCount,
        },
      })
    }
    if (requiredColumns > existing.gridProperties.columnCount) {
      requests.push({
        appendDimension: {
          sheetId,
          dimension: "COLUMNS",
          length: requiredColumns - existing.gridProperties.columnCount,
        },
      })
    }
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: existing.gridProperties.rowCount,
          startColumnIndex: 0,
          endColumnIndex: existing.gridProperties.columnCount,
        },
        cell: {},
        fields: "userEnteredValue",
      },
    })
  }
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: requiredRows,
        startColumnIndex: 0,
        endColumnIndex: requiredColumns,
      },
      rows: values.map(row => ({ values: row.map(cellValue) })),
      fields: "userEnteredValue",
    },
  })
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: requiredColumns,
      },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: "userEnteredFormat.textFormat.bold",
    },
  })
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        hidden: false,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: "hidden,gridProperties.frozenRowCount",
    },
  })
  if (
    !existing?.protectedRanges?.some(
      protectedRange =>
        protectedRange.description === referenceProtectionDescription
    )
  ) {
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: referenceProtectionDescription,
          warningOnly: true,
        },
      },
    })
  }
}

function tableDropdown(values) {
  return {
    columnType: "DROPDOWN",
    dataValidationRule: {
      condition: {
        type: "ONE_OF_LIST",
        values: [...new Set(values.filter(Boolean))].map(userEnteredValue => ({
          userEnteredValue,
        })),
      },
    },
  }
}

function updatedTableColumnProperties({ table, postsHeaders, overrides }) {
  const existingByName = new Map(
    (table.columnProperties || []).map(property => [
      property.columnName,
      property,
    ])
  )
  const start = table.range?.startColumnIndex || 0
  return postsHeaders.map((header, index) => {
    const existing = existingByName.get(header) || {}
    const property = {
      columnIndex: index - start,
      columnName: header,
    }
    const override = overrides.get(header)
    if (override) return { ...property, ...override }
    if (existing.columnType) property.columnType = existing.columnType
    if (existing.dataValidationRule) {
      property.dataValidationRule = existing.dataValidationRule
    }
    return property
  })
}

export function buildAtlasCatalogMigration({
  catalog,
  existingSheets,
  postsSheetId,
  postsHeaders,
  postsGridRowCount,
  createSheetId = () => crypto.randomInt(1, 2147483647),
}) {
  const atlasJourneyIndex = postsHeaders.indexOf("Atlas Journey")
  const atlasPlaceIndex = postsHeaders.indexOf("Atlas Place")
  const atlasExperienceIndex = postsHeaders.indexOf("Atlas Experience")
  const publishToIndex = postsHeaders.indexOf("Publish To")
  const atlasModeIndex = postsHeaders.indexOf("Atlas Mode")
  if (atlasJourneyIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Journey header")
  }
  if (atlasExperienceIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Experience header")
  }
  if (atlasPlaceIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Place header")
  }
  if (publishToIndex < 0) {
    throw new Error("Posts Sheet is missing the Publish To header")
  }
  if (atlasModeIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Mode header")
  }

  const rows = buildAtlasCatalogRows(catalog)
  const values = [ATLAS_CATALOG_HEADERS, ...rows]
  const referenceRows = buildAtlasReferenceRows(catalog)
  const referenceValues = [ATLAS_REFERENCE_HEADERS, ...referenceRows]
  const requiredRows = values.length
  const requiredColumns = ATLAS_CATALOG_HEADERS.length
  const existing = existingSheets.find(
    sheet => sheet.title === ATLAS_CATALOG_TITLE
  )
  const existingReference = existingSheets.find(
    sheet => sheet.title === ATLAS_REFERENCE_TITLE
  )
  const postsSheet = existingSheets.find(
    sheet => sheet.sheetId === postsSheetId
  )
  const postsTables = (postsSheet?.tables || []).filter(
    table =>
      (table.range?.startRowIndex || 0) === 0 &&
      (table.range?.startColumnIndex || 0) === 0 &&
      table.range?.endColumnIndex >= postsHeaders.length
  )
  if (postsTables.length > 1) {
    throw new Error("Posts Sheet has multiple overlapping tables")
  }
  const postsTable = postsTables[0] || null
  if (
    existing &&
    !existing.protectedRanges?.some(
      protectedRange => protectedRange.description === protectionDescription
    )
  ) {
    throw new Error(
      "An existing Atlas Catalog tab is not marked as automation-owned"
    )
  }
  if (
    existingReference &&
    !existingReference.protectedRanges?.some(
      protectedRange =>
        protectedRange.description === referenceProtectionDescription
    )
  ) {
    throw new Error(
      "An existing Atlas Reference tab is not marked as automation-owned"
    )
  }
  const reservedSheetIds = new Set()
  const sheetId = existing
    ? existing.sheetId
    : chooseSheetId(existingSheets, createSheetId, reservedSheetIds)
  reservedSheetIds.add(sheetId)
  const referenceSheetId = existingReference
    ? existingReference.sheetId
    : chooseSheetId(existingSheets, createSheetId, reservedSheetIds)
  const requests = []

  if (!existing) {
    requests.push({
      addSheet: {
        properties: {
          sheetId,
          title: ATLAS_CATALOG_TITLE,
          hidden: true,
          gridProperties: {
            rowCount: Math.max(requiredRows, 250),
            columnCount: requiredColumns,
            frozenRowCount: 1,
          },
        },
      },
    })
  } else {
    if (requiredRows > existing.gridProperties.rowCount) {
      requests.push({
        appendDimension: {
          sheetId,
          dimension: "ROWS",
          length: requiredRows - existing.gridProperties.rowCount,
        },
      })
    }
    if (requiredColumns > existing.gridProperties.columnCount) {
      requests.push({
        appendDimension: {
          sheetId,
          dimension: "COLUMNS",
          length: requiredColumns - existing.gridProperties.columnCount,
        },
      })
    }
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: existing.gridProperties.rowCount,
          startColumnIndex: 0,
          endColumnIndex: existing.gridProperties.columnCount,
        },
        cell: {},
        fields: "userEnteredValue",
      },
    })
  }

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: requiredRows,
        startColumnIndex: 0,
        endColumnIndex: requiredColumns,
      },
      rows: values.map(row => ({ values: row.map(cellValue) })),
      fields: "userEnteredValue",
    },
  })
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: requiredColumns,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true },
        },
      },
      fields: "userEnteredFormat.textFormat.bold",
    },
  })
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        hidden: true,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: "hidden,gridProperties.frozenRowCount",
    },
  })
  if (
    !existing?.protectedRanges?.some(
      protectedRange => protectedRange.description === protectionDescription
    )
  ) {
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: protectionDescription,
          warningOnly: true,
        },
      },
    })
  }

  appendManagedReferenceRequests({
    requests,
    existing: existingReference,
    sheetId: referenceSheetId,
    values: referenceValues,
  })

  const journeyRowNumbers = rows
    .map((row, index) => ({ entityType: row[0], rowNumber: index + 2 }))
    .filter(row => row.entityType === "journey")
    .map(row => row.rowNumber)
  if (!journeyRowNumbers.length) {
    throw new Error("Canonical catalog contains no Journey choices")
  }
  const journeyStart = Math.min(...journeyRowNumbers)
  const journeyEnd = Math.max(...journeyRowNumbers)
  if (!postsTable)
    requests.push({
      setDataValidation: {
        range: {
          sheetId: postsSheetId,
          startRowIndex: 1,
          endRowIndex: postsGridRowCount,
          startColumnIndex: atlasJourneyIndex,
          endColumnIndex: atlasJourneyIndex + 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_RANGE",
            values: [
              {
                userEnteredValue: `='${ATLAS_CATALOG_TITLE}'!$C$${journeyStart}:$C$${journeyEnd}`,
              },
            ],
          },
          strict: false,
          showCustomUi: true,
        },
      },
    })

  const visitReferenceRowNumbers = referenceRows
    .map((row, index) => ({ entityType: row[0], rowNumber: index + 2 }))
    .filter(row => row.entityType === "Visit")
    .map(row => row.rowNumber)
  if (!visitReferenceRowNumbers.length) {
    throw new Error("Canonical catalog contains no Visit choices")
  }
  const visitReferenceStart = Math.min(...visitReferenceRowNumbers)
  const visitReferenceEnd = Math.max(...visitReferenceRowNumbers)
  if (!postsTable)
    requests.push({
      setDataValidation: {
        range: {
          sheetId: postsSheetId,
          startRowIndex: 1,
          endRowIndex: postsGridRowCount,
          startColumnIndex: atlasPlaceIndex,
          endColumnIndex: atlasPlaceIndex + 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_RANGE",
            values: [
              {
                userEnteredValue: `='${ATLAS_REFERENCE_TITLE}'!$C$${visitReferenceStart}:$C$${visitReferenceEnd}`,
              },
            ],
          },
          strict: false,
          showCustomUi: true,
        },
      },
    })
  if (!postsTable)
    requests.push({
      setDataValidation: {
        range: {
          sheetId: postsSheetId,
          startRowIndex: 1,
          endRowIndex: postsGridRowCount,
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

  const experienceRowNumbers = rows
    .map((row, index) => ({ entityType: row[0], rowNumber: index + 2 }))
    .filter(row => row.entityType === "experience")
    .map(row => row.rowNumber)
  if (experienceRowNumbers.length) {
    const experienceStart = Math.min(...experienceRowNumbers)
    const experienceEnd = Math.max(...experienceRowNumbers)
    if (!postsTable)
      requests.push({
        setDataValidation: {
          range: {
            sheetId: postsSheetId,
            startRowIndex: 1,
            endRowIndex: postsGridRowCount,
            startColumnIndex: atlasExperienceIndex,
            endColumnIndex: atlasExperienceIndex + 1,
          },
          rule: {
            condition: {
              type: "ONE_OF_RANGE",
              values: [
                {
                  userEnteredValue: `='${ATLAS_CATALOG_TITLE}'!$C$${experienceStart}:$C$${experienceEnd}`,
                },
              ],
            },
            strict: false,
            showCustomUi: true,
          },
        },
      })
  }

  if (postsTable) {
    const journeyChoices = journeyRowNumbers.map(
      rowNumber => rows[rowNumber - 2][2]
    )
    const placeChoices = [
      ...visitReferenceRowNumbers.map(
        rowNumber => referenceRows[rowNumber - 2][2]
      ),
      NEW_PLACE_REQUEST_LABEL,
    ]
    requests.push({
      updateTable: {
        table: {
          tableId: postsTable.tableId,
          columnProperties: updatedTableColumnProperties({
            table: postsTable,
            postsHeaders,
            overrides: new Map([
              ["Publish To", tableDropdown(["Social", "Atlas", "Both"])],
              ["Atlas Journey", tableDropdown(journeyChoices)],
              ["Atlas Place", tableDropdown(placeChoices)],
              ["Atlas Mode", tableDropdown(["Off", "Preview", "Publish"])],
            ]),
          }),
        },
        fields: "columnProperties",
      },
    })
  }

  return {
    sheetId,
    referenceSheetId,
    requests,
    values,
    referenceValues,
    summary: {
      createdSheet: !existing,
      createdReferenceSheet: !existingReference,
      catalogRecords: rows.length,
      referenceRecords: referenceRows.length,
      journeyChoices: journeyRowNumbers.length,
      placeChoices: visitReferenceRowNumbers.length,
      experienceChoices: experienceRowNumbers.length,
      requestCount: requests.length,
    },
  }
}

export async function applyAtlasCatalogMigration({
  auth,
  spreadsheetId,
  requests,
  request = null,
}) {
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

export function buildBindingReport({ catalog, baselinePlan }) {
  const records = baselinePlan.eligibleRows
    .map(row => ({
      postId: row.postId,
      sourceHash: row.sourceHash,
      locationInput: row.place.input,
      journeyInput: row.journey.input,
      currentJourneyId: row.currentJourneyId,
      placeStatus: row.place.status,
      currentPlaceId: row.currentPlaceId,
      candidates: row.place.matches.map(match => ({
        placeId: match.id,
        label: match.label,
        url: match.url,
      })),
    }))
    .sort((left, right) => left.postId.localeCompare(right.postId))

  return {
    schemaVersion: 1,
    catalogHash: crypto
      .createHash("sha256")
      .update(JSON.stringify(catalog))
      .digest("hex"),
    summary: {
      rows: records.length,
      exact: records.filter(record => record.placeStatus === "matched").length,
      ambiguous: records.filter(record => record.placeStatus === "ambiguous")
        .length,
      unmatched: records.filter(record => record.placeStatus === "unmatched")
        .length,
      blank: records.filter(record => record.placeStatus === "blank").length,
    },
    records,
  }
}
