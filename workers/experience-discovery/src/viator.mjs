export class DiscoveryError extends Error {
  constructor(code, status = 502, retryAfter = "") {
    super(code)
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function normalizeDiscoveryRequest(value, mappings) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(key => !["destinationId", "page"].includes(key))
  )
    throw new DiscoveryError("invalid_search", 400)
  const mapping = mappings.find(
    entry =>
      entry.active === true &&
      entry.siteLocationId === value.destinationId &&
      /^[1-9]\d{0,9}$/.test(entry.viatorDestinationId)
  )
  if (!mapping) throw new DiscoveryError("destination_not_configured", 400)
  const page = value.page === undefined ? 1 : value.page
  if (!Number.isSafeInteger(page) || page < 1 || page > 5)
    throw new DiscoveryError("invalid_page", 400)
  return {
    destination: mapping.viatorDestinationId,
    label: mapping.label,
    page,
  }
}

function safeUrl(value, hosts) {
  if (typeof value !== "string" || value.length > 4096 || /\s|\\/u.test(value))
    return false
  try {
    const u = new URL(value)
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      hosts.includes(u.hostname)
    )
  } catch {
    return false
  }
}

export function projectViatorProducts(payload) {
  if (!Array.isArray(payload?.products) || payload.products.length > 6)
    throw new DiscoveryError("invalid_provider_response")
  return payload.products.map(product => {
    if (
      typeof product.productCode !== "string" ||
      !/^[\w-]{1,80}$/.test(product.productCode) ||
      typeof product.title !== "string" ||
      !product.title.trim() ||
      product.title.length > 500 ||
      !safeUrl(product.productUrl, ["www.viator.com", "viator.com"])
    )
      throw new DiscoveryError("invalid_provider_response")
    const variants = (product.images || [])
      .filter(image => image.isCover)
      .flatMap(image => image.variants || [])
      .filter(
        image =>
          Number.isFinite(image.width) &&
          image.width >= 200 &&
          safeUrl(image.url, ["media-cdn.tripadvisor.com"])
      )
      .sort((a, b) => a.width - b.width)
    const amount = product.pricing?.summary?.fromPrice
    const rating = product.reviews?.combinedAverageRating
    const count = product.reviews?.totalReviews
    return {
      productCode: product.productCode,
      title: product.title,
      productUrl: product.productUrl,
      provider: "viator",
      ...(variants[0] ? { coverImage: variants[0].url } : {}),
      ...(Number.isFinite(amount) &&
      amount >= 0 &&
      product.pricing.currency === "USD"
        ? { fromPrice: amount, currency: "USD" }
        : {}),
      ...(Number.isFinite(rating) &&
      rating >= 0 &&
      rating <= 5 &&
      Number.isSafeInteger(count) &&
      count >= 0
        ? { reviewRating: rating, reviewCount: count }
        : {}),
    }
  })
}

export async function searchViator({ selection, key, fetchImpl = fetch }) {
  if (!key) throw new DiscoveryError("viator_key_not_configured", 503)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetchImpl(
      "https://api.sandbox.viator.com/partner/products/search",
      {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "exp-api-key": key,
          Accept: "application/json;version=2.0",
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filtering: { destination: selection.destination },
          sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
          pagination: { start: (selection.page - 1) * 6 + 1, count: 6 },
          currency: "USD",
        }),
      }
    )
    if (!response.ok) {
      const raw = response.headers.get("Retry-After") || ""
      throw new DiscoveryError(
        response.status === 429
          ? "provider_rate_limited"
          : response.status === 401 || response.status === 403
            ? "provider_access_denied"
            : "provider_unavailable",
        response.status === 429 ? 429 : 502,
        /^\d{1,4}$/.test(raw) ? raw : ""
      )
    }
    if (
      !response.headers
        .get("Content-Type")
        ?.toLowerCase()
        .includes("application/json")
    )
      throw new DiscoveryError("invalid_provider_response")
    const reader = response.body.getReader()
    const chunks = []
    let length = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 1_000_000) {
        await reader.cancel()
        throw new DiscoveryError("provider_response_too_large")
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    let payload
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      throw new DiscoveryError("invalid_provider_response")
    }
    return {
      destination: selection.label,
      products: projectViatorProducts(payload),
      fetchedAt: new Date().toISOString(),
      pricingNotice:
        "Indicative prices from Viator. Check current prices and availability on Viator.",
    }
  } catch (error) {
    if (error instanceof DiscoveryError) throw error
    throw new DiscoveryError("provider_unavailable")
  } finally {
    clearTimeout(timer)
  }
}
