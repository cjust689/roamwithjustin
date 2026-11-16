function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function updateCellRequest({ sheetId, rowNumber, columnIndex, value }) {
  return {
    updateCells: {
      range: {
        sheetId,
        startRowIndex: rowNumber - 1,
        endRowIndex: rowNumber,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      rows: [
        {
          values: [{ userEnteredValue: { stringValue: String(value) } }],
        },
      ],
      fields: "userEnteredValue",
    },
  }
}

function resolvePlace(selection, catalog) {
  const normalized = normalizeText(selection)
  const matches = catalog.records.filter(
    record =>
      record.entityType === "place" &&
      record.aliases.some(alias => normalizeText(alias) === normalized)
  )
  if (matches.length !== 1) {
    throw new Error(
      `Reviewed Place "${selection}" resolves to ${matches.length} canonical records`
    )
  }
  return matches[0]
}

function parseMissingVisitApprovals(approvals) {
  const byPostId = new Map()
  approvals.forEach(approval => {
    if (!approval.postId || !approval.placeId) {
      throw new Error("Missing-Visit approval requires postId and placeId")
    }
    const existing = byPostId.get(approval.postId)
    if (existing && existing !== approval.placeId) {
      throw new Error(
        `Conflicting missing-Visit approvals for ${approval.postId}`
      )
    }
    byPostId.set(approval.postId, approval.placeId)
  })
  return byPostId
}

export function buildReviewedPlaceDecisions({
  csvRows,
  suggestionReport,
  catalog,
  journeys,
  approvedMissingVisits = [],
}) {
  if (csvRows.length !== suggestionReport.rows.length) {
    throw new Error(
      `Reviewed CSV has ${csvRows.length} rows; expected ${suggestionReport.rows.length}`
    )
  }
  const reportByPostId = new Map(
    suggestionReport.rows.map(row => [row.postId, row])
  )
  const journeyById = new Map(journeys.map(journey => [journey.id, journey]))
  const missingVisitApprovals = parseMissingVisitApprovals(
    approvedMissingVisits
  )
  const seen = new Set()
  const decisions = []

  csvRows.forEach(csvRow => {
    const postId = String(csvRow.post_id || "").trim()
    if (!postId || seen.has(postId)) {
      throw new Error(
        `Reviewed CSV has a missing or duplicate post_id: ${postId}`
      )
    }
    seen.add(postId)
    const reviewed = reportByPostId.get(postId)
    if (!reviewed) {
      throw new Error(`Reviewed CSV contains unknown post_id ${postId}`)
    }
    if (
      String(csvRow.sheet_row) !== String(reviewed.sheetRow) ||
      String(csvRow.series_post || "") !== String(reviewed.postLabel || "") ||
      String(csvRow.journey || "") !== String(reviewed.journeyLabel || "")
    ) {
      throw new Error(`Reviewed CSV identity columns changed for ${postId}`)
    }

    const selection = String(csvRow.location || "").trim()
    if (
      !selection ||
      normalizeText(selection) === normalizeText(reviewed.locationInput)
    ) {
      throw new Error(
        `Reviewed CSV still has unresolved Location "${selection}" for ${postId}`
      )
    }
    const place = resolvePlace(selection, catalog)
    const journey = journeyById.get(reviewed.journeyId)
    if (!journey) {
      throw new Error(
        `Reviewed row ${postId} has unknown Journey ${reviewed.journeyId}`
      )
    }
    const visit = (journey.visits || []).find(
      candidate => candidate.placeId === place.id
    )
    const approvedMissingPlaceId = missingVisitApprovals.get(postId)
    if (!visit && approvedMissingPlaceId !== place.id) {
      throw new Error(
        `Reviewed Place ${place.id} is not visited by ${journey.id}; explicit missing-Visit approval is required for ${postId}`
      )
    }
    if (visit && approvedMissingPlaceId) {
      throw new Error(
        `Missing-Visit approval is unnecessary for ${postId}; ${journey.id} already has a Visit`
      )
    }

    decisions.push({
      postId,
      reviewedSheetRow: reviewed.sheetRow,
      sourceHash: reviewed.sourceHash,
      originalLocation: reviewed.locationInput,
      selectedPlaceId: place.id,
      selectedPlaceLabel: place.label,
      journeyId: journey.id,
      visitId: visit?.id || null,
      requiresVisit: !visit,
    })
  })

  const unusedApprovals = [...missingVisitApprovals.keys()].filter(
    postId => !seen.has(postId)
  )
  if (unusedApprovals.length) {
    throw new Error(
      `Missing-Visit approval references unknown reviewed row(s): ${unusedApprovals.join(", ")}`
    )
  }

  decisions.sort(
    (left, right) => left.reviewedSheetRow - right.reviewedSheetRow
  )
  return {
    schemaVersion: 1,
    suggestionReportHash: suggestionReport.reportHash,
    summary: {
      decisions: decisions.length,
      existingJourneyVisits: decisions.filter(
        decision => !decision.requiresVisit
      ).length,
      approvedMissingVisits: decisions.filter(
        decision => decision.requiresVisit
      ).length,
    },
    decisions,
  }
}

export function buildReviewedPlaceBindingMigration({
  sheetId,
  headers,
  rows,
  baselinePlan,
  decisionReport,
}) {
  const placeIdIndex = headers.indexOf("place_id")
  if (placeIdIndex < 0) {
    throw new Error("Posts Sheet is missing the place_id automation column")
  }
  const plannedByPostId = new Map(
    baselinePlan.eligibleRows.map(row => [row.postId, row])
  )
  const assignments = []
  let alreadyApplied = 0

  decisionReport.decisions.forEach(decision => {
    const plannedRow = plannedByPostId.get(decision.postId)
    if (!plannedRow) {
      throw new Error(
        `Reviewed post_id is no longer eligible: ${decision.postId}`
      )
    }
    if (plannedRow.sourceHash !== decision.sourceHash) {
      throw new Error(
        `Source changed after Place review for post_id ${decision.postId}`
      )
    }
    if (plannedRow.currentJourneyId !== decision.journeyId) {
      throw new Error(
        `Journey binding changed after Place review for post_id ${decision.postId}`
      )
    }
    const sourceRow = rows[plannedRow.diagnosticRow - 2]
    const currentPlaceId = String(sourceRow?.place_id || "").trim()
    if (currentPlaceId && currentPlaceId !== decision.selectedPlaceId) {
      throw new Error(
        `Conflicting place_id on post_id ${decision.postId}: ${currentPlaceId}`
      )
    }
    if (currentPlaceId === decision.selectedPlaceId) {
      alreadyApplied += 1
      return
    }
    assignments.push({
      postId: decision.postId,
      rowNumber: plannedRow.diagnosticRow,
      placeId: decision.selectedPlaceId,
      placeLabel: decision.selectedPlaceLabel,
      journeyId: decision.journeyId,
      visitId: decision.visitId,
      requiresVisit: decision.requiresVisit,
    })
  })

  return {
    assignments,
    requests: assignments.map(assignment =>
      updateCellRequest({
        sheetId,
        rowNumber: assignment.rowNumber,
        columnIndex: placeIdIndex,
        value: assignment.placeId,
      })
    ),
    summary: {
      assignments: assignments.length,
      alreadyApplied,
      approvedMissingVisits: decisionReport.summary.approvedMissingVisits,
    },
  }
}
