const mapTilerKey = process.env.VUE_APP_MAPTILER_KEY || ""
const customStyleUrl = process.env.VUE_APP_MAPTILER_STYLE_URL || ""

export const hasMapTilerKey = Boolean(mapTilerKey)

export const mapStyleUrl = hasMapTilerKey
  ? customStyleUrl ||
    `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : "https://demotiles.maplibre.org/style.json"

export const terrainSource = hasMapTilerKey
  ? {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${encodeURIComponent(mapTilerKey)}`,
      tileSize: 512,
      maxzoom: 14,
    }
  : null
