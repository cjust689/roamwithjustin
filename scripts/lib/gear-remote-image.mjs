import dns from "node:dns/promises"
import { request as httpsRequest } from "node:https"
import net from "node:net"
import path from "node:path"
import { domainToASCII } from "node:url"

const acceptedMimeTypes = new Map([
  ["image/jpeg", { extension: ".jpg", format: "jpeg", mimeType: "image/jpeg" }],
  ["image/png", { extension: ".png", format: "png", mimeType: "image/png" }],
])
const redirectStatusCodes = new Set([301, 302, 303, 307, 308])
const maximumRedirects = 3
const requestTimeoutMilliseconds = 15_000

const blockedAddresses = new net.BlockList()
const publicIpv6Addresses = new net.BlockList()
publicIpv6Addresses.addSubnet("2000::", 3, "ipv6")
;[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].forEach(([address, prefix]) =>
  blockedAddresses.addSubnet(address, prefix, "ipv4")
)
;[
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
].forEach(([address, prefix]) =>
  blockedAddresses.addSubnet(address, prefix, "ipv6")
)

function headerValue(headers, name) {
  const value = headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

function cleanHost(value) {
  const candidate = String(value || "")
    .trim()
    .toLowerCase()
  const ascii = domainToASCII(candidate)
  const labels = candidate.split(".")
  if (
    !candidate ||
    !ascii ||
    ascii !== candidate ||
    candidate.length > 253 ||
    candidate.endsWith(".") ||
    net.isIP(candidate) ||
    labels.length < 2 ||
    labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    throw new Error(
      "--source-host must be one exact lowercase public DNS hostname"
    )
  }
  return candidate
}

export function validateAuthorizedImageUrl(source, approvedHost) {
  const host = cleanHost(approvedHost)
  let url
  try {
    url = new URL(source)
  } catch {
    throw new Error("Remote Gear image source must be a valid HTTPS URL")
  }
  if (url.protocol !== "https:") {
    throw new Error("Remote Gear image source must use HTTPS")
  }
  if (url.username || url.password) {
    throw new Error("Remote Gear image source cannot contain credentials")
  }
  if (url.port && url.port !== "443") {
    throw new Error("Remote Gear image source must use the standard HTTPS port")
  }
  if (url.hostname !== host) {
    throw new Error(
      "Remote Gear image host must exactly match --source-host " + host
    )
  }
  url.hash = ""
  return { approvedHost: host, url }
}

export function isPublicRemoteAddress(address) {
  if (typeof address !== "string") return false
  const family = net.isIP(address)
  if (!family) return false
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) return false
  if (family === 6 && !publicIpv6Addresses.check(address, "ipv6")) return false
  return !blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6")
}

async function resolvePublicAddresses(hostname, lookup) {
  let records
  try {
    records = await lookup(hostname, { all: true, verbatim: true })
  } catch (error) {
    throw new Error(
      "Remote Gear image host could not be resolved: " + error.message
    )
  }
  if (!Array.isArray(records) || !records.length) {
    throw new Error("Remote Gear image host returned no DNS addresses")
  }
  const addresses = records.map(record => {
    const address = typeof record?.address === "string" ? record.address : ""
    return {
      address,
      family: record?.family || net.isIP(address),
    }
  })
  if (
    addresses.some(
      record =>
        ![4, 6].includes(record.family) ||
        !isPublicRemoteAddress(record.address)
    )
  ) {
    throw new Error(
      "Remote Gear image host resolved to a private, local, or reserved address"
    )
  }
  return addresses
}

function pinnedLookup(addresses) {
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, addresses)
      return
    }
    const first = addresses[0]
    callback(null, first.address, first.family)
  }
}

