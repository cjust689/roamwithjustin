import assert from "node:assert/strict"
import {
  resolveEditorialCommand,
  spawnEditorialCommand,
} from "./lib/editorial-process.mjs"
import { createCommandRunner } from "./lib/editorial-github-publisher.mjs"

const nodePath = "C:\\Program Files\\nodejs\\node.exe"
const npmCli = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"
const args = [
  "run",
  "build",
  "--",
  "a path with spaces",
  "literal&value",
  "literal%PATH%",
  "literal$(value)",
]
const windows = {
  platform: "win32",
  nodePath,
  environment: {},
  fileExists: candidate => candidate === npmCli,
}
assert.deepEqual(resolveEditorialCommand("npm.cmd", args, windows), {
  command: nodePath,
  args: [npmCli, ...args],
})
assert.deepEqual(resolveEditorialCommand("npm", args, windows), {
  command: nodePath,
  args: [npmCli, ...args],
})
assert.deepEqual(
  resolveEditorialCommand("npm.cmd", args, { platform: "linux" }),
  { command: "npm", args }
)
assert.deepEqual(resolveEditorialCommand("git", args, windows), {
  command: "git",
  args,
})
const customCli = "D:\\Node tools & checks\\npm\\bin\\npm-cli.js"
assert.equal(
  resolveEditorialCommand("npm", [], {
    ...windows,
    environment: { npm_execpath: customCli },
    fileExists: candidate => candidate === customCli,
  }).args[0],
  customCli
)
assert.throws(
  () =>
    resolveEditorialCommand("npm.cmd", [], {
      ...windows,
      fileExists: () => false,
    }),
  /Cannot locate npm-cli.js/
)
let invocation
spawnEditorialCommand(
  "npm.cmd",
  args,
  { cwd: "C:\\Work with spaces", shell: true, encoding: "utf8" },
  {
    ...windows,
    execute: (...values) => {
      invocation = values
      return { status: 0 }
    },
  }
)
assert.equal(invocation[0], nodePath)
assert.deepEqual(invocation[1], [npmCli, ...args])
assert.equal(invocation[2].cwd, "C:\\Work with spaces")
assert.equal(invocation[2].shell, false)
assert.equal(invocation[2].windowsHide, true)
// Run the actual shared publisher boundary on the current machine, rather than
// only asserting a mocked command shape. npm --version requires no network.
const run = createCommandRunner()
const version = run(process.platform === "win32" ? "npm.cmd" : "npm", [
  "--version",
])
assert.match(version, /^\d+\.\d+\.\d+/)
const literal = "literal & %PATH% $(value)"
assert.equal(
  run(process.execPath, [
    "-e",
    "process.stdout.write(process.argv[1])",
    literal,
  ]),
  literal
)
assert.throws(() => run(process.execPath, ["-e", "process.exit(7)"]), /failed/)
console.log(
  "Editorial subprocess tests passed: real npm invocation, Windows CLI resolution, POSIX npm, literal argv and failed exit propagation."
)
