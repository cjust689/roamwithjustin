const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstile({
  token,
  secret,
  idempotencyKey,
  remoteIp = "",
  expectedAction,
  expectedHostnames,
  fetchImpl = fetch,
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const body = new FormData()
    body.set("secret", secret)
    body.set("response", token)
    body.set("idempotency_key", idempotencyKey)
    if (remoteIp) body.set("remoteip", remoteIp)

    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    })
    if (!response.ok) return false

    const result = await response.json()
    return (
      result?.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      expectedHostnames.includes(result.hostname.toLowerCase())
    )
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
