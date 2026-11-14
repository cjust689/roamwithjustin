<template>
  <section class="atlas-map-shell" aria-label="Interactive travel map">
    <div
      ref="map"
      class="atlas-map"
      :aria-hidden="String(Boolean(error))"
    ></div>
    <div v-if="!ready && !error" class="atlas-map-loading" role="status">
      <span></span>
      <p>Loading the atlas</p>
    </div>
    <div v-if="error" class="atlas-map-fallback" role="status">
      <img v-if="fallbackImage" :src="fallbackImage" alt="" />
      <div></div>
      <article>
        <span>Map unavailable</span>
        <h2>Continue through the stories</h2>
        <p>
          The photographic cards and navigation remain available even when WebGL
          or the map provider cannot load.
        </p>
      </article>
    </div>
    <div v-if="journeyNodes.length > 1" class="atlas-route-key">
      <span>Journey path</span>
      <strong>{{ journeyNodes.length }} stops in visit order</strong>
    </div>
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapStyleUrl, terrainSource } from "../config/mapConfig"

const journeySourceId = "atlas-journey-route"
const journeyShadowLayerId = "atlas-journey-shadow"
const journeyLineLayerId = "atlas-journey-line"
// The visible pin dot sits 24px from the pill's left edge and 2px below it.
// Anchor the geographic coordinate there so route endpoints and pins coincide.
const markerPinOffset = [-24, -2]

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
)

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2"))
  } catch (error) {
    return false
  }
}

