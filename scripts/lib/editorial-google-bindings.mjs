function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
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

export function buildExactPlaceBindingMigration({
  sheetId,
  headers,
  rows,
  baselinePlan,
  bindingReport,
  approvedMappings,
}) {
  const placeIdIndex = headers.indexOf("place_id")
  if (placeIdIndex < 0) {
    throw new Error("Posts Sheet is missing the place_id automation column")
  }
  const reportByPostId = new Map(
    bindingReport.records.map(record => [record.postId, record])
  )
  const approved = new Map(
    approvedMappings.map(mapping => [
      normalizeText(mapping.locationInput),
      mapping.placeId,
    ])
  )
  if (!approved.size)
    throw new Error("At least one approved mapping is required")

  const assignments = []
  let alreadyApplied = 0
  for (const plannedRow of baselinePlan.eligibleRows) {
    const expectedPlaceId = approved.get(normalizeText(plannedRow.place.input))
    if (!expectedPlaceId) continue
    if (!plannedRow.postId) {
      throw new Error(`Approved row ${plannedRow.diagnosticRow} has no post_id`)
    }
    const reportRecord = reportByPostId.get(plannedRow.postId)
    if (!reportRecord || reportRecord.sourceHash !== plannedRow.sourceHash) {
      throw new Error(
        `Source changed after binding review for post_id ${plannedRow.postId}`
      )
    }
    if (
      plannedRow.place.status !== "matched" ||
      plannedRow.place.matches.length !== 1 ||
      plannedRow.place.matches[0].id !== expectedPlaceId
    ) {
      throw new Error(
        `Approved Place mapping no longer resolves exactly for post_id ${plannedRow.postId}`
      )
    }

    const sourceRow = rows[plannedRow.diagnosticRow - 2]
    const currentPlaceId = String(sourceRow?.place_id || "").trim()
    if (currentPlaceId && currentPlaceId !== expectedPlaceId) {
      throw new Error(
        `Conflicting place_id on post_id ${plannedRow.postId}: ${currentPlaceId}`
      )
    }
    if (currentPlaceId === expectedPlaceId) {
      alreadyApplied += 1
      continue
    }
    assignments.push({
      postId: plannedRow.postId,
      rowNumber: plannedRow.diagnosticRow,
      placeId: expectedPlaceId,
    })
  }

  const approvedLabelsFound = new Set(
    baselinePlan.eligibleRows
      .filter(row => approved.has(normalizeText(row.place.input)))
      .map(row => normalizeText(row.place.input))
  )
  const missingLabels = [...approved.keys()].filter(
    label => !approvedLabelsFound.has(label)
  )
  if (missingLabels.length) {
    throw new Error(
      `Approved mapping label(s) have no eligible rows: ${missingLabels.join(", ")}`
    )
  }

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
      approvedMappingGroups: approved.size,
    },
  }
}

export function buildJourneyBindingMigration({
  sheetId,
  headers,
  rows,
  catalog,
  baselinePlan,
  bindingReport,
  approvedMappings,
}) {
  const atlasJourneyIndex = headers.indexOf("Atlas Journey")
  const journeyIdIndex = headers.indexOf("journey_id")
  if (atlasJourneyIndex < 0 || journeyIdIndex < 0) {
    throw new Error(
      "Posts Sheet is missing Atlas Journey or journey_id columns"
    )
  }
  const reportByPostId = new Map(
    bindingReport.records.map(record => [record.postId, record])
  )
  const journeyById = new Map(
    catalog.records
      .filter(record => record.entityType === "journey")
      .map(record => [record.id, record])
  )
  const approved = new Map(
    approvedMappings.map(mapping => [
      normalizeText(mapping.locationInput),
      mapping.journeyId,
    ])
  )
  if (!approved.size)
    throw new Error("At least one approved mapping is required")

  const assignments = []
  let alreadyApplied = 0
  for (const plannedRow of baselinePlan.eligibleRows) {
    const expectedJourneyId = approved.get(
      normalizeText(plannedRow.place.input)
    )
    if (!expectedJourneyId) continue
    const journey = journeyById.get(expectedJourneyId)
    if (!journey) {
      throw new Error(`Approved Journey does not exist: ${expectedJourneyId}`)
    }
    if (!plannedRow.postId) {
      throw new Error(`Approved row ${plannedRow.diagnosticRow} has no post_id`)
    }
    const reportRecord = reportByPostId.get(plannedRow.postId)
    if (!reportRecord || reportRecord.sourceHash !== plannedRow.sourceHash) {
      throw new Error(
        `Source changed after binding review for post_id ${plannedRow.postId}`
      )
    }

    const sourceRow = rows[plannedRow.diagnosticRow - 2]
    const currentJourneyId = String(sourceRow?.journey_id || "").trim()
    const currentJourneyLabel = String(
      sourceRow?.["Atlas Journey"] || ""
    ).trim()
    if (currentJourneyId && currentJourneyId !== journey.id) {
      throw new Error(
        `Conflicting journey_id on post_id ${plannedRow.postId}: ${currentJourneyId}`
      )
    }
    if (currentJourneyLabel && currentJourneyLabel !== journey.label) {
      throw new Error(
        `Conflicting Atlas Journey on post_id ${plannedRow.postId}: ${currentJourneyLabel}`
      )
    }
    if (
      currentJourneyId === journey.id &&
      currentJourneyLabel === journey.label
    ) {
      alreadyApplied += 1
      continue
    }
    assignments.push({
      postId: plannedRow.postId,
      rowNumber: plannedRow.diagnosticRow,
      journeyId: journey.id,
      journeyLabel: journey.label,
      writeJourneyId: !currentJourneyId,
      writeJourneyLabel: !currentJourneyLabel,
    })
  }

  const approvedLabelsFound = new Set(
    baselinePlan.eligibleRows
      .filter(row => approved.has(normalizeText(row.place.input)))
      .map(row => normalizeText(row.place.input))
  )
  const missingLabels = [...approved.keys()].filter(
    label => !approvedLabelsFound.has(label)
  )
  if (missingLabels.length) {
    throw new Error(
      `Approved mapping label(s) have no eligible rows: ${missingLabels.join(", ")}`
    )
  }

  const requests = []
  assignments.forEach(assignment => {
    if (assignment.writeJourneyLabel) {
      requests.push(
        updateCellRequest({
          sheetId,
          rowNumber: assignment.rowNumber,
          columnIndex: atlasJourneyIndex,
          value: assignment.journeyLabel,
        })
      )
    }
    if (assignment.writeJourneyId) {
      requests.push(
        updateCellRequest({
          sheetId,
          rowNumber: assignment.rowNumber,
          columnIndex: journeyIdIndex,
          value: assignment.journeyId,
        })
      )
    }
  })

  return {
    assignments,
    requests,
    summary: {
      assignments: assignments.length,
      alreadyApplied,
      approvedMappingGroups: approved.size,
      cellWrites: requests.length,
    },
  }
}
