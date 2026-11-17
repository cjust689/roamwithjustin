<template>
  <section class="my-atlas-map-shell" aria-label="Personal travel map">
    <div
      ref="map"
      class="my-atlas-map"
      :aria-hidden="String(Boolean(error))"
    ></div>
    <div v-if="!ready && !error" class="my-atlas-map-status" role="status">
      Loading your map
    </div>
    <div v-if="error" class="my-atlas-map-status is-error" role="status">
      <strong>Map unavailable</strong>
      <span>Your selected destinations remain listed beside the map.</span>
    </div>
    <div v-if="ready && yearLegend.length" class="my-atlas-year-legend">
      <span v-for="item in yearLegend" :key="item.label">
        <i :style="{ backgroundColor: item.color }"></i>{{ item.label }}
      </span>
    </div>
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapStyleUrl, terrainSource } from "../../atlas/config/mapConfig"
import {
  atlasYears,
  curvedConnectionCoordinates,
  decorativeConnections,
  formatVisitedDates,
  visitedDatesForPlace,
} from "../catalog/atlasInsights.mjs"

const CONNECTION_SOURCE = "my-atlas-connections"
const YEAR_COLORS = Object.freeze([
  "#f2c76e",
  "#58d1c9",
  "#f08a72",
  "#9ea7ff",
  "#73b7f2",
  "#d58ce8",
])
const UNDATED_COLOR = "#9aaba6"

const worldCamera = {
  center: [-35, 22],
  zoom: 1.25,
  pitch: 8,
  bearing: 0,
}

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
)

function supportsWebGL2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"))
  } catch (error) {
    return false
  }
}

function pinColor(year) {
  return Number.isInteger(year)
    ? YEAR_COLORS[Math.abs(year) % YEAR_COLORS.length]
    : UNDATED_COLOR
}

function firstVisitedYear(place) {
  const years = visitedDatesForPlace(place).map(date => date.year)
  return years.length ? Math.min(...years) : null
}

