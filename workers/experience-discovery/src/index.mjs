import mappings from "../destinations.mjs"
import {
  DiscoveryError,
  normalizeDiscoveryRequest,
  searchViator,
} from "./viator.mjs"
import { prototypeHtml } from "./prototype.mjs"
const requests = new Map()
const json = (value, status = 200, extra = {}) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  })

export async function handleDiscoveryRequest(
  request,
  environment,
  { fetchImpl = fetch, now = Date.now(), destinations = mappings } = {}
) {
  const url = new URL(request.url)
  if (
    environment.LOCAL_DISCOVERY_ENABLED !== "true" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  )
    return json({ error: "not_found" }, 404)
  if (
    request.headers.get("Origin") &&
    request.headers.get("Origin") !== url.origin
  )
    return json({ error: "origin_not_allowed" }, 403)
  if (url.pathname === "/" && request.method === "GET")
    return new Response(prototypeHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://media-cdn.tripadvisor.com; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        "Referrer-Policy": "no-referrer",
      },
    })
  if (url.pathname === "/destinations" && request.method === "GET")
    return json({
      destinations: destinations
        .filter(d => d.active)
        .map(d => ({ id: d.siteLocationId, label: d.label })),
      configured: Boolean(environment.VIATOR_API_KEY),
    })
  if (url.pathname !== "/search" || request.method !== "POST")
    return json({ error: "not_found" }, 404)
  const bucket = Math.floor(now / 60000),
    identity = request.headers.get("CF-Connecting-IP") || "loopback"
  const current = requests.get(identity)
  const count = current?.bucket === bucket ? current.count : 0
  if (count >= 6)
    return json({ error: "local_rate_limited" }, 429, { "Retry-After": "60" })
  requests.set(identity, { bucket, count: count + 1 })
  if (requests.size > 100) requests.clear()
  try {
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      throw new DiscoveryError("json_required", 415)
    if (Number(request.headers.get("Content-Length")) > 1024)
      throw new DiscoveryError("request_too_large", 413)
    const reader = request.body?.getReader()
    if (!reader) throw new DiscoveryError("invalid_search", 400)
    let raw = "",
      length = 0
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 1024) {
        await reader.cancel()
        throw new DiscoveryError("request_too_large", 413)
      }
      raw += decoder.decode(value, { stream: true })
    }
    raw += decoder.decode()
    let value
    try {
      value = JSON.parse(raw)
    } catch {
      throw new DiscoveryError("invalid_search", 400)
    }
    const selection = normalizeDiscoveryRequest(value, destinations)
    return json(
      await searchViator({
        selection,
        key: environment.VIATOR_API_KEY,
        fetchImpl,
      })
    )
  } catch (error) {
    return json(
      {
        error:
          error instanceof DiscoveryError
            ? error.code
            : "discovery_unavailable",
      },
      error instanceof DiscoveryError ? error.status : 503,
      error.retryAfter ? { "Retry-After": error.retryAfter } : {}
    )
  }
}
export default { fetch: handleDiscoveryRequest }
