export const LEGACY_DELETION_STORAGE_KEY =
  "rwj:my-atlas:account-deletion-operation:v1"

export function accountDeletionStorageKey(apiBaseUrl, profile) {
  if (!profile?.userId || !profile.createdAt)
    throw Error("Reload the current account before requesting deletion.")
  return [
    "rwj:my-atlas:account-deletion-operation:v2",
    new URL(apiBaseUrl).origin,
    profile.userId,
    profile.createdAt,
  ]
    .map(encodeURIComponent)
    .join(":")
}

export function discardLegacyDeletion(storage) {
  try {
    storage.removeItem(LEGACY_DELETION_STORAGE_KEY)
  } catch {
    /* Storage availability must not block account reads. */
  }
}
