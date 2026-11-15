function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'!A:ZZ`
}

function createSheetsApi(auth) {
  if (!auth?.request) {
    throw new Error("Authenticated Google client is required for Sheets reads")
  }
  return {
    spreadsheets: {
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
