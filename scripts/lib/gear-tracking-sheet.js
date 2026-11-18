const crypto = require("crypto")
const { planGearIngestion } = require("./gear-ingestion.js")

const GEAR_SHEET_HEADERS = Object.freeze([
  "Workflow",
  "Gear ID",
  "Product Name",
  "Category",
  "Brand",
  "Model",
  "Product Description",
  "Aliases",
  "Verification Status",
  "Image Asset ID",
  "Journey ID",
  "Visit ID",
  "Usage ID",
  "Usage Type",
  "Evidence",
  "Visibility",
  "Usage Notes",
  "Why It Worked",
  "Limitations",
  "Would Bring Again",
  "Featured",
  "Sort Order",
  "Media Asset IDs",
  "Official URL",
  "Official Link Label",
  "Official URL Verified",
  "Official Partner ID",
  "Affiliate URL",
  "Affiliate Link Label",
  "Affiliate URL Verified",
  "Affiliate Partner ID",
  "Affiliate Tracking Mode",
  "Automation Status",
  "Last Error",
  "Processed Hash",
  "Updated At",
])

const WORKFLOW_VALUES = Object.freeze([
  "Off",
  "Preview",
  "Publish",
  "Published",
])

const AUTOMATION_HEADERS = Object.freeze([
  "Automation Status",
  "Last Error",
  "Processed Hash",
  "Updated At",
])

function text(value) {
  return String(value ?? "").trim()
}

function list(value) {
  return text(value)
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean)
}

function optionalBoolean(value, field, rowNumber, errors) {
  const normalized = text(value).toLowerCase()
  if (!normalized) return undefined
  if (["true", "yes", "1"].includes(normalized)) return true
  if (["false", "no", "0"].includes(normalized)) return false
  errors.push(
    `Gear row ${rowNumber} field "${field}" must be TRUE, FALSE, or blank`
  )
  return undefined
}

function optionalNumber(value, field, rowNumber, errors) {
  const normalized = text(value)
  if (!normalized) return undefined
  const number = Number(normalized)
  if (Number.isFinite(number)) return number
  errors.push(
    `Gear row ${rowNumber} field "${field}" must be a number or blank`
  )
  return undefined
}

function setText(target, key, value) {
  const normalized = text(value)
  if (normalized) target[key] = normalized
}

function rowHash(row) {
  const authored = Object.fromEntries(
    GEAR_SHEET_HEADERS.filter(
      header => header !== "Workflow" && !AUTOMATION_HEADERS.includes(header)
    ).map(header => [header, text(row[header])])
  )
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(authored))
    .digest("hex")
}

function rowToGearItem(row, rowNumber) {
  const errors = []
  const item = {}

  setText(item, "gearId", row["Gear ID"])
  setText(item, "name", row["Product Name"])
  setText(item, "category", row.Category)
  setText(item, "brand", row.Brand)
  setText(item, "model", row.Model)
  setText(item, "description", row["Product Description"])
  setText(item, "verificationStatus", row["Verification Status"])
  setText(item, "imageAssetId", row["Image Asset ID"])
  setText(item, "visitId", row["Visit ID"])
  setText(item, "usageId", row["Usage ID"])
  setText(item, "usageType", row["Usage Type"])
  setText(item, "evidence", row.Evidence)
  setText(item, "visibility", row.Visibility)
  setText(item, "notes", row["Usage Notes"])
  setText(item, "whyItWorked", row["Why It Worked"])
  setText(item, "limitations", row.Limitations)

  const aliases = list(row.Aliases)
  if (aliases.length) item.aliases = aliases
  const mediaAssetIds = list(row["Media Asset IDs"])
  if (mediaAssetIds.length) item.mediaAssetIds = mediaAssetIds

  const wouldBringAgain = optionalBoolean(
    row["Would Bring Again"],
    "Would Bring Again",
    rowNumber,
    errors
  )
  if (wouldBringAgain !== undefined) item.wouldBringAgain = wouldBringAgain
  const featured = optionalBoolean(
    row.Featured,
    "Featured",
    rowNumber,
    errors
  )
  if (featured !== undefined) item.featured = featured
  const sortOrder = optionalNumber(
    row["Sort Order"],
    "Sort Order",
    rowNumber,
    errors
  )
  if (sortOrder !== undefined) item.sortOrder = sortOrder

  const officialUrl = text(row["Official URL"])
  if (officialUrl) {
    item.website = officialUrl
    setText(item, "websiteLabel", row["Official Link Label"])
    setText(item, "websitePartnerId", row["Official Partner ID"])
    const verified = optionalBoolean(
      row["Official URL Verified"],
      "Official URL Verified",
      rowNumber,
      errors
    )
    if (verified !== undefined) item.websiteVerified = verified
  }

  const affiliateUrl = text(row["Affiliate URL"])
  if (affiliateUrl) {
    item.affiliateUrl = affiliateUrl
    setText(item, "affiliateLabel", row["Affiliate Link Label"])
    setText(item, "affiliatePartnerId", row["Affiliate Partner ID"])
    setText(
      item,
      "affiliateTrackingMode",
      row["Affiliate Tracking Mode"]
    )
    const verified = optionalBoolean(
      row["Affiliate URL Verified"],
      "Affiliate URL Verified",
      rowNumber,
      errors
    )
    if (verified !== undefined) item.affiliateVerified = verified
  }

  return {
    errors,
    hash: rowHash(row),
    item,
    journeyId: text(row["Journey ID"]),
    row,
    rowNumber,
  }
}

