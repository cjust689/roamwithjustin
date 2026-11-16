import { spawnSync } from "node:child_process"
import {
  createGitHubClient,
  loadGitHubCredential,
  parseGitHubRemote,
} from "./lib/editorial-github.mjs"
import {
  buildHardenedRuleset,
  isHardenedRuleset,
  summarizeRulesetChange,
} from "./lib/editorial-github-rules.mjs"

function usage() {
  return `Usage:
  npm run editorial:github:configure -- --dry-run [--remote origin]
  npm run editorial:github:configure -- --apply [--remote origin]

This narrows the existing develop/main ruleset to merge commits and requires
the validate check. Apply is blocked until the validation workflow exists on
both remote branches.`
}

function parseArgs(args) {
  const options = { dryRun: false, apply: false, remote: "origin", help: false }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--apply") options.apply = true
    else if (argument === "--remote") {
      const value = args[index + 1]
      if (!value || value.startsWith("--")) throw new Error("--remote requires a value")
      options.remote = value
      index += 1
    } else if (argument === "--help" || argument === "-h") options.help = true
    else throw new Error(`Unknown option: ${argument}`)
  }
  return options
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr || "").trim()}`)
  }
  return { status: result.status, output: String(result.stdout || "").trim() }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) return console.log(usage())
  if (options.apply === options.dryRun) throw new Error("Choose exactly one of --dry-run or --apply")
  const repository = parseGitHubRemote(
    git(["remote", "get-url", options.remote]).output
  )
  const credential = loadGitHubCredential()
  const client = createGitHubClient({ ...repository, token: credential.token })
  const rulesets = await client.listRulesets()
  const candidates = []
  for (const entry of rulesets) {
    const detail = await client.getRuleset(entry.id)
    const included = detail.conditions?.ref_name?.include || []
    if (
      included.includes("refs/heads/develop") &&
      included.includes("refs/heads/main") &&
      detail.enforcement === "active"
    ) {
      candidates.push(detail)
    }
  }
  if (candidates.length !== 1) {
    throw new Error(`Expected one active ruleset for develop and main; found ${candidates.length}`)
  }
  const current = candidates[0]
  const planned = buildHardenedRuleset(current)
  const summary = summarizeRulesetChange(current, planned)
  if (options.dryRun) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary, remoteChanges: "none" }, null, 2))
    return
  }

  git(["fetch", options.remote, "develop", "main"])
  for (const branch of ["develop", "main"]) {
    const present = git(
      ["cat-file", "-e", `${options.remote}/${branch}:.github/workflows/editorial-publication-ci.yml`],
      { allowFailure: true }
    )
    if (present.status !== 0) {
      throw new Error(`Validation workflow is not installed on ${options.remote}/${branch}`)
    }
  }
  await client.updateRuleset(current.id, planned)
  const verified = await client.getRuleset(current.id)
  if (!isHardenedRuleset(verified)) {
    throw new Error("GitHub ruleset did not retain the hardened rules")
  }
  console.log(JSON.stringify({ mode: "applied", ...summary }, null, 2))
}

main().catch(error => {
  console.error(`Editorial GitHub configuration failed: ${error.message}`)
  process.exitCode = 1
})