function requestOnce(url, addresses, request, maximumBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false
    let deadline
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      callback(value)
    }
    const requestOptions = {
      headers: {
        accept: "image/jpeg, image/png",
        "user-agent": "RoamWithJustin-GearPublisher/1.0",
      },
      lookup: pinnedLookup(addresses),
      method: "GET",
      servername: url.hostname,
      timeout: timeoutMs,
    }
    const outbound = request(url, requestOptions, response => {
      const statusCode = response.statusCode || 0
      if (redirectStatusCodes.has(statusCode)) {
        response.resume()
        finish(resolve, {
          location: headerValue(response.headers, "location"),
          redirected: true,
          statusCode,
        })
        return
      }
      if (statusCode !== 200) {
        response.resume()
        finish(
          reject,
          new Error("Remote Gear image returned HTTP " + statusCode)
        )
        return
      }
      const rawContentType = String(
        headerValue(response.headers, "content-type") || ""
      )
      const mimeType = rawContentType.split(";", 1)[0].trim().toLowerCase()
      if (!acceptedMimeTypes.has(mimeType)) {
        response.resume()
        finish(
          reject,
          new Error("Remote Gear image must declare image/jpeg or image/png")
        )
        return
      }
      const rawLength = headerValue(response.headers, "content-length")
      if (rawLength !== undefined) {
        if (!/^\d+$/.test(String(rawLength))) {
          response.resume()
          finish(
            reject,
            new Error("Remote Gear image has invalid Content-Length")
          )
          return
        }
        if (Number(rawLength) > maximumBytes) {
          response.resume()
          finish(
            reject,
            new Error("Remote Gear image exceeds the 50 MiB intake limit")
          )
          return
        }
      }
      const chunks = []
      let byteSize = 0
      response.on("data", chunk => {
        if (settled) return
        byteSize += chunk.length
        if (byteSize > maximumBytes) {
          response.destroy()
          finish(
            reject,
            new Error("Remote Gear image exceeds the 50 MiB intake limit")
          )
          return
        }
        chunks.push(chunk)
      })
      response.on("end", () => {
        if (!byteSize) {
          finish(reject, new Error("Remote Gear image source is empty"))
          return
        }
        finish(resolve, {
          data: Buffer.concat(chunks, byteSize),
          mimeType,
          statusCode,
        })
      })
      response.on("aborted", () => {
        finish(reject, new Error("Remote Gear image response ended early"))
      })
      response.on("error", error => finish(reject, error))
    })
    outbound.on("error", error => finish(reject, error))
    const failForTimeout = () => {
      outbound.destroy()
      finish(reject, new Error("Remote Gear image request timed out"))
    }
    outbound.on("timeout", failForTimeout)
    deadline = setTimeout(failForTimeout, timeoutMs)
    outbound.end()
  })
}

function validateSignature(data, mimeType) {
  const jpeg =
    data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  const png =
    data.length >= 8 &&
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (
    (mimeType === "image/jpeg" && !jpeg) ||
    (mimeType === "image/png" && !png)
  ) {
    throw new Error(
      "Remote Gear image bytes do not match the declared image type"
    )
  }
}

function sourceFilename(url, contract) {
  let basename = ""
  try {
    basename = path.posix.basename(decodeURIComponent(url.pathname))
  } catch {
    basename = ""
  }
  const extension = path.extname(basename).toLowerCase()
  const extensionMatches =
    (contract.format === "jpeg" && [".jpg", ".jpeg"].includes(extension)) ||
    (contract.format === "png" && extension === ".png")
  if (
    !basename ||
    basename.length > 200 ||
    basename === "." ||
    basename === ".." ||
    /[\u0000-\u001f\u007f]/.test(basename) ||
    !extensionMatches
  ) {
    return "remote-source" + contract.extension
  }
  return basename
}

export async function downloadAuthorizedGearImage(
  source,
  approvedHost,
  maximumBytes,
  dependencies = {}
) {
  const lookup = dependencies.lookup || dns.lookup
  const request = dependencies.request || httpsRequest
  const timeoutMs = dependencies.timeoutMs || requestTimeoutMilliseconds
  const validated = validateAuthorizedImageUrl(source, approvedHost)
  const normalizedApprovedHost = validated.approvedHost
  let { url } = validated

  for (
    let redirectCount = 0;
    redirectCount <= maximumRedirects;
    redirectCount += 1
  ) {
    const addresses = await resolvePublicAddresses(url.hostname, lookup)
    const response = await requestOnce(
      url,
      addresses,
      request,
      maximumBytes,
      timeoutMs
    )
    if (!response.redirected) {
      const contract = acceptedMimeTypes.get(response.mimeType)
      validateSignature(response.data, response.mimeType)
      return {
        approvedHost: normalizedApprovedHost,
        contract,
        data: response.data,
        originalFilename: sourceFilename(url, contract),
      }
    }
    if (redirectCount === maximumRedirects) {
      throw new Error("Remote Gear image exceeded the three-redirect limit")
    }
    if (!response.location) {
      throw new Error("Remote Gear image redirect did not provide a location")
    }
    let redirected
    try {
      redirected = new URL(response.location, url)
    } catch {
      throw new Error("Remote Gear image returned an invalid redirect location")
    }
    ;({ url } = validateAuthorizedImageUrl(
      redirected.toString(),
      normalizedApprovedHost
    ))
  }
  throw new Error("Remote Gear image redirect handling failed")
}
