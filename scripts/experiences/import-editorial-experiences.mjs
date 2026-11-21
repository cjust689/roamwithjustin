import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getJourney } from "../../src/content/journeys/index.mjs"
import { getPartner } from "../../src/content/partners/index.mjs"
import {
  getMediaAsset,
  mediaPlacementRecords,
} from "../../src/content/media/index.mjs"
import generated from "../../src/content/editorial/generated/data.js"
import {
  compileCuratedExperiences,
  publishCuratedExperiences,
} from "../lib/curated-experiences.mjs"

const args = process.argv.slice(2)
const root = fileURLToPath(new URL("../../", import.meta.url))
const target = path.join(root, "src/content/experiences/curated.json")
try {
  const index = args.indexOf("--file")
  if (
    index < 0 ||
    !args[index + 1] ||
    args.some(
      (arg, i) => arg !== "--file" && arg !== "--publish" && i !== index + 1
    )
  )
    throw new Error(
      "Usage: npm run experiences:editorial:import -- --file PATH.json [--publish]. Preview is the default."
    )
  const source = path.resolve(args[index + 1])
  if (source === target)
    throw new Error(
      "Use a separate private intake file, not the public registry."
    )
  if ((await fs.stat(source)).size > 1_000_000)
    throw new Error("Intake exceeds 1 MB.")
  const input = JSON.parse(await fs.readFile(source, "utf8"))
  const previous = JSON.parse(await fs.readFile(target, "utf8"))
  const context = {
    getJourney,
    getPartner,
    getMediaAsset,
    placements: mediaPlacementRecords,
    generated: generated.experiences,
  }
  const result = compileCuratedExperiences(input, previous, context)
  console.log(
    JSON.stringify(
      {
        mode: args.includes("--publish") ? "publish" : "preview",
        diff: result.diff,
        published: result.registry.experiences.filter(
          record => record.visibility === "published"
        ).length,
      },
      null,
      2
    )
  )
  if (args.includes("--publish"))
    console.log(
      (await publishCuratedExperiences(target, result))
        ? "Updated the local registry. Review its diff before release."
        : "Registry unchanged."
    )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
