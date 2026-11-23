// Main Atlas stay intake. Uses editorial:stays, separately from Posts.
export const STAYS_TITLE = "Stays"
export const STAYS_GUIDE_TITLE = "Stays Instructions"
export const STAYS_ROW_COUNT = 201

const fields = [
  [
    "Property Name",
    "Public property name, or a general label such as Rental near Uvita for a private property.",
  ],
  [
    "Atlas Journey",
    "Choose the trip this stay belongs to. One row per stay, including return stays at the same property.",
  ],
  [
    "Atlas Mode",
    "Off = draft. Preview = review with editorial:stays --preview. Publish = owner approval after preview; --apply compiles locally, and optional --deploy promotes through protected GitHub/Pages. Flags alone do not run a background job.",
  ],
  [
    "Review Status",
    "Owner review state, separate from publication approval and automation status.",
  ],
  [
    "Property Type",
    "Accommodation type. An Airbnb listing is not automatically an affiliate or sponsored stay.",
  ],
  [
    "Property URL",
    "Optional official website or reviewed listing URL. Leave blank if linking would reveal a private property. Never include booking tokens or access codes.",
  ],
  [
    "Public Location",
    "Town or area visitors may see. No street address is required for a private property.",
  ],
  [
    "Public Coordinates",
    "Optional public display coordinates in WGS84 decimal latitude, longitude order. Supply the rough/town position itself for a private rental, not its exact coordinates.",
  ],
  [
    "Location Precision",
    "Town / area or Approximate is appropriate for private properties. Exact public property requires an intentional choice. No automatic geocoding or location disclosure.",
  ],
  [
    "Show on Map",
    "No by default. Yes requests reviewed geography registration; entering coordinates or approving a stay does not create a Place, Visit or Atlas pin.",
  ],
  [
    "Check-in Date",
    "Optional YYYY-MM-DD. Record actual stay dates only when known.",
  ],
  ["Check-out Date", "Optional YYYY-MM-DD. Leave unknown dates blank."],
  ["Nights", "Optional actual number of nights. Do not guess missing dates."],
  [
    "Stay Notes",
    "Private source notes describing what you actually experienced. These are not automatically public story copy.",
  ],
  [
    "Atlas Story",
    "Reviewed public stay copy. Follow the storytelling framework and confirmed trip evidence before approval.",
  ],
  [
    "Cover Asset ID",
    "Optional existing canonical Media asset ID. A Drive URL or filename alone is not a registered asset.",
  ],
  [
    "Media Asset IDs",
    "Optional existing canonical Media IDs separated by commas. Media uploads and rights review use the existing media workflow.",
  ],
  [
    "Drive Folder",
    "Optional source media folder. Adding a folder does not upload or publish files.",
  ],
  [
    "Relationship",
    "Select the actual commercial relationship. Independent means no sponsorship or affiliate relationship is asserted.",
  ],
  [
    "Disclosure",
    "Owner-approved disclosure when relevant. Hosting a property feature does not imply sponsorship.",
  ],
  [
    "Private Notes",
    "Editorial follow-up only, excluded from any future public payload. Do not store reservation details, access codes or an exact private address here.",
  ],
]

export const STAYS_MANAGED_HEADERS = Object.freeze([
  "stay_id",
  "partner_id",
  "journey_id",
  "place_id",
  "visit_id",
  "atlas_status",
  "atlas_url",
  "source_hash",
  "last_verified_at",
  "sync_error",
])
export const STAYS_HEADERS = Object.freeze([
  ...fields.map(([name]) => name),
  ...STAYS_MANAGED_HEADERS,
])

