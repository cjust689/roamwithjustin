import { spawnSync } from "node:child_process"
import {
  DEFAULT_DEVELOP_BRANCH,
  DEFAULT_MAIN_BRANCH,
  createGitHubClient,
  loadGitHubCredential,
  parseGitHubRemote,
  summarizeGitHubAudit,
} from "./lib/editorial-github.mjs"

function usage() {
  return `Usage:
  npm run editorial:github:audit -- [--remote origin] [--develop develop] [--main main] [--json]

This command reads Git and GitHub repository configuration only. It obtains the
GitHub token from the configured Git Credential Manager without printing or
persisting it. It does not create branches, pull requests, merges, or settings.`
}

function readValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseArgs(args) {
  const options = {
    remote: "origin",
    develop: DEFAULT_DEVELOP_BRANCH,
    main: DEFAULT_MAIN_BRANCH,
    json: false,
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--remote") {
      options.remote = readValue(args, index, "--remote")
      index += 1
    } else if (argument.startsWith("--remote=")) {
      options.remote = argument.slice("--remote=".length)
    } else if (argument === "--develop") {
      options.develop = readValue(args, index, "--develop")
      index += 1
    } else if (argument.startsWith("--develop=")) {
      options.develop = argument.slice("--develop=".length)
    } else if (argument === "--main") {
      options.main = readValue(args, index, "--main")
      index += 1
    } else if (argument.startsWith("--main=")) {
      options.main = argument.slice("--main=".length)
    } else if (argument === "--json") {
      options.json = true
    } else if (argument === "--help" || argument === "-h") {
      options.help = true
    } else {
      throw new Error(`Unknown option: ${argument}`)
    }
  }
  return options
}

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${String(result.stderr || "").trim()}`
    )
  }
  return String(result.stdout || "").trim()
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  const remoteUrl = git(["remote", "get-url", options.remote])
  const repositoryIdentity = parseGitHubRemote(remoteUrl)
  const credential = loadGitHubCredential()
  const client = createGitHubClient({
    ...repositoryIdentity,
    token: credential.token,
  })
  const [
    repository,
    developBranch,
    mainBranch,
    developProtection,
    mainProtection,
    rulesets,
    developRules,
    mainRules,
  ] = await Promise.all([
    client.getRepository(),
    client.getBranch(options.develop),
    client.getBranch(options.main),
    client.getBranchProtection(options.develop),
    client.getBranchProtection(options.main),
    client.listRulesets(),
    client.getRulesForBranch(options.develop),
    client.getRulesForBranch(options.main),
  ])
  const rulesetDetails = await Promise.all(
    rulesets.map(ruleset => client.getRuleset(ruleset.id))
  )
  const report = summarizeGitHubAudit({
    repository,
    developBranch,
    mainBranch,
    developProtection,
    mainProtection,
    rulesets,
    rulesetDetails,
    developRules,
    mainRules,
  })
  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  console.log("Editorial GitHub integration audit (read-only)")
  console.log(
    `Repository: ${report.repository} (${report.visibility}), default ${report.defaultBranch}`
  )
  console.log(
    `Merge methods: merge commit ${report.mergeMethods.mergeCommit ? "enabled" : "disabled"}, auto-merge ${report.mergeMethods.autoMerge ? "enabled" : "disabled"}`
  )
  console.log(
    `Branches: ${report.branches.develop.name} ${report.branches.develop.protected ? "protected" : "unprotected"}; ${report.branches.main.name} ${report.branches.main.protected ? "protected" : "unprotected"}`
  )
  console.log(`Active rulesets: ${report.rulesets.length}`)
  console.log(
    `Effective rules: ${report.branches.develop.name} ${report.branches.develop.effectiveRules.map(rule => rule.type).join(", ") || "none"}; ${report.branches.main.name} ${report.branches.main.effectiveRules.map(rule => rule.type).join(", ") || "none"}`
  )
  console.log(
    `Reversible promotion prerequisites: ${report.readyForReversiblePromotion ? "ready" : "needs configuration"}`
  )
  console.log("Remote changes: none")
}

main().catch(error => {
  console.error(`Editorial GitHub audit failed: ${error.message}`)
  process.exitCode = 1
})
