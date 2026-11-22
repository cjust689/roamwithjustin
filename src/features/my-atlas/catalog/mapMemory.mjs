export function shouldShowMyAtlasMapMemory(place, { showAll = false } = {}) {
  return Boolean(place?.memory && showAll)
}

// Owner-only presentation. Never add these notes to public trip projections.
export function myAtlasStopMapPlace(stop) {
  return {
    ...stop.place,
    visitedDates: stop.visitedDates || stop.place.visitedDates || [],
    memory:
      stop.memories?.find(memory => memory.kind === "note" && memory.text)
        ?.text ||
      stop.place.memory ||
      "",
  }
}
