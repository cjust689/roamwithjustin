import crypto from "node:crypto"

export const ATLAS_CATALOG_TITLE = "Atlas Catalog"
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

const protectionDescription = "Roam With Justin automation-owned Atlas Catalog"

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

function chooseSheetId(existingSheets, createSheetId) {
  const used = new Set(existingSheets.map(sheet => sheet.sheetId))
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

export function buildAtlasCatalogMigration({
  catalog,
  existingSheets,
  postsSheetId,
  postsHeaders,
  postsGridRowCount,
  createSheetId = () => crypto.randomInt(1, 2147483647),
}) {
  const atlasJourneyIndex = postsHeaders.indexOf("Atlas Journey")
  const atlasExperienceIndex = postsHeaders.indexOf("Atlas Experience")
  if (atlasJourneyIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Journey header")
  }
  if (atlasExperienceIndex < 0) {
    throw new Error("Posts Sheet is missing the Atlas Experience header")
  }

  const rows = buildAtlasCatalogRows(catalog)
  const values = [ATLAS_CATALOG_HEADERS, ...rows]
  const requiredRows = values.length
  const requiredColumns = ATLAS_CATALOG_HEADERS.length
  const existing = existingSheets.find(
    sheet => sheet.title === ATLAS_CATALOG_TITLE
  )
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
  const sheetId = existing
    ? existing.sheetId
    : chooseSheetId(existingSheets, createSheetId)
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

  const journeyRowNumbers = rows
    .map((row, index) => ({ entityType: row[0], rowNumber: index + 2 }))
    .filter(row => row.entityType === "journey")
    .map(row => row.rowNumber)
  if (!journeyRowNumbers.length) {
    throw new Error("Canonical catalog contains no Journey choices")
  }
  const journeyStart = Math.min(...journeyRowNumbers)
  const journeyEnd = Math.max(...journeyRowNumbers)
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

  const experienceRowNumbers = rows
    .map((row, index) => ({ entityType: row[0], rowNumber: index + 2 }))
    .filter(row => row.entityType === "experience")
    .map(row => row.rowNumber)
  if (experienceRowNumbers.length) {
    const experienceStart = Math.min(...experienceRowNumbers)
    const experienceEnd = Math.max(...experienceRowNumbers)
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

  return {
    sheetId,
    requests,
    values,
    summary: {
      createdSheet: !existing,
      catalogRecords: rows.length,
      journeyChoices: journeyRowNumbers.length,
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
