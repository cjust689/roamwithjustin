import { spawnSync } from "node:child_process"

export const DEFAULT_DEVELOP_BRANCH = "develop"
export const DEFAULT_MAIN_BRANCH = "main"
export const GITHUB_API_VERSION = "2022-11-28"
export const EDITORIAL_VALIDATION_CHECK = "validate"
export const EDITORIAL_PUBLICATION_WORKFLOW = "editorial-publication-ci.yml"
export const PAGES_DEPLOYMENT_WORKFLOW = "deploy-pages.yml"
export const PUBLICATION_PATH_ALLOWLIST = Object.freeze([
  "src/content/media/generated/records.json",
  "src/content/editorial/generated/records.json",
  "src/content/geography/generated/records.json",
  "src/content/lodging/generated/records.json",
])

export function parseGitHubRemote(remoteUrl) {
  const value = String(remoteUrl || "").trim()
  const httpsMatch = value.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i
  )
  const sshMatch = value.match(
    /^(?:ssh:\/\/)?git@github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/i
  )
  const match = httpsMatch || sshMatch
  if (!match) {
    throw new Error(`Remote is not a supported GitHub URL: ${value}`)
  }
  return { owner: match[1], repo: match[2] }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function publicationBranchName({ postId, label, sourceHash = "" }) {
  const stableId = slugify(postId)
  if (!stableId) throw new Error("A stable Post ID is required for a branch")
  const suffix = slugify(label).slice(0, 48)
  const revision = slugify(sourceHash).slice(0, 10)
  return `atlas/post-${stableId}${revision ? `-r${revision}` : ""}${suffix ? `-${suffix}` : ""}`.slice(
    0,
    120
  )
}

export function parseGitCredentialOutput(output) {
  const values = Object.fromEntries(
    String(output || "")
      .split(/\r?\n/)
      .filter(line => line.includes("="))
      .map(line => {
        const separator = line.indexOf("=")
        return [line.slice(0, separator), line.slice(separator + 1)]
      })
  )
  if (!values.password) {
    throw new Error("Git Credential Manager returned no GitHub token")
  }
  return {
    username: values.username || null,
    token: values.password,
  }
}

export function loadGitHubCredential({
  execute = spawnSync,
  environment = process.env,
} = {}) {
  const environmentToken = String(
    environment.EDITORIAL_GITHUB_TOKEN ||
      environment.GH_TOKEN ||
      environment.GITHUB_TOKEN ||
      ""
  ).trim()
  if (environmentToken) {
    return { username: null, token: environmentToken, source: "environment" }
  }
  const result = execute("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
    env: {
      ...environment,
      GCM_INTERACTIVE: "Never",
      GIT_TERMINAL_PROMPT: "0",
    },
  })
  if (result.error) throw result.error
  if (result.signal) {
    throw new Error(`Git Credential Manager stopped with ${result.signal}`)
  }
  if (result.status !== 0) {
    throw new Error(
      `Git Credential Manager failed with status ${result.status}`
    )
  }
  return {
    ...parseGitCredentialOutput(result.stdout),
    source: "git-credential",
  }
}