export default {
  name: "MyAtlasMap",
  props: {
    places: {
      type: Array,
      default: () => [],
    },
    selectedPlaceId: {
      type: String,
      default: "",
    },
    showConnections: {
      type: Boolean,
      default: true,
    },
    playbackActive: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      map: null,
      markers: [],
      flightMarker: null,
      flightFrame: null,
      flightStartTimer: null,
      flightFocusTimer: null,
      flightCleanupTimer: null,
      ready: false,
      error: "",
    }
  },
  computed: {
    yearLegend() {
      const years = atlasYears(this.places).map(year => ({
        label: String(year),
        color: pinColor(year),
      }))
      if (this.places.some(place => visitedDatesForPlace(place).length === 0)) {
        years.push({ label: "Date open", color: UNDATED_COLOR })
      }
      return years
    },
  },
  watch: {
    places: {
      deep: true,
      handler() {
        this.renderConnections()
        this.renderMarkers()
        if (!this.playbackActive) this.showPlacesOverview()
      },
    },
    selectedPlaceId(current, previous) {
      this.renderMarkers()
      this.transitionSelectedPlace(previous, current)
    },
    showConnections() {
      this.renderConnections()
    },
    playbackActive(active) {
      if (active) {
        window.setTimeout(() => this.focusSelectedPlace(), 40)
      } else {
        this.stopFlight()
        this.focusSelectedPlace()
      }
    },
  },
  mounted() {
    this.initializeMap()
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.stopFlight()
    this.clearMarkers()
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
          ...worldCamera,
          maxPitch: 78,
          attributionControl: false,
          cooperativeGestures: true,
        })
        this.map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-right"
        )
        this.map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          "bottom-left"
        )
        this.map.on("load", () => {
          this.ready = true
          if (terrainSource && !this.map.getSource("my-atlas-terrain")) {
            this.map.addSource("my-atlas-terrain", terrainSource)
            this.map.setTerrain({
              source: "my-atlas-terrain",
              exaggeration: 1.15,
            })
            this.map.addControl(
              new maplibregl.TerrainControl({
                source: "my-atlas-terrain",
                exaggeration: 1.15,
              }),
              "bottom-left"
            )
          }
          this.initializeConnections()
          this.renderMarkers()
          this.showPlacesOverview()
        })
        this.map.on("error", event => {
          if (!this.ready) this.error = event?.error?.message || "Map failed"
        })
      } catch (error) {
        this.error = error.message || "Map failed"
      }
    },
    clearMarkers() {
      this.markers.forEach(marker => marker.remove())
      this.markers = []
    },
    connectionGeoJson() {
      const features = this.showConnections
        ? decorativeConnections(this.places).map(edge => {
            return {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: curvedConnectionCoordinates(
                  edge.from.coordinates,
                  edge.to.coordinates,
                  25
                ),
              },
            }
          })
        : []
      return { type: "FeatureCollection", features }
    },
    initializeConnections() {
      if (!this.map || !this.ready || this.map.getSource(CONNECTION_SOURCE)) {
        return
      }
      this.map.addSource(CONNECTION_SOURCE, {
        type: "geojson",
        data: this.connectionGeoJson(),
      })
      const firstLabelLayer = this.map
        .getStyle()
        .layers?.find(layer => layer.type === "symbol")?.id
      this.map.addLayer(
        {
          id: "my-atlas-connections-glow",
          type: "line",
          source: CONNECTION_SOURCE,
          paint: {
            "line-color": "#e6ba68",
            "line-opacity": 0.14,
            "line-width": 8,
            "line-blur": 4,
          },
        },
        firstLabelLayer
      )
      this.map.addLayer(
        {
          id: "my-atlas-connections-line",
          type: "line",
          source: CONNECTION_SOURCE,
          paint: {
            "line-color": "#f0c978",
            "line-opacity": 0.58,
            "line-width": 2,
            "line-dasharray": [2, 2.6],
          },
        },
        firstLabelLayer
      )
    },
    renderConnections() {
      if (!this.map || !this.ready) return
      this.initializeConnections()
      this.map.getSource(CONNECTION_SOURCE)?.setData(this.connectionGeoJson())
    },
    renderMarkers() {
      if (!this.map || !this.ready) return
      this.clearMarkers()

      this.places.forEach(place => {
        if (!Array.isArray(place.coordinates)) return
        const element = document.createElement("button")
        element.type = "button"
        element.className = "my-atlas-pin"
        if (place.placeId === this.selectedPlaceId) {
          element.classList.add("is-selected")
        }
        const dateLabel = formatVisitedDates(place)
        const year = firstVisitedYear(place)
        element.style.setProperty("--pin-color", pinColor(year))
        element.setAttribute("aria-label", `Select ${place.name}, ${dateLabel}`)
        element.dataset.placeId = place.placeId

        const pin = document.createElement("span")
        pin.className = "my-atlas-pin-shape"
        pin.appendChild(document.createElement("i"))
        const label = document.createElement("span")
        label.className = "my-atlas-pin-label"
        const name = document.createElement("strong")
        name.textContent = place.name
        const dates = document.createElement("small")
        dates.textContent = dateLabel
        label.append(name, dates)
        element.append(pin, label)
        element.addEventListener("click", () =>
          this.$emit("select", place.placeId)
        )

        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat(place.coordinates)
          .addTo(this.map)
        this.markers.push(marker)
      })
    },
    fitPlaces() {
      const coordinates = this.places
        .map(place => place.coordinates)
        .filter(value => Array.isArray(value))
      if (coordinates.length < 2) return
      const bounds = coordinates.reduce(
        (current, coordinate) => current.extend(coordinate),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      )
      this.map.fitBounds(bounds, {
        padding: 72,
        maxZoom: 7,
        duration: 650,
      })
    },
    focusSelectedPlace() {
      const place = this.places.find(
        candidate => candidate.placeId === this.selectedPlaceId
      )
      if (!place || !this.map || !this.ready) return
      this.map.flyTo({
        center: place.coordinates,
        zoom: place.placeType === "country" ? 4.4 : 6.4,
        pitch: this.playbackActive ? 42 : 28,
        bearing: this.playbackActive
          ? Math.max(-18, Math.min(18, place.coordinates[0] * 0.12))
          : 0,
        duration: this.playbackActive ? 1150 : 650,
        essential: false,
      })
    },
    showPlacesOverview() {
      if (!this.map || !this.ready || !this.places.length) return
      if (this.places.length === 1) this.focusSelectedPlace()
      else this.fitPlaces()
    },
    transitionSelectedPlace(previousId, currentId) {
      if (!this.map || !this.ready) return
      const current = this.places.find(place => place.placeId === currentId)
      const previous = this.places.find(place => place.placeId === previousId)
      if (this.playbackActive && previous && current) {
        this.stopFlight()
        this.showFlightOverview(previous.coordinates, current.coordinates)
        this.flightStartTimer = window.setTimeout(
          () => this.animateFlight(previous.coordinates, current.coordinates),
          520
        )
        this.flightFocusTimer = window.setTimeout(
          () => this.focusSelectedPlace(),
          2500
        )
        return
      }
      this.focusSelectedPlace()
    },
    showFlightOverview(from, to) {
      let destination = [...to]
      if (destination[0] - from[0] > 180) destination[0] -= 360
      if (from[0] - destination[0] > 180) destination[0] += 360
      const bounds = new maplibregl.LngLatBounds(from, from).extend(destination)
      const mobile = window.innerWidth <= 640
      this.map.fitBounds(bounds, {
        padding: mobile
          ? {
              top: 54,
              right: 42,
              bottom: 54,
              left: 72,
            }
          : { top: 90, right: 90, bottom: 90, left: 500 },
        maxZoom: 4.2,
        pitch: 10,
        bearing: 0,
        duration: 480,
        essential: false,
      })
    },
    stopFlight() {
      if (this.flightFrame) window.cancelAnimationFrame(this.flightFrame)
      this.flightFrame = null
      window.clearTimeout(this.flightStartTimer)
      window.clearTimeout(this.flightFocusTimer)
      window.clearTimeout(this.flightCleanupTimer)
      this.flightStartTimer = null
      this.flightFocusTimer = null
      this.flightCleanupTimer = null
      if (this.flightMarker) this.flightMarker.remove()
      this.flightMarker = null
    },
    animateFlight(from, to) {
      if (
        !Array.isArray(from) ||
        !Array.isArray(to) ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        return
      }

      const route = curvedConnectionCoordinates(from, to, 90)
      const element = document.createElement("div")
      element.className = "my-atlas-flight"
      const aircraft = document.createElement("span")
      aircraft.setAttribute("aria-hidden", "true")
      aircraft.textContent = "✈"
      element.appendChild(aircraft)
      this.flightMarker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(route[0])
        .addTo(this.map)

      const duration = 1850
      const startedAt = performance.now()
      const advance = now => {
        const rawProgress = Math.min(1, (now - startedAt) / duration)
        const progress = rawProgress * rawProgress * (3 - 2 * rawProgress)
        const routePosition = progress * (route.length - 1)
        const index = Math.min(route.length - 2, Math.floor(routePosition))
        const fraction = routePosition - index
        const current = route[index]
        const next = route[index + 1]
        const coordinate = [
          current[0] + (next[0] - current[0]) * fraction,
          current[1] + (next[1] - current[1]) * fraction,
        ]
        const angle =
          (Math.atan2(next[1] - current[1], next[0] - current[0]) * 180) /
          Math.PI
        aircraft.style.transform = `rotate(${angle}deg)`
        this.flightMarker?.setLngLat(coordinate)
        if (rawProgress < 1) {
          this.flightFrame = window.requestAnimationFrame(advance)
        } else {
          this.flightFrame = null
          this.flightCleanupTimer = window.setTimeout(() => {
            if (this.flightMarker) this.flightMarker.remove()
            this.flightMarker = null
            this.flightCleanupTimer = null
          }, 360)
        }
      }
      this.flightFrame = window.requestAnimationFrame(advance)
    },
  },
}
</script>

