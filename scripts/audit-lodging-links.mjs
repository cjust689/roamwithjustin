import { pathToFileURL } from "node:url"
import { journeyRecords } from "../src/content/journeys/index.mjs"
import { experienceRecords } from "../src/content/experiences/index.mjs"
import { getPartner } from "../src/content/partners/index.mjs"

function preferredLodgingLink(externalLinks = {}) {
  if (externalLinks.official) {
    return { kind: "official", url: externalLinks.official }
  }
  if (externalLinks.directory) {
    return { kind: "directory", url: externalLinks.directory }
  }
  if (externalLinks.platform) {
    return { kind: "platform", url: externalLinks.platform }
  }
  if (externalLinks.maps) {
    return { kind: "maps-only", url: externalLinks.maps }
  }
  return { kind: "missing", url: "" }
}

export function auditLodgingRecords({
  journeys = journeyRecords,
  experiences = experienceRecords,
  partnerLookup = getPartner,
} = {}) {
  const issues = []
  const rows = journeys.flatMap(journey =>
    (journey.lodging || []).map(stay => {
      const partner = partnerLookup(stay.partnerId)
      const link = preferredLodgingLink(partner?.externalLinks)
      const owner = `${journey.id} / ${stay.name}`

      if (!partner) issues.push(`${owner}: unknown Partner ${stay.partnerId}`)
      if (partner && partner.kind !== "lodging") {
        issues.push(`${owner}: Partner must use kind lodging`)
      }
      if (partner && partner.name !== stay.name) {
        issues.push(`${owner}: stay name does not match canonical Partner`)
      }
      if (!/^[a-z0-9][a-z0-9-]{2,99}$/.test(stay.partnerId || "")) {
        issues.push(`${owner}: invalid tracking slug`)
      }
      if (
        !["official", "directory", "platform"].includes(link.kind) &&
        partner?.linkPolicy !== "omitted-for-privacy"
      ) {
        issues.push(
          `${owner}: property website or reviewed directory is missing`
        )
      }
      if (link.url && !/^https:\/\//i.test(link.url)) {
        issues.push(`${owner}: link must use https`)
      }
      if (Object.prototype.hasOwnProperty.call(stay, "link")) {
        issues.push(`${owner}: URL is duplicated outside the Partner registry`)
      }

      return {
        journeyId: journey.id,
        property: partner?.name || stay.name,
        trackingSlug: stay.partnerId || "",
        linkType: link.kind,
        url: link.url,
        status:
          ["official", "directory", "platform"].includes(link.kind) ||
          partner?.linkPolicy === "omitted-for-privacy"
            ? "ready"
            : "review",
      }
    })
  )

  const structuredPropertyNames = new Set(
    rows.map(row => row.property.trim().toLowerCase())
  )
  const candidates = experiences
    .filter(
      experience =>
        experience.visibility === "published" &&
        /\b(?:airbnb|hotel|resort|villa|lodging|vacation rental)\b/i.test(
          experience.title || ""
        ) &&
        !structuredPropertyNames.has(
          String(experience.title || "")
            .trim()
            .toLowerCase()
        )
    )
    .map(experience => ({
      journeyId: experience.journeyId,
      sourceType: "experience",
      sourceId: experience.id,
      property: experience.title,
      status: "owner-url-required",
    }))

  return { candidates, issues, rows }
}

function run() {
  const { candidates, issues, rows } = auditLodgingRecords()
  const json = process.argv.includes("--json")
  const checkOnly = process.argv.includes("--check")

  if (json) {
    console.log(JSON.stringify({ candidates, issues, rows }, null, 2))
  } else if (checkOnly) {
    console.log(
      `Lodging link audit checked ${rows.length} records with ${issues.length} issue(s) and ${candidates.length} owner URL candidate(s).`
    )
  } else {
    console.table(rows)
    if (candidates.length) {
      console.log("\nPublished lodging candidates awaiting an exact owner URL:")
      console.table(candidates)
    }
    console.log(
      `\nUpdate URLs and tracking slugs in src/content/partners/index.mjs. ` +
        `Journey lodging records keep only partnerId references. Convert a ` +
        `candidate only after its exact property or listing URL is confirmed.`
    )
    if (issues.length) {
      console.error("\nReview required:\n- " + issues.join("\n- "))
    }
  }

  if (issues.length) process.exitCode = 1
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  run()
}
