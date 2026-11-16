import assert from "node:assert/strict"
import {
  createGitHubClient,
  evaluateValidationChecks,
  evaluateWorkflowRuns,
  loadGitHubCredential,
  normalizePublicationPaths,
  parseGitCredentialOutput,
  parseGitHubRemote,
  publicationBranchName,
  summarizeGitHubAudit,
  waitForGate,
} from "./lib/editorial-github.mjs"

assert.deepEqual(
  parseGitHubRemote("https://github.com/cjust689/roamwithjustin.git"),
  { owner: "cjust689", repo: "roamwithjustin" }
)
assert.deepEqual(
  parseGitHubRemote("git@github.com:cjust689/roamwithjustin.git"),
  { owner: "cjust689", repo: "roamwithjustin" }
)
assert.throws(() => parseGitHubRemote("https://example.com/repo.git"))
assert.equal(
  publicationBranchName({ postId: "ABC-123", label: "Málaga Sunset" }),
  "atlas/post-abc-123-malaga-sunset"
)
assert.deepEqual(
  parseGitCredentialOutput("protocol=https\nusername=owner\npassword=secret\n"),
  { username: "owner", token: "secret" }
)
assert.equal(
  publicationBranchName({
    postId: "ABC-123",
    label: "Malaga Sunset",
    sourceHash: "0123456789abcdef",
  }),
  "atlas/post-abc-123-r0123456789-malaga-sunset"
)
assert.throws(
  () => parseGitCredentialOutput("username=owner\n"),
  /no GitHub token/
)

const credential = loadGitHubCredential({
  execute(command, args, options) {
    assert.equal(command, "git")
    assert.deepEqual(args, ["credential", "fill"])
    assert.equal(options.input, "protocol=https\nhost=github.com\n\n")
    assert.equal(options.env.GCM_INTERACTIVE, "Never")
    assert.equal(options.env.GIT_TERMINAL_PROMPT, "0")
    return {
      status: 0,
      stdout: "username=owner\npassword=token-from-manager\n",
      stderr: "",
    }
  },
  environment: {},
})
assert.equal(credential.token, "token-from-manager")
assert.equal(credential.source, "git-credential")

const environmentCredential = loadGitHubCredential({
  environment: { EDITORIAL_GITHUB_TOKEN: "environment-token" },
  execute() {
    throw new Error("credential helper should not run")
  },
})
assert.equal(environmentCredential.token, "environment-token")
assert.equal(environmentCredential.source, "environment")

const calls = []
const responses = new Map([
  ["/repos/owner/repo", { full_name: "owner/repo" }],
  [
    "/repos/owner/repo/branches/develop",
    { name: "develop", commit: { sha: "develop-sha" }, protected: false },
  ],
  ["/repos/owner/repo/branches/develop/protection", null],
  [
    "/repos/owner/repo/rules/branches/develop",
    [{ type: "pull_request", ruleset_id: 1, ruleset_source: "owner/repo" }],
  ],
  ["/repos/owner/repo/rulesets/1", { id: 1, rules: [] }],
])
const client = createGitHubClient({
  owner: "owner",
  repo: "repo",
  token: "secret-token",
  request: async (url, options) => {
    const parsedUrl = new URL(url)
    const path = parsedUrl.pathname
    calls.push({ path, options })
    if (path.endsWith("/protection")) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => JSON.stringify({ message: "Not Found" }),
      }
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(responses.get(path)),
    }
  },
})
assert.deepEqual(await client.getRepository(), { full_name: "owner/repo" })
assert.equal((await client.getBranch("develop")).name, "develop")
assert.equal(await client.getBranchProtection("develop"), null)
assert.equal((await client.getRulesForBranch("develop"))[0].type, "pull_request")
assert.equal((await client.getRuleset(1)).id, 1)
assert.equal(calls[0].options.headers.Authorization, "Bearer secret-token")

assert.deepEqual(
  normalizePublicationPaths(["./src/content/media/generated/records.json"]),
  ["src/content/media/generated/records.json"]
)
assert.throws(() => normalizePublicationPaths(["src/content/journeys/index.mjs"]), /not automation-owned/)
assert.equal(evaluateValidationChecks({ check_runs: [] }).state, "waiting")
assert.equal(
  evaluateValidationChecks({
    check_runs: [{ name: "validate", status: "completed", conclusion: "success" }],
  }).state,
  "succeeded"
)
assert.equal(
  evaluateValidationChecks({
    check_runs: [{ name: "validate", status: "completed", conclusion: "failure" }],
  }).state,
  "failed"
)
assert.equal(
  evaluateWorkflowRuns(
    {
      workflow_runs: [
        {
          id: 2,
          head_sha: "main-sha",
          status: "completed",
          conclusion: "success",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    },
    { headSha: "main-sha" }
  ).state,
  "succeeded"
)
let gateReads = 0
assert.equal(
  (
    await waitForGate({
      read: async () => ({ ready: (gateReads += 1) > 1 }),
      evaluate: value => ({ state: value.ready ? "succeeded" : "waiting", reason: "test" }),
      wait: async () => {},
      now: () => gateReads * 10,
      timeoutMs: 100,
      pollMs: 1,
    })
  ).state,
  "succeeded"
)

const audit = summarizeGitHubAudit({
  repository: {
    full_name: "owner/repo",
    visibility: "public",
    default_branch: "main",
    allow_merge_commit: true,
    allow_squash_merge: true,
    allow_rebase_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: false,
  },
  developBranch: {
    name: "develop",
    commit: { sha: "develop-sha" },
    protected: false,
  },
  mainBranch: {
    name: "main",
    commit: { sha: "main-sha" },
    protected: true,
  },
  developProtection: null,
  mainProtection: { required_status_checks: {} },
  rulesets: [{ id: 1, name: "main", target: "branch", enforcement: "active" }],
  rulesetDetails: [
    {
      id: 1,
      conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
      rules: [{ type: "pull_request", parameters: { required_approving_review_count: 0 } }],
    },
  ],
  developRules: [{ type: "pull_request", ruleset_id: 1 }],
  mainRules: [{ type: "deletion", ruleset_id: 1 }],
})
assert.equal(audit.readyForReversiblePromotion, true)
assert.equal(audit.branches.main.protected, true)
assert.equal(audit.branches.develop.effectiveRules[0].type, "pull_request")
assert.equal(audit.rulesets[0].rules[0].type, "pull_request")

console.log("Editorial GitHub integration tests passed.")