function selectGearSheetRows({ headers, rows }, mode = "preview") {
  const errors = []
  const missingHeaders = GEAR_SHEET_HEADERS.filter(
    header => !headers.includes(header)
  )
  if (missingHeaders.length) {
    errors.push(`Gear sheet is missing columns: ${missingHeaders.join(", ")}`)
  }

  const selected = []
  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const workflow = text(row.Workflow)
    if (!workflow && Object.values(row).every(value => !text(value))) return
    if (!WORKFLOW_VALUES.includes(workflow)) {
      errors.push(
        `Gear row ${rowNumber} has unsupported Workflow "${workflow || "blank"}"`
      )
      return
    }
    const include =
      mode === "apply"
        ? workflow === "Publish"
        : workflow === "Preview" || workflow === "Publish"
    if (include) selected.push(rowToGearItem(row, rowNumber))
  })

  return { errors, rows: selected }
}

function mergeSummary(target, source) {
  Object.keys(target).forEach(key => target[key].push(...source[key]))
}

function planGearSheetIngestion({ sheet, mode, records, context }) {
  const selection = selectGearSheetRows(sheet, mode)
  const errors = [...selection.errors]
  const warnings = []
  let nextRecords = JSON.parse(JSON.stringify(records))
  const summary = {
    created: [],
    updated: [],
    linked: [],
    usageUpdated: [],
    unchanged: [],
    skipped: [],
  }
  const successfulRows = []

  selection.rows.forEach(entry => {
    if (entry.errors.length) {
      errors.push(...entry.errors)
      return
    }
    if (!entry.journeyId) {
      errors.push(`Gear row ${entry.rowNumber} needs Journey ID`)
      return
    }

    const plan = planGearIngestion({
      document: {
        schemaVersion: 1,
        journeyId: entry.journeyId,
        mode: "upsert",
        items: [entry.item],
      },
      journeyId: entry.journeyId,
      records: nextRecords,
      context,
    })
    if (plan.errors.length) {
      errors.push(
        ...plan.errors.map(error => `Gear row ${entry.rowNumber}: ${error}`)
      )
      return
    }
    warnings.push(
      ...plan.warnings.map(warning => `Gear row ${entry.rowNumber}: ${warning}`)
    )
    mergeSummary(summary, plan.summary)
    nextRecords = plan.records
    successfulRows.push(entry)
  })

  return {
    changed: JSON.stringify(records) !== JSON.stringify(nextRecords),
    errors: [...new Set(errors)],
    records: nextRecords,
    selectedCount: selection.rows.length,
    successfulRows,
    summary,
    warnings: [...new Set(warnings)],
  }
}

module.exports = {
  AUTOMATION_HEADERS,
  GEAR_SHEET_HEADERS,
  WORKFLOW_VALUES,
  planGearSheetIngestion,
  rowHash,
  rowToGearItem,
  selectGearSheetRows,
}
