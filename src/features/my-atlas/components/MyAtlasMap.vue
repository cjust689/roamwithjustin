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
    <div
      v-if="ready && placementActive"
      class="my-atlas-placement-help"
      role="status"
    >
      <strong>Place your custom pin</strong>
      <span v-if="placementCoordinates">
        Drag the gold pin to refine its position.
      </span>
      <span v-else>Click or tap the map to choose its position.</span>
    </div>
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapStyleUrl, terrainSource } from "../../atlas/config/mapConfig"
import { buildAtlasMarkerGroups } from "../../atlas/config/markerLayout.mjs"
import {
  atlasYears,
  curvedConnectionCoordinates,
  decorativeConnections,
  formatVisitedDates,
  visitedDatesForPlace,
} from "../catalog/atlasInsights.mjs"

const CONNECTION_SOURCE = "my-atlas-connections"
const CLUSTER_MAX_ZOOM = 7.75
const CLUSTER_RADIUS = 96
const COMPACT_CLUSTER_RADIUS = 76
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
    placementActive: {
      type: Boolean,
      default: false,
    },
    placementCoordinates: {
      type: Array,
      default: null,
    },
  },
  data() {
    return {
      map: null,
      markers: [],
      placementMarker: null,
      flightMarker: null,
      flightFrame: null,
      flightStartTimer: null,
      flightFocusTimer: null,
      flightCleanupTimer: null,
      ready: false,
      error: "",
      attributionCollapsedInitially: false,
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
    placementActive() {
      this.syncPlacementMarker()
    },
    placementCoordinates: {
      deep: true,
      handler() {
        this.syncPlacementMarker()
      },
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
    this.removePlacementMarker()
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
        this.collapseInitialAttribution()
        this.map.on("styledata", this.collapseInitialAttribution)
        this.map.on("sourcedata", this.collapseInitialAttribution)
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
          this.syncPlacementMarker()
          this.showPlacesOverview()
        })
        this.map.on("click", this.handlePlacementClick)
        this.map.on("moveend", this.renderMarkers)
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
    normalizedPlacementCoordinates(value) {
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !value.every(Number.isFinite)
      ) {
        return null
      }
      return value.map(coordinate => {
        const rounded = Math.round(coordinate * 1_000_000) / 1_000_000
        return Object.is(rounded, -0) ? 0 : rounded
      })
    },
    emitPlacementCoordinates(value) {
      const coordinates = this.normalizedPlacementCoordinates(value)
      if (coordinates) this.$emit("place-custom", coordinates)
    },
    handlePlacementClick(event) {
      if (!this.placementActive) return
      this.emitPlacementCoordinates([event.lngLat.wrap().lng, event.lngLat.lat])
    },
    removePlacementMarker() {
      if (this.placementMarker) this.placementMarker.remove()
      this.placementMarker = null
    },
    syncPlacementMarker() {
      if (!this.map || !this.ready) return
      this.map.getCanvas().style.cursor = this.placementActive
        ? "crosshair"
        : ""
      const coordinates = this.normalizedPlacementCoordinates(
        this.placementCoordinates
      )
      if (!this.placementActive || !coordinates) {
        this.removePlacementMarker()
        return
      }
      if (this.placementMarker) {
        this.placementMarker.setLngLat(coordinates)
        return
      }

      const element = document.createElement("button")
      element.type = "button"
      element.className = "my-atlas-custom-placement-pin"
      element.setAttribute(
        "aria-label",
        "Custom pin position. Drag it, or use arrow keys to adjust it."
      )
      element.title = "Drag to position this custom pin"
      element.addEventListener("click", event => event.stopPropagation())
      element.addEventListener("keydown", event => {
        if (!event.key.startsWith("Arrow")) return
        event.preventDefault()
        event.stopPropagation()
        const current = this.placementMarker?.getLngLat()
        if (!current) return
        const step = event.shiftKey ? 0.25 : 0.025
        const longitude =
          current.lng +
          (event.key === "ArrowLeft"
            ? -step
            : event.key === "ArrowRight"
              ? step
              : 0)
        const latitude =
          current.lat +
          (event.key === "ArrowDown"
            ? -step
            : event.key === "ArrowUp"
              ? step
              : 0)
        this.emitPlacementCoordinates([
          Math.max(-180, Math.min(180, longitude)),
          Math.max(-85.051129, Math.min(85.051129, latitude)),
        ])
      })

      this.placementMarker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        draggable: true,
        rotationAlignment: "viewport",
        pitchAlignment: "viewport",
      })
        .setLngLat(coordinates)
        .addTo(this.map)
      this.placementMarker.on("dragend", () => {
        const coordinate = this.placementMarker?.getLngLat()
        if (coordinate) {
          this.emitPlacementCoordinates([coordinate.wrap().lng, coordinate.lat])
        }
      })
    },
    collapseInitialAttribution() {
      if (this.attributionCollapsedInitially) return
      const attribution = this.$refs.map?.querySelector(
        ".maplibregl-ctrl-attrib.maplibregl-compact"
      )
      if (
        !attribution ||
        attribution.classList.contains("maplibregl-attrib-empty")
      ) {
        return
      }
      attribution.classList.remove("maplibregl-compact-show")
      attribution.removeAttribute("open")
      this.attributionCollapsedInitially = true
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
          id: "my-atlas-connections-shadow",
          type: "line",
          source: CONNECTION_SOURCE,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#071012",
            "line-opacity": 0.68,
            "line-width": 7,
            "line-blur": 1.2,
          },
        },
        firstLabelLayer
      )
      this.map.addLayer(
        {
          id: "my-atlas-connections-glow",
          type: "line",
          source: CONNECTION_SOURCE,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#e6ba68",
            "line-opacity": 0.3,
            "line-width": 9,
            "line-blur": 3,
          },
        },
        firstLabelLayer
      )
      this.map.addLayer(
        {
          id: "my-atlas-connections-line",
          type: "line",
          source: CONNECTION_SOURCE,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#f8d58d",
            "line-opacity": 0.94,
            "line-width": 3,
            "line-dasharray": [1.5, 1.8],
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

      const markerPlaces = this.places.map(place => ({
        ...place,
        id: place.placeId,
      }))
      const groups = buildAtlasMarkerGroups(markerPlaces, {
        zoom: this.map.getZoom(),
        project: coordinates => this.map.project(coordinates),
        selectedId: this.selectedPlaceId,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius:
          window.innerWidth <= 720 ? COMPACT_CLUSTER_RADIUS : CLUSTER_RADIUS,
      })

      groups.forEach(group => {
        if (group.isCluster) this.addClusterMarker(group)
        else this.addPlaceMarker(group.nodes[0])
      })
    },
    addPlaceMarker(place) {
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

      this.addMarker(element, place.coordinates)
    },
    addClusterMarker(group) {
      const element = document.createElement("button")
      const pin = document.createElement("span")
      const count = document.createElement("strong")
      const label = document.createElement("span")
      const name = document.createElement("strong")
      const placeNames = group.nodes.map(place => place.name)

      element.type = "button"
      element.className = "my-atlas-pin my-atlas-pin-cluster"
      element.style.setProperty("--pin-color", "#f2c76e")
      element.setAttribute(
        "aria-label",
        `Zoom in to ${group.nodes.length} nearby destinations: ${placeNames.join(", ")}`
      )
      element.dataset.clusterId = group.id

      pin.className = "my-atlas-pin-shape"
      count.textContent = String(group.nodes.length)
      pin.appendChild(count)
      label.className = "my-atlas-pin-label"
      name.textContent = `${group.nodes.length} nearby places`
      label.appendChild(name)
      element.append(pin, label)
      element.addEventListener("click", event => {
        event.stopPropagation()
        this.zoomToMarkerGroup(group)
      })

      this.addMarker(element, group.coordinates)
    },
    addMarker(element, coordinates) {
      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        rotationAlignment: "viewport",
        pitchAlignment: "viewport",
        subpixelPositioning: true,
        opacityWhenCovered: 0.35,
      })
        .setLngLat(coordinates)
        .addTo(this.map)
      this.markers.push(marker)
    },
    zoomToMarkerGroup(group) {
      if (!this.map || group.nodes.length < 2) return
      const bounds = group.nodes.reduce(
        (result, place) => result.extend(place.coordinates),
        new maplibregl.LngLatBounds()
      )
      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches
      this.map.fitBounds(bounds, {
        padding: window.innerWidth <= 720 ? 72 : 110,
        maxZoom: CLUSTER_MAX_ZOOM + 0.75,
        duration: reducedMotion ? 0 : 800,
        pitch: 18,
        bearing: 0,
        essential: false,
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

.my-atlas-placement-help {
  position: absolute;
  z-index: 3;
  top: 1rem;
  right: 1rem;
  display: grid;
  max-width: min(19rem, calc(100% - 2rem));
  gap: 0.2rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(242, 199, 110, 0.55);
  border-radius: 0.8rem;
  color: #edf7f2;
  background: rgba(8, 17, 19, 0.92);
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.32);
  font-size: 0.68rem;
}

.my-atlas-placement-help strong {
  color: #f2c76e;
}

.my-atlas-placement-help span {
  color: #b6c7c1;
}

::v-deep .my-atlas-custom-placement-pin {
  width: 2rem;
  height: 2.5rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
}

::v-deep .my-atlas-custom-placement-pin::before {
  position: absolute;
  top: 0.15rem;
  left: 0.1rem;
  width: 1.8rem;
  height: 1.8rem;
  border: 3px solid #f7e4b6;
  border-radius: 50% 50% 50% 0;
  background: #e6ba68;
  box-shadow:
    0 0 0 5px rgba(230, 186, 104, 0.18),
    0 0.55rem 1.1rem rgba(0, 0, 0, 0.48);
  content: "";
  transform: rotate(-45deg);
}

::v-deep .my-atlas-custom-placement-pin:active {
  cursor: grabbing;
}

::v-deep .my-atlas-custom-placement-pin:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 0.2rem;
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
  /* MapLibre markers must remain out of document flow. Relative positioning
     overrides MapLibre's marker rule and creates cumulative vertical drift. */
  position: absolute;
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

::v-deep .my-atlas-pin-cluster .my-atlas-pin-shape {
  display: grid;
  place-items: center;
  border-color: #f8e2af;
  background: #122326;
}

::v-deep .my-atlas-pin-cluster .my-atlas-pin-shape strong {
  color: #f8d58d;
  font-size: 0.82rem;
  line-height: 1;
  transform: rotate(45deg);
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

@media (max-width: 720px) {
  ::v-deep .maplibregl-ctrl-bottom-left {
    display: none;
  }

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