export const STAYS_GUIDE_ROWS = Object.freeze([
  ["Field / step", "Instructions"],
  [
    "Current capability",
    "Use npm run editorial:stays with --spreadsheet-id and --row. Preview is nonpublishing. Apply requires Publish, Ready for preview and an unchanged saved preview. It compiles locally. Optional --deploy promotes through protected develop/main and verifies the rendered stay before marking Published. No background polling runs just from changing a flag.",
  ],
  [
    "One row per stay",
    "Enter the property name and choose an Atlas Journey. Repeat visits are separate stay rows. Reuse the same property identity and reviewed URL rather than creating duplicate Partners.",
  ],
  [
    "Private properties",
    "Use a general property label, a nearby town/area and rough public display coordinates. Leave Property URL blank if it would identify a private address. Exact addresses and reservation details are not needed.",
  ],
  [
    "Coordinate format",
    "Use WGS84 decimal latitude, longitude, for example a town center pair you intentionally choose. Rough means you supply an approximate position; the sheet does not blur exact coordinates automatically. Other grid systems require their coordinate-system name and conversion review before use.",
  ],
  [
    "Map inclusion",
    "Keep Show on Map = No for a stay card without geography changes. Yes requires an explicitly registered Place and matching Journey Visit via --place-id and --visit-id, with the same reviewed public coordinates. For new geography, use the separate editorial:register:place review first. Stay ingestion does not create pins.",
  ],
  [
    "Dates and nights",
    "Supply both actual check-in/check-out dates, or leave both blank. Nights are computed when dates are present; a supplied count must agree. With no dates, an optional positive nights count is allowed. Unknown values stay blank.",
  ],
  [
    "Source and story",
    "Stay Notes are private source evidence. Atlas Story is reviewed public copy. Do not publish guesses, private notes or workflow labels.",
  ],
  [
    "Media",
    "Use registered canonical Media IDs for cover/gallery references. Drive Folder is source intake only. Existing upload, rights and verification steps still apply.",
  ],
  [
    "Relationship",
    "Choose Independent, Hosted, Sponsored, Affiliate, Mixed or Needs review based on the actual agreement. A stay or feature alone does not establish a commercial relationship. Record an approved disclosure where needed.",
  ],
  [
    "Off",
    "Draft or inactive. Blank mode is also treated as no approval. New prepared rows default to Off.",
  ],
  [
    "Preview",
    "Set Review Status to Ready for preview and Atlas Mode to Preview, then run editorial:stays --preview. Review the resulting public stay/property diff and private receipt before approval. No generated content, Sheet cells or website are changed by preview.",
  ],
  [
    "Publish",
    "After preview, change Atlas Mode to Publish and run editorial:stays --apply. Source changes require another preview. Compiled locally means the generated file was updated, not that the live site changed. Use --apply --deploy for protected publication after the feature code is released; Published is written only after rendered verification.",
  ],
  [
    "Review Status",
    "Draft, Needs review or Ready for preview. Ready for preview is not publication approval.",
  ],
  [
    "Managed columns",
    "Hidden columns from stay_id through sync_error belong to automation. Apply writes stable stay/property/Journey bindings and source hash after validation. Live URL and verification time are written only after a verified deployment. Keep assigned IDs when editing or moving rows.",
  ],
  [
    "Existing stays",
    "Existing site lodging remains authoritative. This tab starts without copied or invented stay records and does not remove existing content.",
  ],
  [
    "Journey choices",
    "The dropdown uses the workbook's current Atlas Reference Journey labels at setup time. New Journeys may require a future dropdown refresh; setup will not overwrite existing tabs.",
  ],
  [
    "Boundaries",
    "Main Atlas editorial stays are separate from private My Atlas trip lodging. Only registered owned/licensed Media IDs are ingested; Drive Folder remains source reference and is not uploaded by this command. Off or deleted rows do not silently unpublish existing stays. New geography uses its own explicit review workflow.",
  ],
])

const dropdowns = {
  "Atlas Mode": ["Off", "Preview", "Publish"],
  "Review Status": ["Draft", "Needs review", "Ready for preview"],
  "Property Type": [
    "Hotel",
    "Airbnb",
    "Vacation rental",
    "Guesthouse",
    "Other",
  ],
  "Location Precision": ["Town / area", "Approximate", "Exact public property"],
  "Show on Map": ["No", "Yes"],
  Relationship: [
    "Independent",
    "Hosted",
    "Sponsored",
    "Affiliate",
    "Mixed",
    "Needs review",
  ],
}
const defaults = {
  "Atlas Mode": "Off",
  "Review Status": "Draft",
  "Location Precision": "Town / area",
  "Show on Map": "No",
}
const cell = value => ({ userEnteredValue: { stringValue: value } })

