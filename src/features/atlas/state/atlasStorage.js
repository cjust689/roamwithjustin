const storageKey = "roamwithjustin.atlas.v1"
const storageVersion = 1

function emptyState() {
  return {
    version: storageVersion,
    favorites: [],
    recent: [],
    lastContext: null,
  }
}

function stringList(value, maximumLength) {
  if (!Array.isArray(value)) return []

  return value
    .filter(item => typeof item === "string")
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, maximumLength)
}

function validCamera(value) {
  if (!value || !Array.isArray(value.center) || value.center.length !== 2) {
    return null
  }

  const numbers = [
    value.center[0],
    value.center[1],
    value.zoom,
    value.pitch,
    value.bearing,
  ]

  if (!numbers.every(Number.isFinite)) return null

  return {
    center: [value.center[0], value.center[1]],
    zoom: value.zoom,
    pitch: value.pitch,
    bearing: value.bearing,
  }
}

export function loadAtlasState() {
  if (typeof window === "undefined") return emptyState()

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey))

    if (!parsed || parsed.version !== storageVersion) return emptyState()

    const camera = validCamera(parsed.lastContext?.camera)
    const nodeId = parsed.lastContext?.nodeId

    return {
      version: storageVersion,
      favorites: stringList(parsed.favorites, 50),
      recent: stringList(parsed.recent, 10),
      lastContext:
        typeof nodeId === "string" && camera ? { nodeId, camera } : null,
    }
  } catch (error) {
    return emptyState()
  }
}

export function saveAtlasState(state) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: storageVersion,
        favorites: stringList(state.favorites, 50),
        recent: stringList(state.recent, 10),
        lastContext: state.lastContext || null,
      })
    )
  } catch (error) {
    // The atlas remains usable when storage is unavailable or full.
  }
}
