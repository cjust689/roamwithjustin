import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

// Node cannot execute Windows .cmd shims through execFile/spawn without a
// shell. Invoke npm's JavaScript entry point instead, preserving argv literally.
export function resolveEditorialCommand(
  command,
  args,
  {
    platform = process.platform,
    environment = process.env,
    nodePath = process.execPath,
    fileExists = candidate =>
      fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  } = {}
) {
  if (!["npm", "npm.cmd"].includes(command)) return { command, args }
  if (platform !== "win32") return { command: "npm", args }
  const candidates = [
    environment.EDITORIAL_NPM_CLI_PATH,
    environment.npm_execpath,
    path.win32.join(
      path.win32.dirname(nodePath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    ),
  ].filter(
    candidate => candidate && path.win32.basename(candidate) === "npm-cli.js"
  )
  const npmCli = candidates.find(fileExists)
  if (!npmCli)
    throw new Error(
      "Cannot locate npm-cli.js. Run through npm or set EDITORIAL_NPM_CLI_PATH to the installed npm/bin/npm-cli.js file."
    )
  return { command: nodePath, args: [npmCli, ...args] }
}

export function spawnEditorialCommand(
  command,
  args,
  options = {},
  { execute = spawnSync, ...resolution } = {}
) {
  const resolved = resolveEditorialCommand(command, args, {
    ...resolution,
    environment: options.env || resolution.environment || process.env,
  })
  return execute(resolved.command, resolved.args, {
    ...options,
    windowsHide: true,
    shell: false,
  })
}
