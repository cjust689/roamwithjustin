import crypto from "node:crypto"

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryAliases = Object.freeze({
  GB: ["uk", "u k", "great britain", "england", "united kingdom"],
  VI: [
    "usvi",
    "u s virgin islands",
    "us virgin islands",
    "virgin islands",
    "united states virgin islands",
  ],
})

const genericPlaceWords = new Set([
  "airport",
  "bay",
  "city",
  "island",
  "national",
  "park",
  "state",
  "terminal",
])

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function locationNeedles(value) {
  const normalized = normalizeText(value)
  const withoutYearHint = normalized.replace(/\s+(?:19|20)?\d{2}$/, "").trim()
  return [...new Set([normalized, withoutYearHint].filter(Boolean))]
}

function placeAncestry(place, placeById) {
  const ancestors = []
  const seen = new Set([place.id])
  let parentId = place.parentPlaceId
  while (parentId) {
    if (seen.has(parentId)) {
      throw new Error(`Place parent cycle detected at ${parentId}`)
    }
    seen.add(parentId)
    const parent = placeById.get(parentId)
    if (!parent) break
    ancestors.unshift(parent)
    parentId = parent.parentPlaceId
  }
  return ancestors
}

function geographyAliases(place, placeById) {
  const values = [
    place.countryCode,
    place.regionCode,
    ...(countryAliases[place.countryCode] || []),
  ]
  if (place.countryCode) {
    values.push(countryDisplayNames.of(place.countryCode))
  }
  placeAncestry(place, placeById).forEach(parent => {
    values.push(parent.id, parent.name)
  })
  return new Set(values.map(normalizeText).filter(Boolean))
}

function matchesLocationGeography(place, placeById, locationInput) {
  const aliases = geographyAliases(place, placeById)
  return locationNeedles(locationInput).some(needle => aliases.has(needle))
}

function evidenceText(row) {
  return normalizeText(
    [
      row["Series/Post"],
      row.Caption,
      row["Atlas Experience"],
      row["Moment / Angle"],
      row["Atlas Notes"],
      row["Travel Date / Range"],
    ]
      .filter(Boolean)
      .join(" ")
  )
}

function scoreCandidate(place, normalizedEvidence) {
  const name = normalizeText(place.name)
  const matchedTerms = []
  let score = 0

  if (name && normalizedEvidence.includes(name)) {
    score += 100
    matchedTerms.push(place.name)
  } else {
    const tokens = name
      .split(" ")
      .filter(token => token.length >= 4 && !genericPlaceWords.has(token))
    tokens.forEach(token => {
      if (normalizedEvidence.split(" ").includes(token)) {
        score += 10
        matchedTerms.push(token)
      }
    })
  }

  return { score, matchedTerms: [...new Set(matchedTerms)] }
}

function uniqueVisitCandidates(journey, placeById) {
  const byPlaceId = new Map()
  ;(journey.visits || []).forEach((visit, visitOrder) => {
    const place = placeById.get(visit.placeId)
    if (!place) {
      throw new Error(
        `Journey ${journey.id} references missing Place ${visit.placeId}`
      )
    }
    const existing = byPlaceId.get(place.id)
    if (existing) {
      existing.visitIds.push(visit.id)
      return
    }
    byPlaceId.set(place.id, {
      place,
      visitIds: [visit.id],
      visitOrder,
    })
  })
  return [...byPlaceId.values()]
}

function candidateRecord(candidate, placeById, normalizedEvidence) {
  const { place, visitIds, visitOrder } = candidate
  const evidence = scoreCandidate(place, normalizedEvidence)
  return {
    placeId: place.id,
    label: place.name,
    parentPath: placeAncestry(place, placeById).map(parent => ({
      placeId: parent.id,
      label: parent.name,
    })),
    countryCode: place.countryCode || null,
    regionCode: place.regionCode || null,
    category: place.category || null,
    evidenceStatus: place.evidenceStatus || null,
    coordinatePrecision: place.coordinatePrecision || null,
    hasCoordinates: Array.isArray(place.coordinates),
    visitIds,
    score: evidence.score,
    matchedTerms: evidence.matchedTerms,
    visitOrder,
  }
}

function suggestionStatus(candidates) {
  if (!candidates.length) return "no-candidates"
  const [first, second] = candidates
  if (first.score >= 100 && first.score > (second?.score || 0)) {
    return "strong-text-suggestion"
  }
  return candidates.length === 1
    ? "single-candidate-review"
    : "multiple-candidates"
}

function stableReportHash(report) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(report))
    .digest("hex")
}

