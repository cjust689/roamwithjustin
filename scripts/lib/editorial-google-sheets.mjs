function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'!A:ZZ`
}

function createSheetsApi(auth) {
  if (!auth?.request) {
    throw new Error("Authenticated Google client is required for Sheets reads")
  }
  return {
    spreadsheets: {
      get: request => {
        const url = new URL(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(request.spreadsheetId)}`
        )
        url.searchParams.set("fields", request.fields)
        if (request.includeGridData !== undefined) {
          url.searchParams.set(
            "includeGridData",
            String(request.includeGridData)
          )
        }
        ;(request.ranges || []).forEach(range =>
          url.searchParams.append("ranges", range)
        )
        return auth.request({ method: "GET", url: url.toString() })
      },
      values: {
        batchGet: request => {
          const url = new URL(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(request.spreadsheetId)}/values:batchGet`
          )
          request.ranges.forEach(range =>
            url.searchParams.append("ranges", range)
          )
          url.searchParams.set("majorDimension", request.majorDimension)
          url.searchParams.set("valueRenderOption", request.valueRenderOption)
          return auth.request({ method: "GET", url: url.toString() })
        },
      },
    },
  }
}

export async function readSpreadsheetSheets({
  auth,
  spreadsheetId,
  sheetsApi = null,
}) {
  const api = sheetsApi || createSheetsApi(auth)
  const response = await api.spreadsheets.get({
    spreadsheetId,
    fields:
      "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount)),protectedRanges(protectedRangeId,description,warningOnly,range),tables(tableId,name,range,columnProperties(columnIndex,columnName,columnType,dataValidationRule(condition(type,values)))))",
  })
  return (response.data?.sheets || []).map(sheet => ({
    ...sheet.properties,
    protectedRanges: sheet.protectedRanges || [],
    tables: sheet.tables || [],
  }))
}

export async function resolveSheetTitle({
  auth,
  spreadsheetId,
  sheetId,
  sheetsApi = null,
}) {
  const numericSheetId = Number(sheetId)
  if (!Number.isSafeInteger(numericSheetId) || numericSheetId < 0) {
    throw new Error("Google Sheet gid must be a non-negative integer")
  }

  const api = sheetsApi || createSheetsApi(auth)
  const response = await api.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,index,hidden))",
  })
  const sheet = (response.data?.sheets || []).find(
    entry => entry.properties?.sheetId === numericSheetId
  )
  if (!sheet?.properties?.title) {
    throw new Error(`No Google Sheet tab has gid ${numericSheetId}`)
  }
  return sheet.properties.title
}

export async function readSheetStructure({
  auth,
  spreadsheetId,
  sheetId,
  sheetsApi = null,
}) {
  const numericSheetId = Number(sheetId)
  if (!Number.isSafeInteger(numericSheetId) || numericSheetId < 0) {
    throw new Error("Google Sheet gid must be a non-negative integer")
  }
  const api = sheetsApi || createSheetsApi(auth)
  const response = await api.spreadsheets.get({
    spreadsheetId,
    fields:
      "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount)),tables(tableId,name,range,columnProperties(columnIndex,columnName,columnType,dataValidationRule(condition(type,values)))))",
  })
  const sheet = (response.data?.sheets || []).find(
    entry => entry.properties?.sheetId === numericSheetId
  )
  const properties = sheet?.properties
  if (!properties?.title || !properties.gridProperties) {
    throw new Error(`No Google Sheet tab has gid ${numericSheetId}`)
  }
  return { ...properties, tables: sheet.tables || [] }
}

export function normalizeSheetValues(values = []) {
  if (!values.length) return { headers: [], rows: [] }

  const headers = values[0].map(value => String(value || "").trim())
  const duplicates = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index
  )
  if (duplicates.length) {
    throw new Error(
      `Posts sheet contains duplicate header(s): ${[...new Set(duplicates)].join(", ")}`
    )
  }
  if (headers.some(header => !header)) {
    throw new Error(
      "Posts sheet contains a blank header inside the requested range"
    )
  }

  return {
    headers,
    rows: values
      .slice(1)
      .map(row =>
        Object.fromEntries(
          headers.map((header, index) => [header, String(row[index] || "")])
        )
      ),
  }
}

export async function readPostsSheet({
  auth,
  spreadsheetId,
  postsRange = "Posts",
  sheetsApi = null,
}) {
  const api = sheetsApi || createSheetsApi(auth)
  const response = await api.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [quoteSheetName(postsRange)],
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  })
  const values = response.data?.valueRanges?.[0]?.values || []
  return normalizeSheetValues(values)
}
