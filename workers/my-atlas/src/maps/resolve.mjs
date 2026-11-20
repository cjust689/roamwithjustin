import {
  isShortMapLink,
  mapLinkUrl,
  parseMapLinkCandidate,
} from "../../../../shared/my-atlas-map-links.mjs"

export class MapLinkError extends Error {
  constructor(code = "map_link_unavailable", status = 422) {
    super(
      "The map link could not be read. Use a full Maps URL or place a pin manually."
    )
    this.code = code
    this.status = status
  }
}

export async function resolveShortMapLink(
  value,
  { fetchImpl = fetch, timeoutMs = 2500 } = {}
) {
  let url = mapLinkUrl(value)
  if (!url || !isShortMapLink(url))
    throw new MapLinkError("invalid_map_link", 400)
  const seen = new Set()
  for (let hop = 0; hop < 3; hop++) {
    if (seen.has(url.href)) throw new MapLinkError()
    seen.add(url.href)
    const controller = new AbortController()
    let timer
    try {
      const response = await Promise.race([
        fetchImpl(url.href, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          credentials: "omit",
          headers: { Accept: "*/*" },
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort()
            reject(new MapLinkError())
          }, timeoutMs)
        }),
      ])
      // HEAD only; never download or relay provider HTML.
      if (response.body) await response.body.cancel()
      if (![301, 302, 303, 307, 308].includes(response.status))
        throw new MapLinkError()
      const location = response.headers.get("Location")
      if (!location || location.length > 4096) throw new MapLinkError()
      const next = mapLinkUrl(new URL(location, url).href)
      if (!next) throw new MapLinkError()
      if (!isShortMapLink(next)) return parseMapLinkCandidate(next.href)
      url = next
    } catch {
      throw new MapLinkError()
    } finally {
      clearTimeout(timer)
      controller.abort()
    }
  }
  throw new MapLinkError()
}
