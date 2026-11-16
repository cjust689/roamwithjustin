import crypto from "node:crypto"

export const EXISTING_POST_HEADERS = Object.freeze([
  "Location",
  "Series/Post",
  "Status",
  "Account",
  "Type",
  "Caption",
  "Drive Folder",
  "Posted",
])

export const ATLAS_POST_HEADERS = Object.freeze([
  "Atlas Journey",
  "Atlas Experience",
  "Moment / Angle",
  "Atlas Notes",
  "Travel Date / Range",
  "Atlas Mode",
])

export const AUTOMATION_POST_HEADERS = Object.freeze([
  "post_id",
  "journey_id",
  "place_id",
  "visit_id",
  "experience_id",
  "moment_id",
  "atlas_status",
  "atlas_url",
  "atlas_url_level",
  "source_hash",
  "source_revision",
  "last_processed_hash",
  "last_deployment",
  "last_verified_at",
  "sync_error",
  "source_owner",
])

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export function postSourceHash(row) {
  const sourceFields = Object.fromEntries(
    [...EXISTING_POST_HEADERS, ...ATLAS_POST_HEADERS]
      .sort()
      .map(header => [header, row?.[header] || ""])
  )
  return stableHash(sourceFields)
}

function atlasNodeForVisit(atlasNodes, journeyId, visit) {
  return (
    atlasNodes.find(
      node =>
        node.journeyId === journeyId &&
        (node.visitId === visit.id || node.placeId === visit.placeId)
    ) || null
  )
}

export function buildCanonicalCatalog({
  journeys,
  places,
  atlasNodes,
  experiences = [],
}) {
  const placeById = new Map(places.map(place => [place.id, place]))
  const journeyById = new Map(journeys.map(journey => [journey.id, journey]))
  const records = []

  journeys.forEach(journey => {
    records.push({
      entityType: "journey",
      id: journey.id,
      label: journey.title,
      parentId: null,
      journeyId: journey.id,
      placeId: null,
      owner: "code",
      url: `/trips/${journey.slug}`,
      aliases: unique([
        journey.id,
        journey.title,
        journey.slug,
        ...(journey.legacySlugs || []),
      ]),
    })
    ;(journey.visits || []).forEach(visit => {
      const place = placeById.get(visit.placeId)
      const atlasNode = atlasNodeForVisit(atlasNodes, journey.id, visit)
      records.push({
        entityType: "visit",
        id: visit.id,
        label: `${place?.name || visit.placeId} / ${journey.title}`,
        parentId: journey.id,
        journeyId: journey.id,
        placeId: visit.placeId,
        owner: "code",
        url: atlasNode ? `/atlas/${atlasNode.id}` : `/trips/${journey.slug}`,
        aliases: unique([
          visit.id,
          visit.legacyId,
          place?.name,
          `${place?.name || visit.placeId} / ${journey.title}`,
        ]),
      })
    })
  })

  places.forEach(place => {
    records.push({
      entityType: "place",
      id: place.id,
      label: place.name,
      parentId: place.parentPlaceId || null,
      journeyId: null,
      placeId: place.id,
      owner: "code",
      url: null,
      aliases: unique([place.id, place.name]),
    })
  })

  atlasNodes.forEach(node => {
    const place = placeById.get(node.placeId)
    records.push({
      entityType: "atlas-node",
      id: node.id,
      label: place?.name || node.id,
      parentId: node.parentId || null,
      journeyId: node.journeyId,
      placeId: node.placeId,
      owner: "code",
      url: `/atlas/${node.id}`,
      aliases: unique([node.id, place?.name]),
    })
  })

  experiences.forEach(experience => {
    const journey = journeyById.get(experience.journeyId)
    records.push({
      entityType: "experience",
      id: experience.id,
      label: experience.title,
      parentId: experience.journeyId,
      journeyId: experience.journeyId,
      placeId: experience.placeId,
      owner: experience.sourceOwner || "generated",
      url: journey
        ? `/trips/${journey.slug}#experience-${experience.slug}`
        : null,
      aliases: unique([experience.id, experience.title, experience.slug]),
    })
  })

  records.sort(
    (left, right) =>
      left.entityType.localeCompare(right.entityType) ||
      left.id.localeCompare(right.id) ||
      String(left.journeyId || "").localeCompare(String(right.journeyId || ""))
  )

  return {
    schemaVersion: 1,
    records,
    counts: records.reduce((counts, record) => {
      counts[record.entityType] = (counts[record.entityType] || 0) + 1
      return counts
    }, {}),
  }
}

export function validatePostsHeaders(headers) {
  const present = new Set(headers.map(header => String(header || "").trim()))
  return {
    missingExisting: EXISTING_POST_HEADERS.filter(
      header => !present.has(header)
    ),
    missingAtlas: ATLAS_POST_HEADERS.filter(header => !present.has(header)),
    missingAutomation: AUTOMATION_POST_HEADERS.filter(
      header => !present.has(header)
    ),
  }
}

