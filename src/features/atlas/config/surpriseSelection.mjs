function normalizedRandomIndex(randomValue, length) {
  if (length <= 1) return 0

  const numericValue = Number(randomValue)
  const boundedValue = Number.isFinite(numericValue)
    ? Math.min(Math.max(numericValue, 0), 0.999999999999)
    : 0

  return Math.floor(boundedValue * length)
}

export function selectAtlasSurprisePlace({
  nodes = [],
  currentNodeId = "",
  previousNodeId = "",
  random = Math.random,
} = {}) {
  const completedPlaces = nodes.filter(node => node && !node.comingSoon)
  if (!completedPlaces.length) return null

  const preferredPlaces = completedPlaces.filter(
    node => node.id !== currentNodeId && node.id !== previousNodeId
  )
  const placesWithoutCurrent = completedPlaces.filter(
    node => node.id !== currentNodeId
  )
  const candidates = preferredPlaces.length
    ? preferredPlaces
    : placesWithoutCurrent.length
      ? placesWithoutCurrent
      : completedPlaces
  const randomValue = typeof random === "function" ? random() : 0

  return candidates[normalizedRandomIndex(randomValue, candidates.length)]
}
