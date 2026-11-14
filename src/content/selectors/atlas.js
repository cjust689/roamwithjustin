import { atlasPresentation } from "../atlas/presentation.mjs"
import { atlasRootPlaceIds } from "../atlas/roots.mjs"
import { buildAtlasNodeView, orderAtlasNodesByJourney } from "./projections.mjs"

const projectedNodes = atlasPresentation.map(buildAtlasNodeView).filter(Boolean)
const childIdsByParent = projectedNodes.reduce((result, node) => {
  if (!node.parentId) return result
  if (!result[node.parentId]) result[node.parentId] = []
  result[node.parentId].push(node.id)
  return result
}, {})

// Atlas hierarchy and presentation are composed here; factual fields remain
// owned by canonical Places, Journeys, and Media.
export const atlasNodes = Object.freeze(
  projectedNodes.reduce((result, node) => {
    result[node.id] = Object.freeze({
      ...node,
      childIds: Object.freeze([...(childIdsByParent[node.id] || [])]),
    })
    return result
  }, {})
)

export const atlasRootIds = atlasRootPlaceIds

export function getAtlasNode(id) {
  return id ? atlasNodes[id] || null : null
}

export function getAtlasNodes(ids = []) {
  return ids.map(getAtlasNode).filter(Boolean)
}

export function getAtlasLineage(node) {
  const lineage = []
  let current = node

  while (current) {
    lineage.unshift(current)
    current = getAtlasNode(current.parentId)
  }

  return lineage
}

export function getAtlasLeaves() {
  return Object.values(atlasNodes).filter(node => node.childIds.length === 0)
}

export function getAtlasJourneyNodes(parentNode) {
  return orderAtlasNodesByJourney(getAtlasNodes(parentNode?.childIds || []))
}
