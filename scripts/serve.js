const { spawn } = require("child_process")

const argumentsFromCommandLine = process.argv.slice(2)
const networkFlagFromNpm =
  process.env.npm_config_network &&
  process.env.npm_config_network.toLowerCase() !== "false"
const serveOnNetwork =
  argumentsFromCommandLine.includes("--network") || networkFlagFromNpm
const forwardedArguments = argumentsFromCommandLine.filter(
  argument => argument !== "--network"
)

if (serveOnNetwork && !forwardedArguments.includes("--host")) {
  forwardedArguments.unshift("--host", "0.0.0.0")
}

const vueCliService = require.resolve("@vue/cli-service/bin/vue-cli-service.js")
const server = spawn(
  process.execPath,
  [vueCliService, "serve", ...forwardedArguments],
  {
    env: process.env,
    stdio: "inherit",
  }
)

server.on("error", error => {
  console.error(`Unable to start the development server: ${error.message}`)
  process.exitCode = 1
})

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exitCode = code ?? 1
})
