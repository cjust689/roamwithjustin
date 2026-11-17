import assert from "node:assert/strict"
import { resolveNpmInvocation } from "./lib/editorial-command.mjs"

assert.deepEqual(
  resolveNpmInvocation(["run", "build"], { platform: "linux" }),
  { command: "npm", args: ["run", "build"] }
)

assert.deepEqual(
  resolveNpmInvocation(["run", "build"], {
    platform: "win32",
    environment: { npm_execpath: "C:\\npm\\npm-cli.js" },
    nodeExecutable: "C:\\node\\node.exe",
    exists: candidate => candidate === "C:\\npm\\npm-cli.js",
  }),
  {
    command: "C:\\node\\node.exe",
    args: ["C:\\npm\\npm-cli.js", "run", "build"],
  }
)

assert.deepEqual(
  resolveNpmInvocation(["run", "build"], {
    platform: "win32",
    environment: {},
    nodeExecutable: "C:\\node\\node.exe",
    exists: candidate =>
      candidate === "C:\\node\\node_modules\\npm\\bin\\npm-cli.js",
  }),
  {
    command: "C:\\node\\node.exe",
    args: ["C:\\node\\node_modules\\npm\\bin\\npm-cli.js", "run", "build"],
  }
)

assert.throws(
  () =>
    resolveNpmInvocation(["run", "build"], {
      platform: "win32",
      environment: {},
      nodeExecutable: "C:\\node\\node.exe",
      exists: () => false,
    }),
  /Could not resolve npm-cli\.js/
)

console.log("Editorial command resolution tests passed.")