export default {
  name: "AtlasMap",
  props: {
    nodes: {
      type: Array,
      default: () => [],
    },
    journeyNodes: {
      type: Array,
      default: () => [],
    },
    selectedNode: {
      type: Object,
      default: null,
    },
    camera: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      map: null,
      markers: [],
      popup: null,
      ready: false,
      error: "",
      previewCounts: {},
    }
  },
  computed: {
    fallbackImage() {
      return this.selectedNode?.image || this.nodes[0]?.image || ""
    },
  },
  watch: {
    nodes() {
      this.renderMarkers()
    },
    journeyNodes() {
      this.renderJourney()
      this.renderMarkers()
    },
    selectedNode() {
      this.renderMarkers()
    },
    camera: {
      deep: true,
      handler(camera) {
        this.moveCamera(camera)
      },
    },
  },
  mounted() {
    this.initializeMap()
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.clearMarkers()
    if (this.popup) this.popup.remove()
    if (this.map) this.map.remove()
  },
  methods: {
    initializeMap() {
      if (!supportsWebGL2()) {
        this.error = "WebGL 2 is unavailable"
        return
      }

      try {
        this.map = new maplibregl.Map({
          container: this.$refs.map,
          style: mapStyleUrl,
          center: this.camera.center,
          zoom: this.camera.zoom,
          pitch: this.camera.pitch,
          bearing: this.camera.bearing,
          maxPitch: 78,
          attributionControl: true,
          cooperativeGestures: true,
        })

        this.map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          "bottom-left"
        )

        this.map.on("load", () => {
          this.ready = true

          if (terrainSource && !this.map.getSource("atlas-terrain")) {
            this.map.addSource("atlas-terrain", terrainSource)
            this.map.setTerrain({
              source: "atlas-terrain",
              exaggeration: 1.15,
            })
            this.map.addControl(
              new maplibregl.TerrainControl({
                source: "atlas-terrain",
                exaggeration: 1.15,
              }),
              "bottom-left"
            )
          }

          this.renderJourney()
          this.renderMarkers()
        })

        this.map.on("moveend", () => {
          const center = this.map.getCenter()
          this.$emit("camera-change", {
            center: [center.lng, center.lat],
            zoom: this.map.getZoom(),
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing(),
          })
        })

        this.map.on("error", event => {
          if (!this.ready) {
            this.error = event?.error?.message || "The map could not load"
          }
        })
      } catch (error) {
        this.error = error.message
      }
    },
    moveCamera(camera) {
      if (!this.map || !this.ready || !camera) return
      if (this.cameraMatchesMap(camera)) return

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      const options = {
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      }

      if (prefersReducedMotion) {
        this.map.jumpTo(options)
      } else {
        this.map.flyTo({ ...options, duration: 1600, essential: false })
      }
    },
    cameraMatchesMap(camera) {
      const center = this.map.getCenter()
      const bearingDelta = Math.abs(
        ((((this.map.getBearing() - camera.bearing) % 360) + 540) % 360) - 180
      )

      return (
        Math.abs(center.lng - camera.center[0]) < 0.00001 &&
        Math.abs(center.lat - camera.center[1]) < 0.00001 &&
        Math.abs(this.map.getZoom() - camera.zoom) < 0.0001 &&
        Math.abs(this.map.getPitch() - camera.pitch) < 0.001 &&
        bearingDelta < 0.001
      )
    },
    clearMarkers() {
      this.markers.forEach(marker => marker.remove())
      this.markers = []
    },
    renderJourney() {
      if (!this.map || !this.ready) return

      const coordinates = this.journeyNodes.map(node => node.coordinates)
      const data = {
        type: "FeatureCollection",
        features:
          coordinates.length > 1
            ? [
                {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates,
                  },
                },
              ]
            : [],
      }
      const source = this.map.getSource(journeySourceId)

      if (source) {
        source.setData(data)
        return
      }

      this.map.addSource(journeySourceId, {
        type: "geojson",
        data,
      })
      this.map.addLayer({
        id: journeyShadowLayerId,
        type: "line",
        source: journeySourceId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "rgba(5, 8, 10, 0.72)",
          "line-width": 8,
        },
      })
      this.map.addLayer({
        id: journeyLineLayerId,
        type: "line",
        source: journeySourceId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#f6bd60",
          "line-dasharray": [1.3, 1.5],
          "line-opacity": 0.92,
          "line-width": 3,
        },
      })
    },
    renderMarkers() {
      if (!this.map || !this.ready) return

      this.clearMarkers()

      this.nodes.forEach(node => {
        const element = document.createElement("button")
        const image = document.createElement("img")
        const label = document.createElement("span")
        const selected = this.selectedNode?.id === node.id
        const journeyIndex = this.journeyNodes.findIndex(
          journeyNode => journeyNode.id === node.id
        )

        element.type = "button"
        element.className = `atlas-marker${selected ? " selected" : ""}`
        if (journeyIndex >= 0) {
          element.dataset.stop = String(journeyIndex + 1)
        }
        element.setAttribute(
          "aria-label",
          journeyIndex >= 0
            ? `Stop ${journeyIndex + 1}: Explore ${node.title}`
            : `Explore ${node.title}`
        )
        image.src = node.image
        image.alt = ""
        label.textContent = node.title
        element.append(image, label)

        element.addEventListener("mouseenter", () => this.showPreview(node))
        element.addEventListener("mouseleave", () => this.hidePreview())
        element.addEventListener("focus", () => this.showPreview(node))
        element.addEventListener("blur", () => this.hidePreview())
        element.addEventListener("click", event => {
          event.stopPropagation()
          this.hidePreview()
          this.$emit("select", node.id)
        })

        const marker = new maplibregl.Marker({
          element,
          anchor: "bottom-left",
          offset: markerPinOffset,
        })
          .setLngLat(node.coordinates)
          .addTo(this.map)

        this.markers.push(marker)
      })
    },
    showPreview(node) {
      if (!this.map || window.matchMedia("(hover: none)").matches) return

      this.hidePreview()

      const media = (node.media.length ? node.media : [node.image])
        .map(item =>
          typeof item === "string" ? item : item.poster || item.src
        )
        .filter(Boolean)
      const index = this.previewCounts[node.id] || 0
      const card = document.createElement("article")
      const image = document.createElement("img")
      const content = document.createElement("div")
      const eyebrow = document.createElement("span")
      const title = document.createElement("strong")
      const summary = document.createElement("p")

      this.previewCounts[node.id] = (index + 1) % media.length
      card.className = "atlas-map-preview"
      image.src = media[index % media.length]
      image.alt = ""
      eyebrow.textContent = node.eyebrow
      title.textContent = node.title
      summary.textContent = node.summary
      content.append(eyebrow, title, summary)
      card.append(image, content)

      this.popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 34,
        maxWidth: "300px",
      })
        .setLngLat(node.coordinates)
        .setDOMContent(card)
        .addTo(this.map)
    },
    hidePreview() {
      if (this.popup) {
        this.popup.remove()
        this.popup = null
      }
    },
  },
}
</script>

<style>
.atlas-map-shell,
.atlas-map,
.atlas-map-fallback,
.atlas-map-fallback > img,
.atlas-map-fallback > div {
  position: absolute;
  inset: 0;
}

.atlas-map {
  background: #10181c;
}

.atlas-map .maplibregl-canvas {
  filter: saturate(0.9) contrast(1.08) brightness(0.83);
}

