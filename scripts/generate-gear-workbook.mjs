import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { partnerRecords } from "../src/content/partners/index.mjs"
import { gearRecords } from "../src/content/gear/index.mjs"

const require = createRequire(import.meta.url)
const gearContract = require("../src/content/gear/contract.js")
const commercialLinks = require("../src/content/commercial-links.js")
const {
  GEAR_SHEET_HEADERS,
  WORKFLOW_VALUES,
} = require("./lib/gear-tracking-sheet.js")

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const defaultOutput = path.join(
  projectRoot,
  "templates",
  "roam-with-justin-gear-tracker.xlsx"
)

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function columnLetter(index) {
  let value = index + 1
  let result = ""
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

function inlineCell(reference, value, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : ""
  if (value === "" || value === null || value === undefined) {
    return `<c r="${reference}"${styleAttribute}/>`
  }
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function worksheet({
  rows,
  columns = [],
  frozenRows = 0,
  hiddenColumns = [],
  validations = [],
  table = false,
}) {
  const maxColumn = Math.max(
    1,
    ...rows.map(row => row.cells.length),
    ...columns.map(column => column.max || column.min || 1)
  )
  const maxRow = Math.max(1, ...rows.map(row => row.number))
  const columnXml = columns.length
    ? `<cols>${columns
        .map(column => {
          const hidden = column.hidden ? ' hidden="1"' : ""
          return `<col min="${column.min}" max="${column.max || column.min}" width="${column.width}" customWidth="1"${hidden}/>`
        })
        .join("")}</cols>`
    : ""
  const rowXml = rows
    .map(row => {
      const cells = row.cells
        .map((cell, index) =>
          inlineCell(
            `${columnLetter(index)}${row.number}`,
            cell.value,
            cell.style || 0
          )
        )
        .join("")
      const height = row.height
        ? ` ht="${row.height}" customHeight="1"`
        : ""
      return `<row r="${row.number}"${height}>${cells}</row>`
    })
    .join("")
  const pane = frozenRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${frozenRows}" topLeftCell="A${frozenRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
  const validationXml = validations.length
    ? `<dataValidations count="${validations.length}">${validations
        .map(
          validation =>
            `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="stop" errorTitle="Choose a catalog value" error="Select a value from the list." sqref="${validation.range}"><formula1>${validation.name}</formula1></dataValidation>`
        )
        .join("")}</dataValidations>`
    : ""
  const tableXml = table
    ? '<tableParts count="1"><tablePart r:id="rId1"/></tableParts>'
    : ""
  const hiddenXml = hiddenColumns.length
    ? `<ignoredErrors><ignoredError sqref="${hiddenColumns.join(" ")}" numberStoredAsText="1"/></ignoredErrors>`
    : ""
  const relationships = table
    ? ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    : ""

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"${relationships}>
  <dimension ref="A1:${columnLetter(maxColumn - 1)}${maxRow}"/>
  ${pane}
  <sheetFormatPr defaultRowHeight="18"/>
  ${columnXml}
  <sheetData>${rowXml}</sheetData>
  ${validationXml}
  ${hiddenXml}
  ${tableXml}
</worksheet>`
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const dosTime = 0
  const dosDate = 0x21

  Object.entries(files).forEach(([name, contents]) => {
    const nameBuffer = Buffer.from(name.replace(/\\/g, "/"), "utf8")
    const data = Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(contents, "utf8")
    const checksum = crc32(data)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)
    const local = Buffer.concat([localHeader, nameBuffer, data])
    localParts.push(local)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(Buffer.concat([centralHeader, nameBuffer]))
    offset += local.length
  })

  const central = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(centralParts.length, 8)
  end.writeUInt16LE(centralParts.length, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...localParts, central, end])
}

function catalogData() {
  const visits = journeyRecords.flatMap(journey =>
    (journey.visits || []).map(visit => visit.id)
  )
  return [
    ["Workflow Values", WORKFLOW_VALUES],
    ["Categories", gearContract.GEAR_CATEGORIES],
    ["Verification Statuses", gearContract.GEAR_VERIFICATION_STATUSES],
    ["Usage Types", gearContract.GEAR_USAGE_TYPES],
    ["Evidence Statuses", gearContract.GEAR_EVIDENCE_STATUSES],
    ["Visibilities", gearContract.GEAR_VISIBILITIES],
    ["Boolean Values", ["TRUE", "FALSE"]],
    ["Affiliate Tracking Modes", ["custom"]],
    ["Journey IDs", journeyRecords.map(journey => journey.id)],
    ["Visit IDs", visits],
    ["Partner IDs", partnerRecords.map(partner => partner.id)],
    [
      "Affiliate Partner IDs",
      partnerRecords
        .filter(partner => partner.relationship === "affiliate-program")
        .map(partner => partner.id),
    ],
    ["Public Gear Surfaces", commercialLinks.GEAR_SURFACES],
  ]
}

function buildFiles() {
  const catalogs = catalogData()
  const catalogRowCount = Math.max(...catalogs.map(([, values]) => values.length))
  const catalogRows = [
    {
      number: 1,
      cells: catalogs.map(([header]) => ({ value: header, style: 2 })),
    },
    ...Array.from({ length: catalogRowCount }, (_, index) => ({
      number: index + 2,
      cells: catalogs.map(([, values]) => ({
        value: values[index] || "",
        style: 0,
      })),
    })),
  ]
  const definedNames = catalogs.map(([header, values], index) => {
    const name = header.replace(/[^A-Za-z0-9]/g, "")
    const column = columnLetter(index)
    const finalRow = Math.max(2, values.length + 1)
    return `<definedName name="${name}">&apos;Catalog&apos;!$${column}$2:$${column}$${finalRow}</definedName>`
  })
  const validationByColumn = [
    ["A", "WorkflowValues"],
    ["D", "Categories"],
    ["I", "VerificationStatuses"],
    ["K", "JourneyIDs"],
    ["L", "VisitIDs"],
    ["N", "UsageTypes"],
    ["O", "EvidenceStatuses"],
    ["P", "Visibilities"],
    ["T", "BooleanValues"],
    ["U", "BooleanValues"],
    ["Z", "BooleanValues"],
    ["AA", "PartnerIDs"],
    ["AD", "BooleanValues"],
    ["AE", "AffiliatePartnerIDs"],
    ["AF", "AffiliateTrackingModes"],
  ].map(([column, name]) => ({ range: `${column}2:${column}1000`, name }))

  const readmeRows = [
    ["Roam With Justin Gear Tracker", "", 1],
    [
      "Purpose",
      "Track each product once and connect it to the Journey or Visit where it was actually used.",
      5,
    ],
    ["1", "Upload this workbook to Google Drive and open it as a Google Sheet.", 4],
    ["2", "Keep one reusable identity row per product in Gear Library. The importer never processes that tab.", 4],
    ["3", "Copy, do not cut, the complete reusable row from Gear Library into the Gear table.", 4],
    ["4", "Add the Journey, optional Visit, usage details, evidence, media IDs, and Workflow in the copied Gear row.", 4],
    ["5", "Keep every entry inside the Gear table so sorting and filtering move the complete row.", 4],
    ["6", "Start with Workflow Preview. The preview command validates without changing repository content.", 4],
    ["7", "After review, change Workflow to Publish and run the apply command.", 4],
    ["8", "Successful apply changes Workflow to Published and fills the hidden automation columns.", 4],
    [
      "Stable IDs",
      "Gear ID identifies the product forever. Usage ID may stay blank because the ingestor derives it from Gear, Journey, and Visit.",
      5,
    ],
    [
      "Safe defaults",
      "New rows should use needs-review verification, needs-review evidence, and draft visibility until identity and firsthand use are confirmed.",
      5,
    ],
    [
      "Links",
      "Enter complete HTTPS URLs only. Affiliate URLs require an approved Partner ID, custom tracking mode, and explicit verification.",
      5,
    ],
    [
      "Images",
      "Image Asset ID and Media Asset IDs must already exist in the canonical media registry. Product image upload is a later phase.",
      5,
    ],
    [
      "Important",
      "Do not copy a row and leave its Gear ID unchanged for a different product. Do not edit Catalog values by hand.",
      5,
    ],
  ].map((row, index) => ({
    number: index + 1,
    height: index === 0 ? 30 : 34,
    cells: [
      { value: row[0], style: row[2] },
      { value: row[1], style: row[2] },
    ],
  }))

  const gearDefaultValues = Object.fromEntries(
    GEAR_SHEET_HEADERS.map(header => [header, ""])
  )
  Object.assign(gearDefaultValues, {
    Workflow: "Off",
    "Verification Status": "needs-review",
    Evidence: "needs-review",
    Visibility: "draft",
  })
  const gearRows = [
    {
      number: 1,
      height: 34,
      cells: GEAR_SHEET_HEADERS.map(header => ({ value: header, style: 2 })),
    },
    {
      number: 2,
      height: 24,
      cells: GEAR_SHEET_HEADERS.map(header => ({
        value: gearDefaultValues[header],
        style: 4,
      })),
    },
  ]
  const gearLastColumn = columnLetter(GEAR_SHEET_HEADERS.length - 1)
  const libraryHeaders = GEAR_SHEET_HEADERS.slice(
    0,
    GEAR_SHEET_HEADERS.indexOf("Automation Status")
  )
  const reusableRows = gearRecords.length
    ? gearRecords.map(item => {
        const officialLink = (item.links || []).find(link => !link.affiliate)
        const affiliateLink = (item.links || []).find(link => link.affiliate)
        return {
          Workflow: "Off",
          "Gear ID": item.id,
          "Product Name": item.name,
          Category: item.category,
          Brand: item.brand || "",
          Model: item.model || "",
          "Product Description": item.description || "",
          Aliases: (item.aliases || []).join(", "),
          "Verification Status": item.verificationStatus,
          "Image Asset ID": item.imageAssetId || "",
          "Official URL": officialLink?.url || "",
          "Official Link Label": officialLink?.label || "",
          "Official URL Verified": officialLink
            ? String(Boolean(officialLink.verified)).toUpperCase()
            : "",
          "Official Partner ID": officialLink?.partnerId || "",
          "Affiliate URL": affiliateLink?.url || "",
          "Affiliate Link Label": affiliateLink?.label || "",
          "Affiliate URL Verified": affiliateLink
            ? String(Boolean(affiliateLink.verified)).toUpperCase()
            : "",
          "Affiliate Partner ID": affiliateLink?.partnerId || "",
          "Affiliate Tracking Mode": affiliateLink?.trackingMode || "",
        }
      })
    : [
        {
          Workflow: "Off",
          "Verification Status": "needs-review",
        },
      ]
  const libraryRows = [
    {
      number: 1,
      height: 34,
      cells: libraryHeaders.map(header => ({ value: header, style: 2 })),
    },
    ...reusableRows.map((row, index) => ({
      number: index + 2,
      height: 24,
      cells: libraryHeaders.map(header => ({
        value: row[header] || "",
        style: 4,
      })),
    })),
  ]
  const libraryLastColumn = columnLetter(libraryHeaders.length - 1)

  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
  <Override PartName="/xl/tables/table2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Roam With Justin</dc:creator><dc:title>Gear Tracker</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-17T00:00:00Z</dcterms:created></cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Roam With Justin</Application></Properties>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="README" sheetId="1" r:id="rId1"/><sheet name="Gear" sheetId="2" r:id="rId2"/><sheet name="Gear Library" sheetId="3" r:id="rId3"/><sheet name="Catalog" sheetId="4" state="hidden" r:id="rId4"/></sheets><definedNames>${definedNames.join("")}</definedNames><calcPr calcId="0"/></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="20"/><color rgb="FF0B1718"/><name val="Aptos Display"/></font><font><b/><sz val="11"/><color rgb="FFF3D07A"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B1718"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5F0E4"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD8C58F"/></left><right style="thin"><color rgb="FFD8C58F"/></right><top style="thin"><color rgb="FFD8C58F"/></top><bottom style="thin"><color rgb="FFD8C58F"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": worksheet({
      rows: readmeRows,
      columns: [
        { min: 1, width: 22 },
        { min: 2, width: 105 },
      ],
    }),
    "xl/worksheets/sheet2.xml": worksheet({
      rows: gearRows,
      frozenRows: 1,
      table: true,
      columns: [
        { min: 1, width: 13 },
        { min: 2, max: 3, width: 26 },
        { min: 4, width: 18 },
        { min: 5, max: 6, width: 18 },
        { min: 7, max: 8, width: 32 },
        { min: 9, max: 16, width: 22 },
        { min: 17, max: 19, width: 36 },
        { min: 20, max: 22, width: 16 },
        { min: 23, width: 30 },
        { min: 24, max: 32, width: 28 },
        { min: 33, max: 36, width: 24, hidden: true },
      ],
      validations: validationByColumn,
    }),
    "xl/worksheets/_rels/sheet2.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>`,
    "xl/worksheets/sheet3.xml": worksheet({
      rows: libraryRows,
      frozenRows: 1,
      table: true,
      columns: [
        { min: 1, width: 13 },
        { min: 2, max: 3, width: 26 },
        { min: 4, width: 18 },
        { min: 5, max: 6, width: 18 },
        { min: 7, max: 8, width: 32 },
        { min: 9, max: 16, width: 22 },
        { min: 17, max: 19, width: 36 },
        { min: 20, max: 22, width: 16 },
        { min: 23, width: 30 },
        { min: 24, max: 32, width: 28 },
      ],
      validations: validationByColumn,
    }),
    "xl/worksheets/_rels/sheet3.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table2.xml"/></Relationships>`,
    "xl/worksheets/sheet4.xml": worksheet({
      rows: catalogRows,
      frozenRows: 1,
      columns: catalogs.map((_, index) => ({
        min: index + 1,
        width: 28,
      })),
    }),
    "xl/tables/table1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="GearTracker" displayName="GearTracker" ref="A1:${gearLastColumn}2" totalsRowShown="0"><autoFilter ref="A1:${gearLastColumn}2"/><tableColumns count="${GEAR_SHEET_HEADERS.length}">${GEAR_SHEET_HEADERS.map((header, index) => `<tableColumn id="${index + 1}" name="${escapeXml(header)}"/>`).join("")}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`,
    "xl/tables/table2.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="2" name="GearLibrary" displayName="GearLibrary" ref="A1:${libraryLastColumn}${libraryRows.length}" totalsRowShown="0"><autoFilter ref="A1:${libraryLastColumn}${libraryRows.length}"/><tableColumns count="${libraryHeaders.length}">${libraryHeaders.map((header, index) => `<tableColumn id="${index + 1}" name="${escapeXml(header)}"/>`).join("")}</tableColumns><tableStyleInfo name="TableStyleMedium4" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`,
  }
}

export function createGearWorkbookBuffer() {
  return zipStore(buildFiles())
}

export function listGearWorkbookEntries(buffer) {
  const entries = []
  let offset = 0
  while (offset + 4 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset)
    if (signature !== 0x04034b50) break
    const nameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const size = buffer.readUInt32LE(offset + 18)
    const nameStart = offset + 30
    entries.push(buffer.subarray(nameStart, nameStart + nameLength).toString())
    offset = nameStart + nameLength + extraLength + size
  }
  return entries
}

async function main() {
  const outputArgument = process.argv.find(argument =>
    argument.startsWith("--output=")
  )
  const output = path.resolve(
    outputArgument ? outputArgument.slice("--output=".length) : defaultOutput
  )
  await fs.promises.mkdir(path.dirname(output), { recursive: true })
  await fs.promises.writeFile(output, createGearWorkbookBuffer())
  console.log(`Created Gear tracking workbook: ${path.relative(projectRoot, output)}`)
  console.log(`Journeys in Catalog: ${journeyRecords.length}`)
  console.log(`Reusable Gear rows: ${gearRecords.length}`)
  console.log(
    `Visits in Catalog: ${journeyRecords.reduce((total, journey) => total + (journey.visits || []).length, 0)}`
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
