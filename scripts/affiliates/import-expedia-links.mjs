import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { randomUUID } from "node:crypto"
import {
  extractExpediaTable,
  extractExpediaSheetGrid,
  compileExpediaLinks,
} from "../lib/expedia-destination-links.mjs"
import {
  authorizeGoogleReadOnly,
  SHEETS_READONLY_SCOPE,
} from "../lib/editorial-google-auth.mjs"

const args = process.argv.slice(2)
const option = name => {
  const i = args.indexOf(name)
  return i < 0 ? undefined : args[i + 1]
}
try {
  const file = option("--file")
  const sheetId =
    option("--spreadsheet-id") || process.env.EXPEDIA_LINKS_SPREADSHEET_ID
  if (Boolean(file) === Boolean(sheetId))
    throw Error(
      "Choose exactly one --file or --spreadsheet-id (or EXPEDIA_LINKS_SPREADSHEET_ID)"
    )
  let source, format, sheetRows
  if (file) {
    source = await fs.readFile(file, "utf8")
    format = file.endsWith(".csv") ? "csv" : "json"
  } else {
    const auth = await authorizeGoogleReadOnly(
      {
        tokenPath:
          process.env.EDITORIAL_GOOGLE_TOKEN_PATH ||
          path.join(
            os.homedir(),
            ".roam-with-justin",
            "editorial-google-token.json"
          ),
        scopes: [SHEETS_READONLY_SCOPE],
      },
      {
        interactiveAuthorize: async () => {
          throw Error(
            "Run the existing editorial Google authorization flow first; no browser authorization is started by import"
          )
        },
      }
    )
    const range = "'Expedia Flights'!A1:H1000"
    const result = await auth.request({
      method: "GET",
      url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`,
      params: {
        ranges: range,
        includeGridData: true,
        fields:
          "sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link(uri))),userEnteredValue(formulaValue)))))",
      },
    })
    sheetRows = extractExpediaSheetGrid(result.data)
  }
  const catalog = JSON.parse(
    await fs.readFile(
      option("--catalog") ||
        "src/features/my-atlas/data/place-catalog.proof.json",
      "utf8"
    )
  )
  const target = path.resolve("src/content/partners/expedia-flight-links.json")
  const previous = JSON.parse(await fs.readFile(target, "utf8"))
  const result = compileExpediaLinks(
    sheetRows || extractExpediaTable(source, format),
    catalog,
    previous
  )
  console.log(
    JSON.stringify(
      {
        mode: args.includes("--publish") ? "publish" : "dry-run",
        diff: result.diff,
        active: result.registry.links.filter(link => link.enabled).length,
      },
      null,
      2
    )
  )
  if (
    args.includes("--publish") &&
    result.serialized !== (await fs.readFile(target, "utf8"))
  ) {
    const temp = target + "." + randomUUID() + ".tmp"
    try {
      await fs.writeFile(temp, result.serialized, { flag: "wx" })
      await fs.rename(temp, target)
    } finally {
      await fs.rm(temp, { force: true })
    }
    console.log(
      "Published validated registry. Review the git diff before promotion. Roll back with the previous reviewed file."
    )
  }
} catch (error) {
  console.error(
    error.response
      ? `Google source request failed (${error.response.status}); published registry unchanged.`
      : error.message
  )
  process.exitCode = 1
}
