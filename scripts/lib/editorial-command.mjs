import fs from "node:fs"
import path from "node:path"

export function resolveNpmInvocation(
  args,
  {
    platform = process.platform,
    environment = process.env,
    nodeExecutable = process.execPath,
    exists = fs.existsSync,
  } = {}
) {
  const npmArgs = [...args]
  if (platform !== "win32") {
    return { command: "npm", args: npmArgs }
  }

  const candidates = [
    String(environment.npm_execpath || "").trim(),
    path.join(
      path.dirname(nodeExecutable),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    ),
  ].filter(Boolean)
  const npmCli = candidates.find(candidate => exists(candidate))
  if (!npmCli) {
    throw new Error(
      "Could not resolve npm-cli.js for a shell-free Windows build"
    )
  }
  return {
    command: nodeExecutable,
    args: [npmCli, ...npmArgs],
  }
}