<style scoped>
.my-atlas-map-shell,
.my-atlas-map {
  position: absolute;
  inset: 0;
}

.my-atlas-map-shell {
  overflow: hidden;
  background: #101b1d;
}

.my-atlas-map-status {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #ecf6f1;
  text-align: center;
  background: linear-gradient(145deg, #162529, #0c1417);
}

.my-atlas-map-status span {
  max-width: 24rem;
  color: #a9bbb5;
}

.my-atlas-map-status.is-error {
  align-content: end;
  padding-bottom: 5rem;
}

.my-atlas-year-legend {
  position: absolute;
  right: 0.8rem;
  bottom: 1.9rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.32rem;
  max-width: min(24rem, calc(100vw - 5rem));
  pointer-events: none;
}

.my-atlas-year-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.28rem 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #f3f8f5;
  background: rgba(8, 18, 20, 0.82);
  box-shadow: 0 0.3rem 1rem rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(8px);
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-year-legend i {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  box-shadow: 0 0 0.55rem currentColor;
}

::v-deep .my-atlas-pin {
  position: relative;
  width: 2.2rem;
  height: 2.8rem;
  padding: 0;
  border: 0;
  overflow: visible;
  color: #f6fbf8;
  background: transparent;
  cursor: pointer;
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

::v-deep .my-atlas-pin-shape {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 50% 50% 50% 0;
  background: var(--pin-color);
  box-shadow:
    0 0 0 0.32rem color-mix(in srgb, var(--pin-color) 24%, transparent),
    0 0.5rem 1.4rem rgba(0, 0, 0, 0.46),
    0 0 1.25rem color-mix(in srgb, var(--pin-color) 58%, transparent);
  transform: rotate(-45deg);
}

::v-deep .my-atlas-pin-shape i {
  position: absolute;
  inset: 0.52rem;
  border-radius: 50%;
  background: #102023;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.16);
}

::v-deep .my-atlas-pin-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.48rem);
  display: grid;
  min-width: max-content;
  padding: 0.38rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--pin-color) 58%, transparent);
  border-radius: 0.62rem;
  text-align: left;
  background: rgba(9, 19, 21, 0.9);
  box-shadow: 0 0.5rem 1.4rem rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(9px);
  transform: translateX(-50%);
  transform-origin: bottom center;
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

