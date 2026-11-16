function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  return toHex(await crypto.subtle.digest("SHA-256", bytes))
}

function bytesToBase64Url(bytes) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "")
}

export async function hmacSha256Base64Url(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  )
  return bytesToBase64Url(new Uint8Array(signature))
}

export function qualifiedIdentityValue(identity) {
  return `${identity.issuer}\u0000${identity.subject}`
}

export async function hashQualifiedIdentity(identity) {
  return sha256(qualifiedIdentityValue(identity))
}

export async function hashInviteCode(inviteCode, pepper) {
  return sha256(`${pepper}\u0000${inviteCode}`)
}

export async function hashRegistrationOperation(
  identityDigest,
  idempotencyKey
) {
  return sha256(`${identityDigest}\u0000${idempotencyKey}`)
}

export async function hashRegistrationRequest(value) {
  return sha256(
    JSON.stringify({
      identityDigest: value.identityDigest,
      inviteDigest: value.inviteDigest,
      handle: value.handle,
      displayName: value.displayName,
      termsVersion: value.termsVersion,
      privacyVersion: value.privacyVersion,
    })
  )
}

export async function hashOperatorOperation(
  identityDigest,
  idempotencyKey,
  action
) {
  return sha256(
    `my-atlas-operator-operation:v1\n${identityDigest}\n${idempotencyKey}\n${action}`
  )
}

export async function deriveInvitationCode(secret, operationDigest) {
  const value = await hmacSha256Base64Url(
    secret,
    `my-atlas-invitation-code:v1\n${operationDigest}`
  )
  return `beta_${value}`
}
