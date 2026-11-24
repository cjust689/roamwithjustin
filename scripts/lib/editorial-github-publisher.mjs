import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { spawnEditorialCommand } from "./editorial-process.mjs"
import {
  DEFAULT_DEVELOP_BRANCH,
  DEFAULT_MAIN_BRANCH,
  EDITORIAL_PUBLICATION_WORKFLOW,
  PAGES_DEPLOYMENT_WORKFLOW,
  evaluateValidationChecks,
  evaluateWorkflowRuns,
  normalizePublicationPaths,
  publicationBranchName,
  waitForGate,
} from "./editorial-github.mjs"

function commandError(command, args, result) {
  const detail = String(result.stderr || result.stdout || "").trim()
  return new Error(
    `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`
  )
}

export function createCommandRunner(execute = spawnSync) {
  return (command, args, options = {}) => {
    const result = spawnEditorialCommand(
      command,
      args,
      {
        encoding: "utf8",
        windowsHide: true,
        ...options,
      },
      { execute }
    )
    if (result.error) throw result.error
    if (result.status !== 0) throw commandError(command, args, result)
    // Porcelain Git status uses leading spaces as meaningful status columns.
    // Preserve them so the scope guard never cuts into the first file path.
    return String(result.stdout || "").trimEnd()
  }
}

