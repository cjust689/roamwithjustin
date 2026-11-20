import { parseCsvRecords } from "./editorial-baseline.mjs"
import { isApprovedExpediaUrl } from "../../src/services/expediaDestinationLinks.mjs"

export const EXPEDIA_LINK_HEADERS = [
  "id",
  "destination_id",
  "destination_label",
  "country_code",
  "expedia_flights_url",
  "enabled",
  "placement_scope",
  "notes",
]

export function extractExpediaSheetGrid(data) {
  const grids = data.sheets?.flatMap(sheet => sheet.data || []) || []
  if (grids.length !== 1 || !Array.isArray(grids[0].rowData))
    throw Error("Expected one Expedia Flights grid")
  return extractExpediaTable(
    {
      values: grids[0].rowData.map((row, index) =>
        (row.values || []).map(cell => {
          const urls = [
            ...new Set(
              [
                cell.hyperlink,
                ...(cell.textFormatRuns || []).map(
                  run => run.format?.link?.uri
                ),
              ].filter(Boolean)
            ),
          ]
          if (urls.length > 1)
            throw Error(
              `Row ${index + 1}: cell has multiple hyperlink destinations`
            )
          if (urls.length === 1) return urls[0]
          if (cell.userEnteredValue?.formulaValue)
            throw Error(
              `Row ${index + 1}: use plain values or a single hyperlink, not an unresolved formula`
            )
          return cell.formattedValue || ""
        })
      ),
    },
    "json"
  )
}

function tableRecords(rows) {
  const header = rows[0]?.map(value => String(value).trim()) || []
  if (
    new Set(header).size !== header.length ||
    EXPEDIA_LINK_HEADERS.some((value, index) => header[index] !== value) ||
    header.length !== EXPEDIA_LINK_HEADERS.length
  )
    throw Error(
      "Expected the eight Expedia Flights columns in their documented order"
    )
  return rows
    .slice(1)
    .filter(row => row.some(value => String(value || "").trim()))
    .map((row, index) => ({
      ...Object.fromEntries(
        header.map((key, column) => [key, String(row[column] ?? "")])
      ),
      row: index + 2,
    }))
}

export function extractExpediaTable(source, format) {
  if (format === "csv") {
    const parsed = parseCsvRecords(source)
    return tableRecords([
      parsed.headers,
      ...parsed.rows.map(row => parsed.headers.map(key => row[key])),
    ])
  }
  const data = typeof source === "string" ? JSON.parse(source) : source
  if (Array.isArray(data.values)) return tableRecords(data.values)
  const candidates = []
  function walk(elements = []) {
    for (const element of elements) {
      if (element.table) {
        const rows = element.table.tableRows.map(row =>
          row.tableCells.map(cell => {
            const runs = cell.content.flatMap(
              content => content.paragraph?.elements || []
            )
            const links = [
              ...new Set(
                runs
                  .map(run => run.textRun?.textStyle?.link?.url)
                  .filter(Boolean)
              ),
            ]
            if (links.length > 1)
              throw Error(
                "A table cell contains multiple hyperlink destinations"
              )
            return (
              links[0] ||
              runs
                .map(run => run.textRun?.content || "")
                .join("")
                .trim()
            )
          })
        )
        if (rows[0]?.[0] === "id" && rows[0]?.includes("expedia_flights_url"))
          candidates.push(rows)
      }
    }
  }
  walk(data.body?.content)
  function tabs(entries = []) {
    for (const tab of entries) {
      walk(tab.documentTab?.body?.content)
      tabs(tab.childTabs)
    }
  }
  tabs(data.tabs)
  if (candidates.length !== 1)
    throw Error("Expected exactly one dedicated Expedia link table")
  return tableRecords(candidates[0])
}

export function compileExpediaLinks(rows, catalog, previous = { links: [] }) {
  const places = new Map(catalog.records.map(place => [place.placeId, place]))
  const seen = new Set(),
    placements = new Set()
  const links = rows
    .map(row => {
      const fail = reason => {
        throw Error(`Row ${row.row || "?"}: ${reason}`)
      }
      if (!/^[a-z][a-z0-9-]{2,79}$/.test(row.id) || seen.has(row.id))
        fail("invalid or duplicate id")
      seen.add(row.id)
      if (!["true", "false"].includes(row.enabled))
        fail("enabled must be true or false")
      if (
        !["public", "private-approved", "both-approved"].includes(
          row.placement_scope
        )
      )
        fail("invalid placement_scope")
      const enabled = row.enabled === "true"
      if (
        (enabled || row.expedia_flights_url) &&
        !isApprovedExpediaUrl(row.expedia_flights_url)
      )
        fail(
          "use an exact HTTPS URL on an existing approved Expedia host; new network domains need review"
        )
      const place = row.destination_id ? places.get(row.destination_id) : null
      if (
        row.destination_id &&
        (!place || place.placeType !== "city" || place.deprecated)
      )
        fail("destination_id must resolve to an active canonical city")
      if (
        row.country_code &&
        (!place || place.countryCode !== row.country_code)
      )
        fail("country_code does not match the canonical city")
      if (!row.destination_id && (row.destination_label || row.country_code))
        fail("generic link must not imply a destination")
      const link = {
        id: row.id,
        partnerId: "expedia",
        provider: "expedia",
        product: "flights",
        kind: place ? "destination" : "generic",
        ...(place ? { destinationId: place.placeId } : {}),
        affiliateUrl: row.expedia_flights_url,
        enabled,
        placementScope: row.placement_scope,
      }
      for (const scope of row.placement_scope === "both-approved"
        ? ["public", "private"]
        : [row.placement_scope === "public" ? "public" : "private"]) {
        const key = `${row.destination_id || "generic"}:${scope}`
        if (enabled && placements.has(key))
          fail(
            "duplicate active destination or generic link for this placement"
          )
        if (enabled) placements.add(key)
      }
      return link
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const missing = previous.links
    .filter(link => !seen.has(link.id))
    .map(link => link.id)
  if (missing.length)
    throw Error(
      `Missing published rows: ${missing.join(", ")}. Restore them and explicitly set enabled=false before removal.`
    )
  const registry = { schemaVersion: 1, links }
  const old = new Map(previous.links.map(link => [link.id, link]))
  const diff = links.map(link => ({
    id: link.id,
    change: !old.has(link.id)
      ? "added"
      : JSON.stringify(old.get(link.id)) === JSON.stringify(link)
        ? "unchanged"
        : !link.enabled && old.get(link.id).enabled
          ? "disabled"
          : "changed",
  }))
  return {
    registry,
    diff,
    serialized: JSON.stringify(registry, null, 2) + "\n",
  }
}