export function buildPlaceSuggestionReport({
  rows,
  baselinePlan,
  journeys,
  places,
}) {
  const journeyById = new Map(journeys.map(journey => [journey.id, journey]))
  const placeById = new Map(places.map(place => [place.id, place]))
  const suggestions = []
  let alreadyBound = 0

  baselinePlan.eligibleRows.forEach(plannedRow => {
    if (plannedRow.currentPlaceId) {
      alreadyBound += 1
      return
    }
    const sourceRow = rows[plannedRow.diagnosticRow - 2]
    if (!sourceRow) {
      throw new Error(`Missing source row ${plannedRow.diagnosticRow}`)
    }
    const journeyId = plannedRow.currentJourneyId
    const journey = journeyById.get(journeyId)
    if (!journey) {
      throw new Error(
        `Unresolved row ${plannedRow.diagnosticRow} has no canonical Journey binding`
      )
    }

    const normalizedEvidence = evidenceText(sourceRow)
    const allJourneyCandidates = uniqueVisitCandidates(journey, placeById)
    const geographyCandidates = allJourneyCandidates.filter(candidate =>
      matchesLocationGeography(
        candidate.place,
        placeById,
        plannedRow.place.input
      )
    )
    const explicitNameCandidates = allJourneyCandidates.filter(
      candidate =>
        scoreCandidate(candidate.place, normalizedEvidence).score >= 100
    )
    const boundedCandidates = geographyCandidates.length
      ? [
          ...geographyCandidates,
          ...explicitNameCandidates.filter(
            candidate =>
              !geographyCandidates.some(
                geographic => geographic.place.id === candidate.place.id
              )
          ),
        ]
      : allJourneyCandidates
    const candidates = boundedCandidates
      .map(candidate =>
        candidateRecord(candidate, placeById, normalizedEvidence)
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.visitOrder - right.visitOrder
      )
      .map(({ visitOrder, ...candidate }) => candidate)

    suggestions.push({
      sheetRow: plannedRow.diagnosticRow,
      postId: plannedRow.postId,
      postLabel: String(sourceRow["Series/Post"] || "").trim(),
      contentType: String(sourceRow.Type || "").trim(),
      sourceHash: plannedRow.sourceHash,
      locationInput: plannedRow.place.input,
      journeyId: journey.id,
      journeyLabel: journey.title,
      candidateBasis: geographyCandidates.length
        ? explicitNameCandidates.some(
            candidate =>
              !geographyCandidates.some(
                geographic => geographic.place.id === candidate.place.id
              )
          )
          ? "journey-geography-and-explicit-name"
          : "journey-and-geography"
        : "journey-only",
      suggestionStatus: suggestionStatus(candidates),
      safeToWrite: false,
      candidates,
    })
  })

  const groupsByKey = new Map()
  suggestions.forEach(suggestion => {
    const key = `${normalizeText(suggestion.locationInput)}\u0000${suggestion.journeyId}`
    const group = groupsByKey.get(key) || {
      locationInput: suggestion.locationInput,
      journeyId: suggestion.journeyId,
      journeyLabel: suggestion.journeyLabel,
      candidateBasis: suggestion.candidateBasis,
      rowCount: 0,
      strongTextSuggestions: 0,
      candidatePlaceIds: suggestion.candidates.map(
        candidate => candidate.placeId
      ),
    }
    group.rowCount += 1
    if (suggestion.suggestionStatus === "strong-text-suggestion") {
      group.strongTextSuggestions += 1
    }
    groupsByKey.set(key, group)
  })
  const groups = [...groupsByKey.values()].sort(
    (left, right) =>
      left.journeyLabel.localeCompare(right.journeyLabel) ||
      left.locationInput.localeCompare(right.locationInput)
  )
  const report = {
    schemaVersion: 1,
    mode: "read-only-suggestions",
    summary: {
      eligibleRows: baselinePlan.eligibleRows.length,
      alreadyBound,
      unresolvedRows: suggestions.length,
      groups: groups.length,
      strongTextSuggestions: suggestions.filter(
        suggestion => suggestion.suggestionStatus === "strong-text-suggestion"
      ).length,
      reviewRequiredRows: suggestions.length,
      rowsWithoutCandidates: suggestions.filter(
        suggestion => suggestion.suggestionStatus === "no-candidates"
      ).length,
    },
    groups,
    rows: suggestions,
  }
  return { ...report, reportHash: stableReportHash(report) }
}

function csvCell(value) {
  const text = String(value ?? "")
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function formatPlaceSuggestionCsv(report) {
  const headers = [
    "sheet_row",
    "post_id",
    "series_post",
    "content_type",
    "location",
    "journey",
    "suggestion_status",
    "top_candidate",
    "matched_terms",
    "all_candidates",
    "safe_to_write",
  ]
  const rows = report.rows.map(row => {
    const top = row.candidates[0]
    return [
      row.sheetRow,
      row.postId,
      row.postLabel,
      row.contentType,
      row.locationInput,
      row.journeyLabel,
      row.suggestionStatus,
      top?.label || "",
      (top?.matchedTerms || []).join(" | "),
      row.candidates.map(candidate => candidate.label).join(" | "),
      row.safeToWrite,
    ]
  })
  return `${[headers, ...rows]
    .map(row => row.map(csvCell).join(","))
    .join("\n")}\n`
}
