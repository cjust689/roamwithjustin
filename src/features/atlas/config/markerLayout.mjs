export const atlasMarkerClusterMaxZoom = 12.25
export const atlasMarkerClusterRadius = 112
export const atlasMarkerCompactClusterRadius = 82
export const atlasPinFocusMinZoom = 15.5

function singletonGroup(node, index, project) {
  return {
    id: `node:${node.id}`,
    nodes: [node],
    coordinates: [...node.coordinates],
    screenPoint: project(node.coordinates),
    firstIndex: index,
    isCluster: false,
  }
}

function appendToGroup(group, node, point, index) {
  const previousCount = group.nodes.length
  const nextCount = previousCount + 1

  group.nodes.push(node)
  group.coordinates = [
    (group.coordinates[0] * previousCount + node.coordinates[0]) / nextCount,
    (group.coordinates[1] * previousCount + node.coordinates[1]) / nextCount,
  ]
  group.screenPoint = {
    x: (group.screenPoint.x * previousCount + point.x) / nextCount,
    y: (group.screenPoint.y * previousCount + point.y) / nextCount,
  }
  group.firstIndex = Math.min(group.firstIndex, index)
  group.isCluster = true
  group.id = `cluster:${group.nodes
    .map(item => item.id)
    .sort()
    .join("|")}`
}

export function buildAtlasMarkerGroups(
  nodes,
  {
    zoom,
    project,
    selectedId = "",
    clusterMaxZoom = atlasMarkerClusterMaxZoom,
    clusterRadius = atlasMarkerClusterRadius,
  }
) {
  const positionedNodes = (nodes || []).filter(node =>
    Array.isArray(node?.coordinates)
  )
  const groups = []

  positionedNodes.forEach((node, index) => {
    const candidate = singletonGroup(node, index, project)

    if (zoom >= clusterMaxZoom || node.id === selectedId) {
      groups.push(candidate)
      return
    }

    let nearestGroup = null
    let nearestDistance = Number.POSITIVE_INFINITY

    groups.forEach(group => {
      if (group.nodes.some(item => item.id === selectedId)) return

      const distance = Math.hypot(
        group.screenPoint.x - candidate.screenPoint.x,
        group.screenPoint.y - candidate.screenPoint.y
      )
      if (distance <= clusterRadius && distance < nearestDistance) {
        nearestGroup = group
        nearestDistance = distance
      }
    })

    if (nearestGroup) {
      appendToGroup(nearestGroup, node, candidate.screenPoint, index)
    } else {
      groups.push(candidate)
    }
  })

  return groups.sort((left, right) => left.firstIndex - right.firstIndex)
}

export function getAtlasPinFocusCamera(
  node,
  { minimumZoom = atlasPinFocusMinZoom } = {}
) {
  if (!node?.camera) return null

  const center = Array.isArray(node.coordinates)
    ? [...node.coordinates]
    : [...node.camera.center]

  if (node.childIds?.length) {
    return { ...node.camera, center }
  }

  return {
    ...node.camera,
    center,
    zoom: Math.max(node.camera.zoom || 0, minimumZoom),
    // Very steep pitch makes a close target appear displaced behind its pin.
    // Preserve the cinematic angle while keeping the selected coordinate easy
    // to read against the basemap.
    pitch: Math.min(node.camera.pitch || 0, 55),
  }
}
