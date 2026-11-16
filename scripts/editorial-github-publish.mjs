import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createGitHubClient,
  loadGitHubCredential,
  normalizePublicationPaths,
  parseGitHubRemote,
  publicationBranchName,
} from "./lib/editorial-github.mjs"
import {
  createCommandRunner,
  publicationFingerprint,
  publishGeneratedPost,
} from "./lib/editorial-github-publisher.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

function usage() {
  return `Usage:
  npm run editorial:github:publish -- --post-id <id> --label <label> --path src/content/media/generated/records.json --dry-run
  npm run editorial:github:publish -- --post-id <id> --label <label> --path src/content/media/generated/records.json --public-url <url> --expect <exact rendered marker> --apply

The apply path validates in an isolated worktree, creates a per-post branch and
pull request, merges with a merge commit into develop, revalidates develop,
promotes develop to main with another merge commit, waits for Pages, and checks
the rendered public page for every exact marker. Only explicit automation-owned
generated paths are accepted.`
}

function value(args, index, option) {
  const candidate = args[index + 1]
  if (!candidate || candidate.startsWith("--")) {
    throw new Error(`${option} requires a value`)
  }
  return candidate
}

function parseArgs(args) {
  const options = {
    postId: null,
    label: null,
    paths: [],
    publicUrl: null,
    expectedMarkers: [],
    remote: "origin",
    develop: "develop",
    main: "main",
    dryRun: false,
    apply: false,
    timeoutMinutes: 30,
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (
      [
        "--post-id",
        "--label",
        "--path",
        "--remote",
        "--develop",
        "--main",
        "--timeout-minutes",
        "--public-url",
        "--expect",
      ].includes(argument)
    ) {
      const candidate = value(args, index, argument)
      index += 1
      if (argument === "--post-id") options.postId = candidate
      else if (argument === "--label") options.label = candidate
      else if (argument === "--path") options.paths.push(candidate)
      else if (argument === "--remote") options.remote = candidate
      else if (argument === "--develop") options.develop = candidate
      else if (argument === "--main") options.main = candidate
      else if (argument === "--public-url") options.publicUrl = candidate
      else if (argument === "--expect") options.expectedMarkers.push(candidate)
      else options.timeoutMinutes = Number(candidate)
    } else if (argument === "--dry-run") options.dryRun = true
    else if (argument === "--apply") options.apply = true
    else if (argument === "--help" || argument === "-h") options.help = true
    else throw new Error(`Unknown option: ${argument}`)
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  if (!options.postId || !options.label) {
    throw new Error("--post-id and --label are required")
  }
  if (options.apply === options.dryRun) {
    throw new Error("Choose exactly one of --dry-run or --apply")
  }
  if (!Number.isFinite(options.timeoutMinutes) || options.timeoutMinutes <= 0) {
    throw new Error("--timeout-minutes must be positive")
  }
  if (options.apply && (!options.publicUrl || !options.expectedMarkers.length)) {
    throw new Error("--apply requires --public-url and at least one exact --expect marker")
  }
  const paths = normalizePublicationPaths(options.paths)
  const sourceHash = publicationFingerprint({ sourceRoot: projectRoot, paths })
  const branch = publicationBranchName({
    postId: options.postId,
    label: options.label,
    sourceHash,
  })
  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          postId: options.postId,
          sourceHash,
          branch,
          paths,
          remoteChanges: "none",
        },
        null,
        2
      )
    )
    return
  }

  const command = createCommandRunner()
  const remoteUrl = command(
    "git",
    ["remote", "get-url", options.remote],
    { cwd: projectRoot }
  )
  const repository = parseGitHubRemote(remoteUrl)
  const credential = loadGitHubCredential()
  const client = createGitHubClient({
    ...repository,
    token: credential.token,
  })
  const result = await publishGeneratedPost({
    sourceRoot: projectRoot,
    stateRoot: path.join(
      projectRoot,
      ".state",
      "editorial",
      "github-worktrees"
    ),
    postId: options.postId,
    label: options.label,
    paths,
    client,
    owner: repository.owner,
    remote: options.remote,
    develop: options.develop,
    main: options.main,
    command,
    timeoutMs: options.timeoutMinutes * 60 * 1000,
    publicVerification: {
      url: options.publicUrl,
      expectedMarkers: options.expectedMarkers,
    },
  })
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(`Editorial GitHub publication failed: ${error.message}`)
  process.exitCode = 1
})
