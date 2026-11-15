const fs = require("fs")

function cloneRecords(records) {
  return JSON.parse(JSON.stringify(records))
}

function planMediaCull(records, assetId) {
  const assets = Array.isArray(records?.assets) ? records.assets : []
  const placements = Array.isArray(records?.placements)
    ? records.placements
    : []
  const asset = assets.find(record => record.id === assetId)

  if (!asset) {
    return {
      errors: [`Unknown generated Media asset "${assetId}"`],
      changed: false,
      records,
      asset: null,
      placements: [],
      changedPlacements: [],
    }
  }

  const matchingPlacements = placements.filter(
    placement => placement.assetId === assetId
  )
  if (!matchingPlacements.length) {
    return {
      errors: [`Generated Media asset "${assetId}" has no placement`],
      changed: false,
      records,
      asset,
      placements: [],
      changedPlacements: [],
    }
  }

  const changedPlacementIds = new Set(
    matchingPlacements
      .filter(placement => placement.visibility === "published")
      .map(placement => placement.id)
  )
  const next = cloneRecords(records)
  next.placements = next.placements.map(placement =>
    changedPlacementIds.has(placement.id)
      ? { ...placement, visibility: "draft" }
      : placement
  )

  return {
    errors: [],
    changed: changedPlacementIds.size > 0,
    records: next,
    asset,
    placements: matchingPlacements,
    changedPlacements: matchingPlacements.filter(placement =>
      changedPlacementIds.has(placement.id)
    ),
  }
}

async function replaceFileAtomically(file, serialized, validate) {
  const suffix = `${process.pid}-${Date.now()}`
  const temporaryFile = `${file}.incoming-${suffix}`
  const backupFile = `${file}.backup-${suffix}`

  await fs.promises.writeFile(temporaryFile, serialized, { flag: "wx" })
  await fs.promises.rename(file, backupFile)

  try {
    await fs.promises.rename(temporaryFile, file)
    await validate()
    await fs.promises.unlink(backupFile)
  } catch (error) {
    try {
      await fs.promises.unlink(file)
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") throw unlinkError
    }
    await fs.promises.rename(backupFile, file)
    try {
      await fs.promises.unlink(temporaryFile)
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") throw unlinkError
    }
    throw new Error(`Generated Media update was rolled back: ${error.message}`)
  }
}

module.exports = {
  planMediaCull,
  replaceFileAtomically,
}
