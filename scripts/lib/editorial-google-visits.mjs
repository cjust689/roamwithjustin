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
      rows: [{ values: [{ userEnteredValue: { stringValue: value } }] }],
      fields: "userEnteredValue",
    },
  }
}

export function buildVisitBindingMigration({
  sheetId,
  headers,
  rows,
  journeys,
  account = "Roam",
}) {
  const visitColumn = headers.indexOf("visit_id")
  if (visitColumn < 0) throw new Error("Posts Sheet is missing visit_id")
  const journeyById = new Map(journeys.map(journey => [journey.id, journey]))
  const assignments = []
  const blocked = []
  let alreadyApplied = 0
  rows.forEach((row, rowIndex) => {
    if (String(row.Account || "").trim() !== account) return
    const postId = String(row.post_id || "").trim()
    const journeyId = String(row.journey_id || "").trim()
    const placeId = String(row.place_id || "").trim()
    const currentVisitId = String(row.visit_id || "").trim()
    if (!postId || !journeyId || !placeId) {
      blocked.push({ postId: postId || null, rowNumber: rowIndex + 2, reason: "missing-binding" })
      return
    }
    const journey = journeyById.get(journeyId)
    const matches = (journey?.visits || []).filter(visit => visit.placeId === placeId)
    if (matches.length !== 1) {
      blocked.push({
        postId,
        rowNumber: rowIndex + 2,
        reason: matches.length ? "ambiguous-visit" : "missing-visit",
        journeyId,
        placeId,
      })
      return
    }
    const expected = matches[0].id
    if (currentVisitId && currentVisitId !== expected) {
      throw new Error(`Conflicting visit_id on post_id ${postId}: ${currentVisitId}`)
    }
    if (currentVisitId === expected) {
      alreadyApplied += 1
      return
    }
    assignments.push({ postId, rowNumber: rowIndex + 2, visitId: expected })
  })
  return {
    assignments,
    blocked,
    requests: assignments.map(assignment =>
      updateCellRequest({
        sheetId,
        rowIndex: assignment.rowNumber - 1,
        columnIndex: visitColumn,
        value: assignment.visitId,
      })
    ),
    summary: {
      assignments: assignments.length,
      alreadyApplied,
      blocked: blocked.length,
    },
  }
}

export async function applyVisitBindingMigration({ auth, spreadsheetId, requests }) {
  if (!requests.length) return { data: { replies: [] } }
  return auth.request({
    method: "POST",
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    data: { includeSpreadsheetInResponse: false, requests },
  })
}