export function createGitHubClient({
  owner,
  repo,
  token,
  request = globalThis.fetch,
}) {
  if (!owner || !repo || !token) {
    throw new Error("GitHub client requires owner, repository, and token")
  }
  if (typeof request !== "function") {
    throw new Error("GitHub client requires a fetch-compatible request")
  }

  async function api(path, options = {}) {
    const response = await request(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "RoamWithJustin-editorial-publisher/1.0",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        ...(options.headers || {}),
      },
    })
    const responseText = await response.text()
    let data = null
    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        data = responseText
      }
    }
    if (!response.ok) {
      const error = new Error(
        `GitHub API ${response.status}: ${data?.message || response.statusText}`
      )
      error.status = response.status
      error.data = data
      throw error
    }
    return data
  }

  return {
    getRepository: () => api(`/repos/${owner}/${repo}`),
    getBranch: branch =>
      api(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`),
    async getBranchProtection(branch) {
      try {
        return await api(
          `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`
        )
      } catch (error) {
        if (error.status === 404) return null
        throw error
      }
    },
    listRulesets: () => api(`/repos/${owner}/${repo}/rulesets`),
    getRuleset: rulesetId =>
      api(`/repos/${owner}/${repo}/rulesets/${encodeURIComponent(rulesetId)}`),
    getRulesForBranch: branch =>
      api(
        `/repos/${owner}/${repo}/rules/branches/${encodeURIComponent(branch)}?per_page=100`
      ),
    updateRepository: changes =>
      api(`/repos/${owner}/${repo}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    updateRuleset: (rulesetId, changes) =>
      api(`/repos/${owner}/${repo}/rulesets/${encodeURIComponent(rulesetId)}`, {
        method: "PUT",
        body: JSON.stringify(changes),
      }),
    listPullRequests: ({ head, base, state = "open" }) => {
      const query = new URLSearchParams({ state, head, base, per_page: "100" })
      return api(`/repos/${owner}/${repo}/pulls?${query}`)
    },
    createPullRequest: body =>
      api(`/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getPullRequest: pullNumber =>
      api(`/repos/${owner}/${repo}/pulls/${encodeURIComponent(pullNumber)}`),
    mergePullRequest: (pullNumber, body) =>
      api(
        `/repos/${owner}/${repo}/pulls/${encodeURIComponent(pullNumber)}/merge`,
        {
          method: "PUT",
          body: JSON.stringify({ ...body, merge_method: "merge" }),
        }
      ),
    listCheckRunsForRef: ref =>
      api(
        `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs?filter=latest&per_page=100`
      ),
    listWorkflowRuns: ({ workflow, branch, headSha, event }) => {
      const query = new URLSearchParams({ per_page: "100" })
      if (branch) query.set("branch", branch)
      if (headSha) query.set("head_sha", headSha)
      if (event) query.set("event", event)
      return api(
        `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?${query}`
      )
    },
  }
}

export function normalizePublicationPaths(paths) {
  const values = [
    ...new Set(
      (paths || []).map(value =>
        String(value || "")
          .replace(/\\/g, "/")
          .replace(/^\.\//, "")
      )
    ),
  ]
  if (!values.length)
    throw new Error("At least one generated publication path is required")
  const invalid = values.filter(
    value => !PUBLICATION_PATH_ALLOWLIST.includes(value)
  )
  if (invalid.length) {
    throw new Error(
      `Publication path is not automation-owned: ${invalid.join(", ")}`
    )
  }
  return values.sort()
}

export function evaluateValidationChecks(
  payload,
  checkName = EDITORIAL_VALIDATION_CHECK
) {
  const checks = (payload?.check_runs || []).filter(
    run => run.name === checkName
  )
  if (!checks.length) return { state: "waiting", reason: "check-not-created" }
  const active = checks.find(run => run.status !== "completed")
  if (active)
    return {
      state: "waiting",
      reason: active.status,
      url: active.html_url || null,
    }
  const failed = checks.find(run => run.conclusion !== "success")
  if (failed) {
    return {
      state: "failed",
      reason: failed.conclusion || "unknown",
      url: failed.html_url || null,
    }
  }
  return {
    state: "succeeded",
    reason: "success",
    url: checks[0].html_url || null,
  }
}

export function evaluateWorkflowRuns(payload, { headSha } = {}) {
  const runs = (payload?.workflow_runs || []).filter(
    run => !headSha || run.head_sha === headSha
  )
  if (!runs.length) return { state: "waiting", reason: "workflow-not-created" }
  const latest = [...runs].sort(
    (left, right) =>
      new Date(right.created_at || 0) - new Date(left.created_at || 0)
  )[0]
  if (latest.status !== "completed") {
    return {
      state: "waiting",
      reason: latest.status,
      url: latest.html_url || null,
    }
  }
  if (latest.conclusion !== "success") {
    return {
      state: "failed",
      reason: latest.conclusion || "unknown",
      url: latest.html_url || null,
    }
  }
  return {
    state: "succeeded",
    reason: "success",
    url: latest.html_url || null,
    runId: latest.id,
  }
}

export async function waitForGate({
  read,
  evaluate,
  timeoutMs = 30 * 60 * 1000,
  pollMs = 10 * 1000,
  now = Date.now,
  wait = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds)),
}) {
  const startedAt = now()
  let last = null
  do {
    last = evaluate(await read())
    if (last.state === "succeeded") return last
    if (last.state === "failed") {
      throw new Error(
        `Remote gate failed: ${last.reason}${last.url ? ` (${last.url})` : ""}`
      )
    }
    if (now() - startedAt >= timeoutMs) break
    await wait(pollMs)
  } while (true)
  throw new Error(
    `Timed out waiting for remote gate: ${last?.reason || "unknown"}`
  )
}

function summarizeRules(rules) {
  return (rules || []).map(rule => ({
    type: rule.type,
    rulesetId: rule.ruleset_id ?? null,
    source: rule.ruleset_source ?? null,
    parameters: rule.parameters || null,
  }))
}

export function summarizeGitHubAudit({
  repository,
  developBranch,
  mainBranch,
  developProtection,
  mainProtection,
  rulesets,
  rulesetDetails = [],
  developRules = [],
  mainRules = [],
}) {
  return {
    repository: repository.full_name,
    visibility: repository.visibility,
    defaultBranch: repository.default_branch,
    mergeMethods: {
      mergeCommit: repository.allow_merge_commit === true,
      squash: repository.allow_squash_merge === true,
      rebase: repository.allow_rebase_merge === true,
      autoMerge: repository.allow_auto_merge === true,
    },
    deleteBranchOnMerge: repository.delete_branch_on_merge === true,
    branches: {
      develop: {
        name: developBranch.name,
        sha: developBranch.commit.sha,
        protected: developBranch.protected === true,
        protectionReadable: developProtection !== null,
        effectiveRules: summarizeRules(developRules),
      },
      main: {
        name: mainBranch.name,
        sha: mainBranch.commit.sha,
        protected: mainBranch.protected === true,
        protectionReadable: mainProtection !== null,
        effectiveRules: summarizeRules(mainRules),
      },
    },
    rulesets: (rulesets || []).map(ruleset => ({
      id: ruleset.id,
      name: ruleset.name,
      target: ruleset.target,
      enforcement: ruleset.enforcement,
      conditions:
        rulesetDetails.find(detail => detail.id === ruleset.id)?.conditions ||
        null,
      rules:
        rulesetDetails
          .find(detail => detail.id === ruleset.id)
          ?.rules?.map(rule => ({
            type: rule.type,
            parameters: rule.parameters || null,
          })) || [],
    })),
    readyForReversiblePromotion:
      repository.allow_merge_commit === true &&
      developBranch.name === DEFAULT_DEVELOP_BRANCH &&
      mainBranch.name === DEFAULT_MAIN_BRANCH,
  }
}