export function buildStaysSheetSetup({ sheets, journeyLabels }) {
  const existing = [STAYS_TITLE, STAYS_GUIDE_TITLE].filter(title =>
    sheets.some(sheet => sheet.title === title)
  )
  if (existing.length === 2)
    return { requests: [], created: [], alreadyExists: true }
  if (existing.length)
    throw new Error(
      `Existing ${existing[0]} tab left untouched. Inspect the workbook before adding the missing tab.`
    )
  const journeys = [...new Set(journeyLabels.filter(Boolean))].sort()
  if (!journeys.length)
    throw new Error("No canonical Journey choices found in Atlas Reference")
  const usedIds = new Set(sheets.map(sheet => sheet.sheetId))
  const nextId = () => {
    let id = 1000
    while (usedIds.has(id)) id += 1
    usedIds.add(id)
    return id
  }
  const staysId = nextId()
  const guideId = nextId()
  const range = (
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex
  ) => ({
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex,
  })
  const requests = [
    {
      addSheet: {
        properties: {
          sheetId: staysId,
          title: STAYS_TITLE,
          gridProperties: {
            rowCount: STAYS_ROW_COUNT,
            columnCount: STAYS_HEADERS.length,
            frozenRowCount: 1,
            frozenColumnCount: 2,
          },
        },
      },
    },
    {
      addSheet: {
        properties: {
          sheetId: guideId,
          title: STAYS_GUIDE_TITLE,
          gridProperties: { rowCount: 30, columnCount: 2, frozenRowCount: 1 },
        },
      },
    },
    {
      updateCells: {
        start: { sheetId: staysId, rowIndex: 0, columnIndex: 0 },
        rows: [
          {
            values: STAYS_HEADERS.map((name, index) => ({
              ...cell(name),
              note:
                fields[index]?.[1] ||
                "Automation-owned stay identity or processing receipt. Keep assigned IDs; use editorial:stays for updates.",
            })),
          },
          ...Array.from({ length: STAYS_ROW_COUNT - 1 }, () => ({
            values: STAYS_HEADERS.map(name => cell(defaults[name] || "")),
          })),
        ],
        fields: "userEnteredValue,note",
      },
    },
    {
      updateCells: {
        start: { sheetId: guideId, rowIndex: 0, columnIndex: 0 },
        rows: STAYS_GUIDE_ROWS.map(row => ({ values: row.map(cell) })),
        fields: "userEnteredValue",
      },
    },
  ]
  for (const [name, values] of Object.entries({
    ...dropdowns,
    "Atlas Journey": journeys,
  })) {
    const column = STAYS_HEADERS.indexOf(name)
    requests.push({
      setDataValidation: {
        range: range(staysId, 1, STAYS_ROW_COUNT, column, column + 1),
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: values.map(userEnteredValue => ({ userEnteredValue })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    })
  }
  for (const name of ["Check-in Date", "Check-out Date"]) {
    const column = STAYS_HEADERS.indexOf(name)
    const dates = range(staysId, 1, STAYS_ROW_COUNT, column, column + 1)
    requests.push(
      {
        setDataValidation: {
          range: dates,
          rule: {
            condition: { type: "DATE_IS_VALID" },
            strict: true,
            showCustomUi: true,
          },
        },
      },
      {
        repeatCell: {
          range: dates,
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "DATE", pattern: "yyyy-mm-dd" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      }
    )
  }
  const nights = STAYS_HEADERS.indexOf("Nights")
  requests.push({
    setDataValidation: {
      range: range(staysId, 1, STAYS_ROW_COUNT, nights, nights + 1),
      rule: {
        condition: {
          type: "NUMBER_GREATER_THAN_EQ",
          values: [{ userEnteredValue: "0" }],
        },
        strict: true,
      },
    },
  })
  for (const [sheetId, count] of [
    [staysId, STAYS_HEADERS.length],
    [guideId, 2],
  ]) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "WRAP",
              verticalAlignment: "TOP",
            },
          },
          fields:
            "userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment",
        },
      },
      {
        repeatCell: {
          range: range(sheetId, 0, 1, 0, count),
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.06, green: 0.12, blue: 0.2 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 0.7, blue: 0.25 },
              },
            },
          },
          fields: "userEnteredFormat",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: count,
          },
          properties: { pixelSize: 195 },
          fields: "pixelSize",
        },
      }
    )
  }
  const managedStart = fields.length
  requests.push(
    {
      setBasicFilter: {
        filter: {
          range: range(staysId, 0, STAYS_ROW_COUNT, 0, STAYS_HEADERS.length),
        },
      },
    },
    {
      addProtectedRange: {
        protectedRange: {
          range: range(
            staysId,
            0,
            STAYS_ROW_COUNT,
            managedStart,
            STAYS_HEADERS.length
          ),
          description: "Reserved Stays automation columns",
          warningOnly: true,
        },
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: staysId,
          dimension: "COLUMNS",
          startIndex: managedStart,
          endIndex: STAYS_HEADERS.length,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
    {
      addProtectedRange: {
        protectedRange: {
          range: range(staysId, 0, 1, 0, STAYS_HEADERS.length),
          description: "Stays intake schema headers",
          warningOnly: true,
        },
      },
    },
    {
      addProtectedRange: {
        protectedRange: {
          range: { sheetId: guideId },
          description: "Stays intake instructions",
          warningOnly: true,
        },
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: guideId,
          dimension: "COLUMNS",
          startIndex: 1,
          endIndex: 2,
        },
        properties: { pixelSize: 760 },
        fields: "pixelSize",
      },
    }
  )
  return {
    requests,
    created: [
      { title: STAYS_TITLE, sheetId: staysId },
      { title: STAYS_GUIDE_TITLE, sheetId: guideId },
    ],
    alreadyExists: false,
  }
}