export function parseCsvRecords(contents) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]

    if (quoted) {
      if (character === '"' && contents[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ",") {
      row.push(field)
      field = ""
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && contents[index + 1] === "\n") index += 1
      row.push(field)
      if (row.some(value => value !== "")) rows.push(row)
      row = []
      field = ""
    } else {
      field += character
    }
  }

  if (quoted) throw new Error("CSV input ends inside a quoted field")
  row.push(field)
  if (row.some(value => value !== "")) rows.push(row)
  if (!rows.length) return { headers: [], rows: [] }

  const headers = rows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  )
  const duplicateHeaders = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index
  )
  if (duplicateHeaders.length) {
    throw new Error(
      `CSV input contains duplicate header(s): ${[...new Set(duplicateHeaders)].join(", ")}`
    )
  }
  if (headers.some(header => !header)) {
    throw new Error("CSV input contains a blank header")
  }
  const overflowIndex = rows
    .slice(1)
    .findIndex(values => values.length > headers.length)
  if (overflowIndex >= 0) {
    throw new Error(
      `CSV row ${overflowIndex + 2} contains more fields than the header row`
    )
  }
  const records = rows
    .slice(1)
    .map(values =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] || ""])
      )
    )

  return { headers, rows: records }
}

export function resolveCatalogValue(value, entityType, catalog) {
  const input = String(value || "").trim()
  if (!input) return { status: "blank", input, matches: [] }

  const newMatch = input.match(/^new:\s*(.+)$/i)
  if (newMatch) {
    return {
      status: "proposed-new",
      input,
      proposedLabel: newMatch[1].trim(),
      matches: [],
    }
  }

  const normalized = normalizeText(input)
  const matches = catalog.records.filter(
    record =>
      record.entityType === entityType &&
      record.aliases.some(alias => normalizeText(alias) === normalized)
  )

  if (matches.length === 1) return { status: "matched", input, matches }
  if (matches.length > 1) return { status: "ambiguous", input, matches }
  return { status: "unmatched", input, matches: [] }
}

export function planBaseline({
  headers,
  rows,
  catalog,
  eligibleAccount = "Roam",
}) {
  const schema = validatePostsHeaders(headers)
  const account = normalizeText(eligibleAccount)
  const eligibleRows = []
  let ignoredRows = 0

  rows.forEach((row, index) => {
    if (normalizeText(row.Account) !== account) {
      ignoredRows += 1
      return
    }

    const journey = resolveCatalogValue(
      row["Atlas Journey"],
      "journey",
      catalog
    )
    const currentPlaceId = String(row.place_id || "").trim()
    const locationPlace = resolveCatalogValue(row.Location, "place", catalog)
    const boundPlace = currentPlaceId
      ? resolveCatalogValue(currentPlaceId, "place", catalog)
      : null
    const place = currentPlaceId
      ? {
          ...(boundPlace?.status === "matched"
            ? boundPlace
            : {
                status: "invalid-binding",
                matches: boundPlace?.matches || [],
              }),
          input: String(row.Location || "").trim(),
          bindingInput: currentPlaceId,
          bindingSource: "place_id",
        }
      : { ...locationPlace, bindingSource: "location" }
    const atlasMode = String(row["Atlas Mode"] || "Off").trim() || "Off"
    const postId = String(row.post_id || row["Post ID"] || "").trim()
    const blockers = []

    if (!["Off", "Preview", "Publish"].includes(atlasMode)) {
      blockers.push("invalid-atlas-mode")
    }
    if (
      atlasMode !== "Off" &&
      !["matched", "proposed-new"].includes(journey.status)
    ) {
      blockers.push("journey-needs-review")
    }
    if (atlasMode !== "Off" && place.status !== "matched") {
      blockers.push("place-needs-review")
    }

    eligibleRows.push({
      diagnosticRow: index + 2,
      postId: postId || null,
      currentJourneyId: String(row.journey_id || "").trim() || null,
      currentPlaceId: currentPlaceId || null,
      needsPostId: !postId,
      atlasMode,
      sourceHash: postSourceHash(row),
      journey,
      place,
      experienceInput: String(row["Atlas Experience"] || "").trim(),
      blockers,
    })
  })

  return {
    mode: "dry-run",
    schema,
    migration: {
      visibleHeadersToAppend: schema.missingAtlas,
      automationHeadersToAppend: schema.missingAutomation,
      automationHeadersToHide: AUTOMATION_POST_HEADERS,
      eligibleRowsNeedingPostIds: eligibleRows.filter(row => row.needsPostId)
        .length,
      eligibleRowsDefaultedOff: eligibleRows.filter(
        row => !String(rows[row.diagnosticRow - 2]?.["Atlas Mode"] || "").trim()
      ).length,
      requiresCreatorAuthorizedWrite: Boolean(
        schema.missingAtlas.length ||
          schema.missingAutomation.length ||
          eligibleRows.some(row => row.needsPostId)
      ),
    },
    eligibleAccount,
    eligibleRows,
    ignoredRows,
    summary: {
      eligibleRows: eligibleRows.length,
      ignoredRows,
      missingPostIds: eligibleRows.filter(row => row.needsPostId).length,
      blockedRows: eligibleRows.filter(row => row.blockers.length).length,
      exactJourneyMatches: eligibleRows.filter(
        row => row.journey.status === "matched"
      ).length,
      exactPlaceMatches: eligibleRows.filter(
        row => row.place.status === "matched"
      ).length,
      ambiguousPlaceMatches: eligibleRows.filter(
        row => row.place.status === "ambiguous"
      ).length,
      unmatchedPlaceCandidates: eligibleRows.filter(
        row => row.place.status === "unmatched"
      ).length,
      blankPlaceCandidates: eligibleRows.filter(
        row => row.place.status === "blank"
      ).length,
      proposedJourneys: eligibleRows.filter(
        row => row.journey.status === "proposed-new"
      ).length,
      boundPlaceIds: eligibleRows.filter(row => row.currentPlaceId).length,
      boundJourneyIds: eligibleRows.filter(row => row.currentJourneyId).length,
    },
  }
}
