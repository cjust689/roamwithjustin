export function mergeDirectoryCards(existing, incoming) {
  const updates = new Map(incoming.map(card => [card.handle, card]))
  const known = new Set(existing.map(card => card.handle))
  return [
    ...existing.map(card => updates.get(card.handle) || card),
    ...incoming.filter(card => !known.has(card.handle)),
  ]
}

export function directoryImageVersion(atlas) {
  return `${atlas.handle}:${atlas.favoriteImage?.imageId || "none"}:${atlas.favoriteImage?.updatedAt || ""}`
}

export async function readDirectoryWindow(fetchPage, minimumCount) {
  let atlases = [],
    cursor = ""
  const seen = new Set()
  do {
    const page = await fetchPage(cursor)
    atlases = mergeDirectoryCards(atlases, page.atlases)
    cursor = page.nextCursor || ""
    if (cursor && seen.has(cursor)) throw new Error("Repeated discovery cursor")
    seen.add(cursor)
  } while (cursor && atlases.length < Math.max(12, minimumCount))
  return { atlases, nextCursor: cursor }
}