.atlas-map-loading {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  color: #fff;
}

.atlas-route-key {
  position: absolute;
  z-index: 4;
  top: 5.85rem;
  left: 1.25rem;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(246, 189, 96, 0.34);
  border-radius: 13px;
  padding: 0.65rem 0.8rem;
  background: rgba(7, 11, 14, 0.8);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
  color: #fff;
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.atlas-route-key span {
  color: #f6bd60;
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.atlas-route-key strong {
  margin-top: 0.12rem;
  font-size: 0.72rem;
}

.atlas-map-loading span {
  width: 38px;
  height: 38px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #f6bd60;
  border-radius: 50%;
  animation: atlas-spin 0.9s linear infinite;
}

@keyframes atlas-spin {
  to {
    transform: rotate(360deg);
  }
}

.atlas-map-fallback {
  z-index: 2;
  overflow: hidden;
  background: #111a1e;
  color: #fff;
}

.atlas-map-fallback > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.72);
}

.atlas-map-fallback > div {
  background: linear-gradient(
    120deg,
    rgba(5, 9, 11, 0.92),
    rgba(5, 9, 11, 0.35)
  );
}

.atlas-map-fallback article {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 8vw;
  max-width: 430px;
  transform: translateY(-50%);
}

.atlas-map-fallback span,
.atlas-map-preview span {
  color: #f6bd60;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.atlas-map-fallback h2 {
  margin: 0.4rem 0;
  font-size: clamp(2rem, 5vw, 4.5rem);
}

.atlas-map-fallback p {
  line-height: 1.6;
}

.atlas-marker {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 999px;
  padding: 0.28rem 0.62rem 0.28rem 0.28rem;
  background: rgba(8, 12, 15, 0.84);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
  color: #fff;
  white-space: nowrap;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease;
}

.atlas-marker[data-stop]::before {
  position: absolute;
  z-index: 2;
  top: calc(100% + 2px);
  left: 24px;
  display: grid;
  place-items: center;
  width: 1.45rem;
  height: 1.45rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f6bd60;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.4);
  color: #111;
  content: attr(data-stop);
  font-size: 0.65rem;
  font-weight: 900;
  transform: translate(-50%, -50%);
}

.atlas-marker::after {
  position: absolute;
  bottom: -8px;
  left: 24px;
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f6bd60;
  content: "";
  transform: translateX(-50%);
}

.atlas-marker[data-stop]::after {
  display: none;
}

.atlas-marker:hover,
.atlas-marker:focus-visible,
.atlas-marker.selected {
  border-color: #f6bd60;
  transform: translateY(-4px) scale(1.03);
}

.atlas-marker img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.atlas-marker span {
  max-width: 160px;
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
}

.maplibregl-popup-content {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  padding: 0;
  background: rgba(7, 11, 14, 0.94);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.46);
  color: #fff;
  backdrop-filter: blur(14px);
}

.maplibregl-popup-tip {
  border-top-color: rgba(7, 11, 14, 0.94) !important;
}

.atlas-map-preview > img {
  width: 100%;
  height: 130px;
  object-fit: cover;
}

.atlas-map-preview > div {
  display: flex;
  flex-direction: column;
  padding: 0.9rem;
}

.atlas-map-preview strong {
  margin-top: 0.2rem;
  font-size: 1rem;
}

.atlas-map-preview p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.38rem 0 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.75rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.atlas-map .maplibregl-ctrl-bottom-left {
  bottom: 1rem;
  left: 1rem;
}

.atlas-map .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(8, 12, 15, 0.78);
}

.atlas-map .maplibregl-ctrl-group button span {
  filter: invert(1);
}

@media (max-width: 720px) {
  .atlas-route-key {
    top: 5rem;
    left: 0.7rem;
    padding: 0.5rem 0.65rem;
  }

  .atlas-marker span {
    display: none;
  }

  .atlas-marker {
    padding: 0.24rem;
  }

  .atlas-marker::after {
    left: 50%;
  }
}

@media (orientation: portrait) {
  .atlas-route-key {
    top: 5rem;
    left: 0.7rem;
    padding: 0.5rem 0.65rem;
  }

  .atlas-map .maplibregl-ctrl-bottom-left {
    bottom: calc(5.5rem + env(safe-area-inset-bottom));
    left: 0.7rem;
  }

  .atlas-map .maplibregl-ctrl-bottom-right {
    bottom: calc(5.5rem + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-marker,
  .atlas-map-loading span {
    animation: none;
    transition: none;
  }
}
</style>