export function publicationFingerprint({ sourceRoot, paths }) {
  const digest = crypto.createHash("sha256")
  normalizePublicationPaths(paths).forEach(relativePath => {
    const absolutePath = path.resolve(sourceRoot, relativePath)
    const relative = path.relative(path.resolve(sourceRoot), absolutePath)
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Publication source escapes repository: ${relativePath}`)
    }
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`Publication source is not a file: ${relativePath}`)
    }
    digest.update(relativePath)
    digest.update("\0")
    digest.update(fs.readFileSync(absolutePath))
    digest.update("\0")
  })
  return digest.digest("hex")
}

export function assertScopedChanges(statusOutput, allowedPaths) {
  const allowed = new Set(normalizePublicationPaths(allowedPaths))
  const changed = String(statusOutput || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.slice(3).replace(/\\/g, "/"))
    .map(value => (value.includes(" -> ") ? value.split(" -> ").at(-1) : value))
  const unexpected = changed.filter(relativePath => !allowed.has(relativePath))
  if (unexpected.length) {
    throw new Error(
      `Isolated publication contains unexpected paths: ${unexpected.join(", ")}`
    )
  }
  return changed
}

export function resolveBrowserPath(environment = process.env) {
  const candidates = [
    environment.EDITORIAL_BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean)
  const browserPath = candidates.find(candidate => fs.existsSync(candidate))
  if (!browserPath) {
    throw new Error(
      "No headless browser found; set EDITORIAL_BROWSER_PATH for public verification"
    )
  }
  return browserPath
}

export function renderPublicUrl({
  url,
  browserPath = resolveBrowserPath(),
  command = createCommandRunner(),
}) {
  const parsed = new URL(url)
  if (parsed.protocol !== "https:") {
    throw new Error("Public verification URL must use HTTPS")
  }
  return command(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--virtual-time-budget=12000",
      "--dump-dom",
      parsed.toString(),
    ],
    { timeout: 60000 }
  )
}

export async function verifyPublicPublication({
  url,
  expectedMarkers,
  render = renderPublicUrl,
  timeoutMs = 10 * 60 * 1000,
  pollMs = 15 * 1000,
}) {
  const markers = [
    ...new Set((expectedMarkers || []).map(String).filter(Boolean)),
  ]
  if (!markers.length) {
    throw new Error(
      "Public verification requires at least one exact content marker"
    )
  }
  return waitForGate({
    timeoutMs,
    pollMs,
    read: () => Promise.resolve(render({ url })),
    evaluate: html => {
      const missing = markers.filter(marker => !String(html).includes(marker))
      return missing.length
        ? { state: "waiting", reason: `missing marker: ${missing[0]}` }
        : { state: "succeeded", reason: "exact-content-present", url }
    },
  })
}

function isInside(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

function copyPublicationPaths({ sourceRoot, worktree, paths }) {
  paths.forEach(relativePath => {
    const source = path.resolve(sourceRoot, relativePath)
    const target = path.resolve(worktree, relativePath)
    if (!isInside(source, sourceRoot) || !isInside(target, worktree)) {
      throw new Error(`Unsafe publication path: ${relativePath}`)
    }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(source, target)
  })
}

async function findOrCreatePullRequest({
  client,
  owner,
  headBranch,
  base,
  title,
  body,
}) {
  const existing = await client.listPullRequests({
    head: `${owner}:${headBranch}`,
    base,
    state: "open",
  })
  if (existing.length > 1) {
    throw new Error(
      `More than one open ${headBranch} -> ${base} pull request exists`
    )
  }
  if (existing.length === 1) return existing[0]
  return client.createPullRequest({ title, head: headBranch, base, body })
}

async function waitForPullRequestValidation({
  client,
  pullNumber,
  timeoutMs,
  pollMs,
}) {
  let lastHeadSha = null
  return waitForGate({
    timeoutMs,
    pollMs,
    read: async () => {
      const pull = await client.getPullRequest(pullNumber)
      lastHeadSha = pull.head?.sha || lastHeadSha
      if (!lastHeadSha) return { check_runs: [] }
      return client.listCheckRunsForRef(lastHeadSha)
    },
    evaluate: evaluateValidationChecks,
  })
}

async function waitForWorkflow({
  client,
  workflow,
  branch,
  headSha,
  event,
  timeoutMs,
  pollMs,
}) {
  return waitForGate({
    timeoutMs,
    pollMs,
    read: () => client.listWorkflowRuns({ workflow, branch, headSha, event }),
    evaluate: payload => evaluateWorkflowRuns(payload, { headSha }),
  })
}

async function mergeValidatedPullRequest({
  client,
  pull,
  title,
  timeoutMs,
  pollMs,
}) {
  await waitForPullRequestValidation({
    client,
    pullNumber: pull.number,
    timeoutMs,
    pollMs,
  })
  const current = await client.getPullRequest(pull.number)
  if (current.state !== "open") {
    if (current.merged) return current.merge_commit_sha
    throw new Error(`Pull request #${pull.number} closed without merging`)
  }
  const result = await client.mergePullRequest(pull.number, {
    sha: current.head.sha,
    commit_title: title,
    commit_message: `Post publication promoted through pull request #${pull.number}.`,
  })
  if (!result.merged || !result.sha) {
    throw new Error(
      `GitHub did not merge pull request #${pull.number}: ${result.message || "unknown reason"}`
    )
  }
  return result.sha
}

function readCheckpoint(checkpointPath) {
  if (!fs.existsSync(checkpointPath)) return null
  const value = JSON.parse(fs.readFileSync(checkpointPath, "utf8"))
  if (!value || value.schemaVersion !== 1) {
    throw new Error(
      `Unsupported GitHub publication checkpoint: ${checkpointPath}`
    )
  }
  return value
}

function writeCheckpoint(checkpointPath, value) {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true })
  const temporaryPath = `${checkpointPath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(temporaryPath, checkpointPath)
}

function updateCheckpoint(checkpointPath, checkpoint, changes) {
  Object.assign(checkpoint, changes, { updatedAt: new Date().toISOString() })
  writeCheckpoint(checkpointPath, checkpoint)
}

function prepareAndPushPublication({
  sourceRoot,
  worktreeRoot,
  remote,
  develop,
  branch,
  postId,
  label,
  sourceHash,
  scopedPaths,
  command,
  install,
}) {
  const worktree = fs.mkdtempSync(path.join(worktreeRoot, "publication-"))
  let registeredWorktree = false
  try {
    command(
      "git",
      ["worktree", "add", "--detach", worktree, `${remote}/${develop}`],
      { cwd: sourceRoot }
    )
    registeredWorktree = true
    copyPublicationPaths({ sourceRoot, worktree, paths: scopedPaths })
    const changed = assertScopedChanges(
      command("git", ["status", "--short", "--untracked-files=all"], {
        cwd: worktree,
      }),
      scopedPaths
    )
    if (!changed.length) return null

    if (install) {
      command("npm", ["ci"], { cwd: worktree, stdio: "inherit" })
    }
    command("npm", ["run", "editorial:test"], {
      cwd: worktree,
      stdio: "inherit",
    })
    command("npm", ["run", "build"], {
      cwd: worktree,
      stdio: "inherit",
    })
    assertScopedChanges(
      command("git", ["status", "--short", "--untracked-files=all"], {
        cwd: worktree,
      }),
      scopedPaths
    )
    // Validation failures should not reserve the deterministic retry branch.
    command("git", ["switch", "-c", branch], { cwd: worktree })
    command("git", ["add", "--", ...scopedPaths], { cwd: worktree })
    command(
      "git",
      [
        "commit",
        "-m",
        `atlas(post): publish ${label}`,
        "-m",
        `Post-ID: ${postId}\nSource-Hash: ${sourceHash}`,
      ],
      { cwd: worktree }
    )
    const publicationCommit = command("git", ["rev-parse", "HEAD"], {
      cwd: worktree,
    })
    command("git", ["push", "--set-upstream", remote, `${branch}:${branch}`], {
      cwd: worktree,
      stdio: "inherit",
    })
    return publicationCommit
  } finally {
    if (registeredWorktree) {
      try {
        command("git", ["worktree", "remove", "--force", worktree], {
          cwd: sourceRoot,
        })
        registeredWorktree = false
      } catch {
        // Keep the private worktree registered for manual recovery on failure.
      }
    }
    if (
      !registeredWorktree &&
      fs.existsSync(worktree) &&
      isInside(worktree, worktreeRoot)
    ) {
      fs.rmSync(worktree, { recursive: true, force: true })
    }
  }
}

export async function publishGeneratedPost({
  sourceRoot,
  stateRoot,
  postId,
  label,
  paths,
  client,
  owner,
  remote = "origin",
  develop = DEFAULT_DEVELOP_BRANCH,
  main = DEFAULT_MAIN_BRANCH,
  command = createCommandRunner(),
  timeoutMs = 30 * 60 * 1000,
  pollMs = 10 * 1000,
  install = true,
  publicVerification = null,
}) {
  const scopedPaths = normalizePublicationPaths(paths)
  const sourceHash = publicationFingerprint({
    sourceRoot,
    paths: scopedPaths,
  })
  const branch = publicationBranchName({ postId, label, sourceHash })
  const stateDirectory = path.resolve(stateRoot)
  if (!isInside(stateDirectory, sourceRoot)) {
    throw new Error("Publisher state directory must stay inside the repository")
  }
  fs.mkdirSync(stateDirectory, { recursive: true })
  const worktreeRoot = path.join(stateDirectory, "worktrees")
  fs.mkdirSync(worktreeRoot, { recursive: true })
  const checkpointPath = path.join(
    stateDirectory,
    "publications",
    `${String(postId).replace(/[^a-zA-Z0-9-]/g, "-")}-${sourceHash.slice(0, 12)}.json`
  )
  const checkpoint = readCheckpoint(checkpointPath) || {
    schemaVersion: 1,
    postId,
    label,
    sourceHash,
    branch,
    paths: scopedPaths,
    createdAt: new Date().toISOString(),
  }
  if (
    checkpoint.postId !== postId ||
    checkpoint.sourceHash !== sourceHash ||
    checkpoint.branch !== branch ||
    JSON.stringify(checkpoint.paths) !== JSON.stringify(scopedPaths)
  ) {
    throw new Error(
      `GitHub publication checkpoint does not match current input: ${checkpointPath}`
    )
  }

  command("git", ["fetch", "--prune", remote, develop, main], {
    cwd: sourceRoot,
  })
  if (!checkpoint.developMergeSha) {
    const branchDiff = command(
      "git",
      [
        "diff",
        "--name-only",
        `${remote}/${main}`,
        `${remote}/${develop}`,
        "--",
      ],
      { cwd: sourceRoot }
    )
    if (branchDiff) {
      throw new Error(
        `${develop} and ${main} contain different source trees; reconcile them before publishing one post`
      )
    }
  }

  if (!checkpoint.publicationCommit) {
    const publicationCommit = prepareAndPushPublication({
      sourceRoot,
      worktreeRoot,
      remote,
      develop,
      branch,
      postId,
      label,
      sourceHash,
      scopedPaths,
      command,
      install,
    })
    if (!publicationCommit) {
      return {
        state: "unchanged",
        postId,
        sourceHash,
        branch,
        paths: scopedPaths,
      }
    }
    updateCheckpoint(checkpointPath, checkpoint, { publicationCommit })
  }

  if (!checkpoint.developMergeSha) {
    const developPull = await findOrCreatePullRequest({
      client,
      owner,
      headBranch: branch,
      base: develop,
      title: `Atlas post: ${label}`,
      body: `Automated single-post publication.\n\nPost ID: \`${postId}\`\nSource hash: \`${sourceHash}\`\n\nOnly automation-owned generated paths are included.`,
    })
    updateCheckpoint(checkpointPath, checkpoint, {
      developPull: developPull.number,
    })
    const developMergeSha = await mergeValidatedPullRequest({
      client,
      pull: developPull,
      title: `Merge Atlas post ${postId} into ${develop}`,
      timeoutMs,
      pollMs,
    })
    updateCheckpoint(checkpointPath, checkpoint, { developMergeSha })
  }
  if (!checkpoint.developValidatedAt) {
    await waitForWorkflow({
      client,
      workflow: EDITORIAL_PUBLICATION_WORKFLOW,
      branch: develop,
      headSha: checkpoint.developMergeSha,
      event: "push",
      timeoutMs,
      pollMs,
    })
    updateCheckpoint(checkpointPath, checkpoint, {
      developValidatedAt: new Date().toISOString(),
    })
  }

  if (!checkpoint.mainMergeSha) {
    const mainPull = await findOrCreatePullRequest({
      client,
      owner,
      headBranch: develop,
      base: main,
      title: `Promote Atlas post ${postId} to production`,
      body: `Promotes the validated merge commit for Post ID \`${postId}\` from \`${develop}\` to \`${main}\`.`,
    })
    updateCheckpoint(checkpointPath, checkpoint, { mainPull: mainPull.number })
    const mainMergeSha = await mergeValidatedPullRequest({
      client,
      pull: mainPull,
      title: `Promote Atlas post ${postId} to ${main}`,
      timeoutMs,
      pollMs,
    })
    updateCheckpoint(checkpointPath, checkpoint, { mainMergeSha })
  }
  if (!checkpoint.deployment) {
    const deployment = await waitForWorkflow({
      client,
      workflow: PAGES_DEPLOYMENT_WORKFLOW,
      branch: main,
      headSha: checkpoint.mainMergeSha,
      event: "push",
      timeoutMs,
      pollMs,
    })
    updateCheckpoint(checkpointPath, checkpoint, {
      deployment,
      deployedAt: new Date().toISOString(),
    })
  }
  if (!checkpoint.publicVerification) {
    if (
      !publicVerification?.url ||
      !publicVerification?.expectedMarkers?.length
    ) {
      throw new Error(
        "Deployment completed, but exact public URL verification input is missing"
      )
    }
    const publicResult = await verifyPublicPublication({
      ...publicVerification,
      timeoutMs: Math.min(timeoutMs, 10 * 60 * 1000),
      pollMs,
    })
    updateCheckpoint(checkpointPath, checkpoint, {
      publicVerification: publicResult,
      publicVerifiedAt: new Date().toISOString(),
    })
  }

  return {
    state: "deployed",
    postId,
    sourceHash,
    branch,
    paths: scopedPaths,
    publicationCommit: checkpoint.publicationCommit,
    developPull: checkpoint.developPull,
    developMergeSha: checkpoint.developMergeSha,
    mainPull: checkpoint.mainPull,
    mainMergeSha: checkpoint.mainMergeSha,
    deployment: checkpoint.deployment,
    publicVerification: checkpoint.publicVerification,
    checkpointPath,
  }
}