::v-deep .my-atlas-pin-label strong {
  max-width: 10rem;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

::v-deep .my-atlas-pin-label small {
  color: var(--pin-color);
  font-size: 0.58rem;
  font-weight: 800;
}

::v-deep .my-atlas-pin:hover,
::v-deep .my-atlas-pin:focus-visible,
::v-deep .my-atlas-pin.is-selected {
  z-index: 4;
  filter: brightness(1.15);
  transform: scale(1.16);
}

::v-deep .my-atlas-pin.is-selected .my-atlas-pin-label {
  border-color: var(--pin-color);
  transform: translateX(-50%) scale(1.04);
}

::v-deep .my-atlas-flight {
  position: relative;
  z-index: 5;
  display: grid;
  width: 2.4rem;
  height: 2.4rem;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  color: #102023;
  background: #f6cf7d;
  box-shadow:
    0 0 0 0.38rem rgba(242, 199, 110, 0.18),
    0 0 1.4rem rgba(242, 199, 110, 0.8);
  pointer-events: none;
}

::v-deep .my-atlas-flight span {
  display: block;
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 80ms linear;
}

@media (max-width: 640px) {
  .my-atlas-year-legend {
    right: 0.55rem;
    bottom: 1.6rem;
    max-width: calc(100vw - 4.5rem);
  }

  ::v-deep .my-atlas-pin-label {
    padding: 0.3rem 0.42rem;
  }

  ::v-deep .my-atlas-pin-label strong {
    max-width: 7.5rem;
    font-size: 0.66rem;
  }
}
</style>
