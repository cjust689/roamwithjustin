const { spawn } = require("child_process")
const os = require("os")
const path = require("path")

const virtualAdapterPattern =
  /docker|hamachi|hyper-v|nord|openvpn|tap|tailscale|tun|virtual|vmware|vpn|vEthernet|wsl|zerotier/i

function isPrivateIpv4(address) {
  return (
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  )
}

function addressPriority({ address, interfaceName }) {
  let priority = virtualAdapterPattern.test(interfaceName) ? 100 : 0

  if (address.startsWith("172.")) priority += 10
  if (address.startsWith("10.")) priority += 20

  return priority
}

function findLanAddress() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([interfaceName, addresses]) =>
      addresses.map(address => ({ ...address, interfaceName }))
    )
    .filter(
      address =>
        (address.family === "IPv4" || address.family === 4) &&
        !address.internal &&
        isPrivateIpv4(address.address)
    )
    .sort(
      (first, second) => addressPriority(first) - addressPriority(second)
    )[0]
}

const argumentsFromCommandLine = process.argv.slice(2)
const networkFlagFromNpm =
  process.env.npm_config_network &&
  process.env.npm_config_network.toLowerCase() !== "false"
const serveOnNetwork =
  argumentsFromCommandLine.includes("--network") || networkFlagFromNpm
const forwardedArguments = argumentsFromCommandLine.filter(
  argument => argument !== "--network"
)
const portArgumentIndex = forwardedArguments.findIndex(
  argument => argument === "--port"
)
const inlinePortArgument = forwardedArguments.find(argument =>
  argument.startsWith("--port=")
)
const requestedPort =
  (portArgumentIndex >= 0 && forwardedArguments[portArgumentIndex + 1]) ||
  (inlinePortArgument && inlinePortArgument.split("=")[1]) ||
  process.env.PORT ||
  "8080"
const firewallIsManaged = process.env.ROAM_NETWORK_FIREWALL_ACTIVE === "true"

if (serveOnNetwork && process.platform === "win32" && !firewallIsManaged) {
  const firewallScript = path.join(__dirname, "serve-network.ps1")
  const firewallServer = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      firewallScript,
      "-Port",
      requestedPort,
    ],
    {
      env: process.env,
      stdio: "inherit",
    }
  )

  firewallServer.on("error", error => {
    console.error(`Unable to prepare network access: ${error.message}`)
    process.exitCode = 1
  })

  firewallServer.on("exit", code => {
    process.exitCode = code ?? 1
  })

  return
}

const hasHostArgument = forwardedArguments.some(
  argument => argument === "--host" || argument.startsWith("--host=")
)

if (serveOnNetwork && !hasHostArgument) {
  const lanAddress = findLanAddress()

  if (lanAddress) {
    forwardedArguments.unshift("--host", lanAddress.address)
    console.log(
      `Network mode: ${lanAddress.interfaceName} (${lanAddress.address})`
    )
  } else {
    forwardedArguments.unshift("--host", "0.0.0.0")
    console.warn(
      "Network mode is enabled, but no private IPv4 address was detected."
    )
  }
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
