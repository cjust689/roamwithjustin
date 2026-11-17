import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  assertScopedChanges,
  createCommandRunner,
  publicationFingerprint,
  publishGeneratedPost,
  verifyPublicPublication,
} from "./lib/editorial-github-publisher.mjs"

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "editorial-github-publisher-")
)
try {
  const generatedPath = "src/content/media/generated/records.json"
  fs.mkdirSync(path.join(root, path.dirname(generatedPath)), {
    recursive: true,
  })
  fs.writeFileSync(path.join(root, generatedPath), '{"schemaVersion":1}\n')
  const firstHash = publicationFingerprint({
    sourceRoot: root,
    paths: [generatedPath],
  })
  const secondHash = publicationFingerprint({
    sourceRoot: root,
    paths: [generatedPath],
  })
  assert.equal(firstHash, secondHash)
  assert.deepEqual(
    assertScopedChanges(` M ${generatedPath}\n`, [generatedPath]),
    [generatedPath]
  )
  const porcelainRunner = createCommandRunner(() => ({
    status: 0,
    stdout: ` M ${generatedPath}\n`,
    stderr: "",
  }))
  const porcelainStatus = porcelainRunner("git", ["status", "--short"])
  assert.equal(porcelainStatus, ` M ${generatedPath}`)
  assert.deepEqual(assertScopedChanges(porcelainStatus, [generatedPath]), [
    generatedPath,
  ])
  assert.throws(
    () => assertScopedChanges(" M docs/README.md\n", [generatedPath]),
    /unexpected paths/
  )
  assert.equal(
    (
      await verifyPublicPublication({
        url: "https://example.com/atlas/test",
        expectedMarkers: ["expected-media.jpg"],
        render: async () => '<img src="expected-media.jpg">',
        pollMs: 1,
        timeoutMs: 10,
      })
    ).state,
    "succeeded"
  )

  const commands = []
  const command = (program, args, options = {}) => {
    commands.push({ program, args, cwd: options.cwd })
    if (program === "git" && args[0] === "diff") return ""
    if (program === "git" && args[0] === "status") {
      return ` M ${generatedPath}`
    }
    if (program === "git" && args[0] === "rev-parse") {
      return "publication-commit"
    }
    return ""
  }

  let pullNumber = 0
  let mergeNumber = 0
  const client = {
    listPullRequests: async () => [],
    createPullRequest: async body => ({
      number: (pullNumber += 1),
      state: "open",
      body,
    }),
    getPullRequest: async number => ({
      number,
      state: "open",
      merged: false,
      merge_commit_sha: `test-merge-${number}`,
      head: { sha: `head-${number}` },
    }),
    listCheckRunsForRef: async () => ({
      check_runs: [
        { name: "validate", status: "completed", conclusion: "success" },
      ],
    }),
    mergePullRequest: async () => ({
      merged: true,
      sha: mergeNumber++ === 0 ? "develop-merge" : "main-merge",
    }),
    listWorkflowRuns: async ({ headSha }) => ({
      workflow_runs: [
        {
          id: headSha === "main-merge" ? 2 : 1,
          head_sha: headSha,
          status: "completed",
          conclusion: "success",
          created_at: "2026-11-15T00:00:00Z",
        },
      ],
    }),
  }

  const result = await publishGeneratedPost({
    sourceRoot: root,
    stateRoot: path.join(root, ".state", "editorial", "github-worktrees"),
    postId: "post-123",
    label: "Test post",
    paths: [generatedPath],
    client,
    owner: "owner",
    command,
    pollMs: 1,
    timeoutMs: 100,
    install: false,
    publicVerification: {
      url: "https://example.com/atlas/test",
      expectedMarkers: ["expected-media.jpg"],
      render: async () => '<img src="expected-media.jpg">',
    },
  })
  assert.equal(result.state, "deployed")
  assert.equal(result.developPull, 1)
  assert.equal(result.mainPull, 2)
  assert.equal(result.developMergeSha, "develop-merge")
  assert.equal(result.mainMergeSha, "main-merge")
  assert.equal(result.publicVerification.state, "succeeded")
  assert.equal(
    commands.some(entry => entry.program === "git" && entry.args[0] === "push"),
    true
  )
  const pushesBeforeRetry = commands.filter(
    entry => entry.program === "git" && entry.args[0] === "push"
  ).length
  const retried = await publishGeneratedPost({
    sourceRoot: root,
    stateRoot: path.join(root, ".state", "editorial", "github-worktrees"),
    postId: "post-123",
    label: "Test post",
    paths: [generatedPath],
    client,
    owner: "owner",
    command,
    pollMs: 1,
    timeoutMs: 100,
    install: false,
    publicVerification: {
      url: "https://example.com/atlas/test",
      expectedMarkers: ["expected-media.jpg"],
      render: async () => '<img src="expected-media.jpg">',
    },
  })
  assert.equal(retried.mainMergeSha, "main-merge")
  assert.equal(
    commands.filter(
      entry => entry.program === "git" && entry.args[0] === "push"
    ).length,
    pushesBeforeRetry
  )
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

console.log("Editorial GitHub publisher tests passed.")
