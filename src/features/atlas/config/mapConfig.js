import * as maptilersdk from "@maptiler/sdk"
import "@maptiler/sdk/dist/maptiler-sdk.css"

const mapTilerKey = (process.env.VUE_APP_MAPTILER_KEY || "").trim()

export const hasMapTilerKey = Boolean(mapTilerKey)

maptilersdk.config.apiKey = mapTilerKey
maptilersdk.config.session = true
maptilersdk.config.caching = true

export const mapTilerSdk = maptilersdk
export const mapStyle = maptilersdk.MapStyle.HYBRID
export const mapTilerMapOptions = Object.freeze({
  apiKey: mapTilerKey,
  style: mapStyle,
  terrain: hasMapTilerKey,
  terrainControl: hasMapTilerKey ? "bottom-left" : false,
  terrainExaggeration: 1.15,
  projection: "mercator",
  space: false,
  halo: false,
  navigationControl: "bottom-left",
  geolocateControl: false,
  attributionControl: Object.freeze({ compact: true }),
})
