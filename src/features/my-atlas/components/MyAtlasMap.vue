<template>
  <section class="my-atlas-map-shell" :aria-label="mapAriaLabel">
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
      v-if="ready && plannerActive && !navigatorActive"
      class="my-atlas-planner-map-status"
    >
      <strong>{{ plannerStatusTitle }}</strong>
      <span>
        {{ plannerStatusDescription }}
      </span>
      <span v-if="plannerRoute.length" class="my-atlas-planner-map-key">
        <template v-if="plannerHasEndpoints"
          ><i class="is-departure" aria-hidden="true"></i>Start</template
        >
        <i class="is-route" aria-hidden="true"></i
        >{{ plannerHasEndpoints ? "Route" : "Trip order" }}
        <template v-if="plannerHasEndpoints"
          ><i class="is-finish" aria-hidden="true"></i
          >{{ plannerFinishLabel }}</template
        >
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
    <slot name="navigator" />
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import {
  hasMapTilerKey,
  mapTilerMapOptions,
  mapTilerSdk,
} from "../../atlas/config/mapConfig"
import { buildAtlasMarkerGroups } from "../../atlas/config/markerLayout.mjs"
import {
  atlasYears,
  curvedConnectionCoordinates,
  decorativeConnections,
  formatVisitedDates,
  visitedDatesForPlace,
} from "../catalog/atlasInsights.mjs"
import { shouldShowMyAtlasMapMemory } from "../catalog/mapMemory.mjs"
import { buildPlannerMapSegments } from "../planning/mapProjection.mjs"

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
    navigatorActive: Boolean,
    focusedLocation: { type: Object, default: null },
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
    showMemories: {
      type: Boolean,
      default: false,
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
    plannerActive: {
      type: Boolean,
      default: false,
    },
    plannerRoute: {
      type: Array,
      default: () => [],
    },
    plannerReadOnly: {
      type: Boolean,
      default: false,
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
    plannerHasEndpoints() {
      return this.plannerRoute.some(
        node => node.role === "start" || node.role === "finish"
      )
    },
    mapAriaLabel() {
      if (!this.plannerActive) return "Personal travel map"
      return this.plannerReadOnly
        ? "Shared trip map"
        : "Private trip planning map"
    },
    plannerStatusTitle() {
      return this.plannerReadOnly ? "Route key" : "Trip planner"
    },
    plannerStatusDescription() {
      if (this.plannerReadOnly) return "Saved trip order"
      return this.plannerRoute.length
        ? "Your private draft route"
        : "Add a start or destination to begin"
    },
    plannerReturnsToStart() {
      const start = this.plannerRoute.find(node => node.role === "start")
      const finish = [...this.plannerRoute]
        .reverse()
        .find(node => node.role === "finish")
      return Boolean(
        start &&
          finish &&
          start.location.coordinates[0] === finish.location.coordinates[0] &&
          start.location.coordinates[1] === finish.location.coordinates[1]
      )
    },
    plannerFinishLabel() {
      return this.plannerReturnsToStart ? "Return" : "Finish"
    },
    yearLegend() {
      if (this.plannerActive) return []
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
    focusedLocation: {
      deep: true,
      handler(location) {
        if (location) this.focusLocation(location)
      },
    },
    places: {
      deep: true,
      handler() {
        this.renderConnections()
        this.renderMarkers()
        if (!this.playbackActive && !this.plannerActive) {
          this.showPlacesOverview()
        }
      },
    },
    plannerActive() {
      this.stopFlight()
      this.renderConnections()
      this.renderMarkers()
      this.showCurrentOverview()
    },
    plannerRoute: {
      deep: true,
      handler() {
        if (!this.plannerActive) return
        this.renderConnections()
        this.renderMarkers()
        this.showPlannerOverview()
      },
    },
    selectedPlaceId(current, previous) {
      this.renderMarkers()
      this.transitionSelectedPlace(previous, current)
    },
    showConnections() {
      this.renderConnections()
    },
    showMemories() {
      this.renderMarkers()
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
    focusLocation(location) {
      if (
        !this.map ||
        !this.ready ||
        !Array.isArray(location?.coordinates) ||
        location.coordinates.length !== 2 ||
        !location.coordinates.every(Number.isFinite)
      )
        return
      this.map.stop()
      this.map.flyTo({
        center: location.coordinates,
        zoom: location.placeType === "country" ? 4.4 : 7,
        pitch: 28,
        bearing: 0,
        padding: { top: 45, left: 35, right: 35, bottom: 190 },
        duration: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? 0
          : 650,
        essential: false,
      })
    },
    resizeMap() {
      this.map?.resize()
    },
    initializeMap() {
      if (!hasMapTilerKey) {
        this.error = "MapTiler is not configured"
        return
      }
      if (!supportsWebGL2()) {
        this.error = "WebGL 2 is unavailable"
        return
      }

      try {
        this.map = new mapTilerSdk.Map({
          container: this.$refs.map,
          ...mapTilerMapOptions,
          ...worldCamera,
          maxPitch: 78,
          cooperativeGestures: true,
        })
        this.map.addControl(
          new mapTilerSdk.NavigationControl({ visualizePitch: true }),
          "top-right"
        )
        this.collapseInitialAttribution()
        this.map.on("styledata", this.collapseInitialAttribution)
        this.map.on("sourcedata", this.collapseInitialAttribution)
        this.map.on("load", () => {
          this.ready = true
          this.initializeConnections()
          this.renderMarkers()
          this.syncPlacementMarker()
          this.showCurrentOverview()
          if (this.focusedLocation) this.focusLocation(this.focusedLocation)
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
    focusPlacement() {
      const coordinates = this.normalizedPlacementCoordinates(
        this.placementCoordinates
      )
      if (this.placementActive && coordinates && this.map)
        this.map.easeTo({
          center: coordinates,
          zoom: Math.max(this.map.getZoom(), 10),
          duration: 400,
        })
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

      this.placementMarker = new mapTilerSdk.Marker({
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
      const plannerFeatures = this.plannerActive
        ? buildPlannerMapSegments(this.plannerRoute).map(segment => {
            return {
              type: "Feature",
              properties: { planner: true, segment: segment.kind },
              geometry: {
                type: "LineString",
                coordinates: curvedConnectionCoordinates(
                  segment.from.coordinates,
                  segment.to.coordinates,
                  35
                ),
              },
            }
          })
        : []
      const visitedFeatures =
        !this.plannerActive && this.showConnections
          ? decorativeConnections(this.places).map(edge => {
              return {
                type: "Feature",
                properties: { planner: false },
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
      const features = this.plannerActive ? plannerFeatures : visitedFeatures
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
      this.syncConnectionAppearance()
    },
    renderConnections() {
      if (!this.map || !this.ready) return
      this.initializeConnections()
      this.map.getSource(CONNECTION_SOURCE)?.setData(this.connectionGeoJson())
      this.syncConnectionAppearance()
    },
    syncConnectionAppearance() {
      if (!this.map || !this.ready) return
      const opacity = this.plannerActive ? 0.58 : 0.3
      const width = this.plannerActive ? 11 : 9
      const lineWidth = this.plannerActive ? 4 : 3
      const dash = this.plannerActive ? [2.4, 1.05] : [1.5, 1.8]
      const glowColor = this.plannerActive
        ? [
            "match",
            ["get", "segment"],
            "departure",
            "#58d1c9",
            "finish",
            "#f08a72",
            "return",
            "#f08a72",
            "#e6ba68",
          ]
        : "#e6ba68"
      const lineColor = this.plannerActive
        ? [
            "match",
            ["get", "segment"],
            "departure",
            "#93eee7",
            "finish",
            "#ffab98",
            "return",
            "#ffab98",
            "#f8d58d",
          ]
        : "#f8d58d"
      this.map.setPaintProperty(
        "my-atlas-connections-glow",
        "line-opacity",
        opacity
      )
      this.map.setPaintProperty(
        "my-atlas-connections-glow",
        "line-width",
        width
      )
      this.map.setPaintProperty(
        "my-atlas-connections-glow",
        "line-color",
        glowColor
      )
      this.map.setPaintProperty(
        "my-atlas-connections-line",
        "line-width",
        lineWidth
      )
      this.map.setPaintProperty(
        "my-atlas-connections-line",
        "line-color",
        lineColor
      )
      this.map.setPaintProperty(
        "my-atlas-connections-line",
        "line-dasharray",
        dash
      )
    },
    renderMarkers() {
      if (!this.map || !this.ready) return
      this.clearMarkers()

      if (this.plannerActive) {
        this.renderPlannerMarkers()
        return
      }

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
    renderPlannerMarkers() {
      const groups = new Map()
      this.plannerRoute.forEach(node => {
        const key = node.location.coordinates.join(",")
        const group = groups.get(key) || {
          coordinates: node.location.coordinates,
          nodes: [],
        }
        group.nodes.push(node)
        groups.set(key, group)
      })
      groups.forEach(group => this.addPlannerMarker(group))
    },
    addPlannerMarker(group) {
      const element = document.createElement("div")
      const marker = document.createElement("span")
      const markerText = document.createElement("strong")
      const label = document.createElement("span")
      const name = document.createElement("strong")
      const role = document.createElement("small")
      const roles = group.nodes.map(node => {
        if (node.role === "start") return "Start"
        if (node.role === "finish") {
          return this.plannerReturnsToStart ? "Return" : "Finish"
        }
        return `Stop ${node.label}`
      })
      const names = [...new Set(group.nodes.map(node => node.location.name))]

      element.className = "my-atlas-plan-pin"
      element.setAttribute("role", "img")
      element.setAttribute(
        "aria-label",
        `${roles.join(" and ")}: ${names.join(", ")}`
      )
      if (group.nodes.some(node => node.role === "start")) {
        element.classList.add("has-start")
      }
      if (group.nodes.some(node => node.role === "finish")) {
        element.classList.add("has-finish")
      }

      marker.className = "my-atlas-plan-pin-shape"
      markerText.textContent = group.nodes.map(node => node.label).join("/")
      marker.appendChild(markerText)
      label.className = "my-atlas-plan-pin-label"
      name.textContent = names.join(" / ")
      role.textContent = roles.join(" · ")
      label.append(name, role)
      element.append(marker, label)
      this.addMarker(element, group.coordinates)
    },
    addPlaceMarker(place) {
      const element = document.createElement("button")
      element.type = "button"
      element.className = "my-atlas-pin"
      const selected = place.placeId === this.selectedPlaceId
      const memoryVisible = shouldShowMyAtlasMapMemory(place, {
        selectedPlaceId: this.selectedPlaceId,
        showAll: this.showMemories,
      })
      if (selected) {
        element.classList.add("is-selected")
      }
      if (memoryVisible) element.classList.add("has-memory")
      const dateLabel = formatVisitedDates(place)
      const year = firstVisitedYear(place)
      element.style.setProperty("--pin-color", pinColor(year))
      element.setAttribute(
        "aria-label",
        memoryVisible
          ? `Select ${place.name}, ${dateLabel}. Favorite memory: ${place.memory}`
          : `Select ${place.name}, ${dateLabel}`
      )
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
      if (memoryVisible) {
        const memory = document.createElement("span")
        memory.className = "my-atlas-pin-memory"
        memory.textContent = place.memory
        memory.title = place.memory
        label.appendChild(memory)
      }
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
      const marker = new mapTilerSdk.Marker({
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
        new mapTilerSdk.LngLatBounds()
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
    showCurrentOverview() {
      if (this.focusedLocation) {
        this.focusLocation(this.focusedLocation)
        return
      }
      if (this.plannerActive) this.showPlannerOverview()
      else this.showPlacesOverview()
    },
    showPlannerOverview() {
      if (this.focusedLocation) {
        this.focusLocation(this.focusedLocation)
        return
      }
      if (!this.map || !this.ready) return
      const coordinates = [
        ...new Map(
          this.plannerRoute.map(node => [
            node.location.coordinates.join(","),
            node.location.coordinates,
          ])
        ).values(),
      ]
      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches
      if (!coordinates.length) {
        this.map.easeTo({
          ...worldCamera,
          duration: reducedMotion ? 0 : 500,
          essential: false,
        })
        return
      }
      if (coordinates.length === 1) {
        this.map.flyTo({
          center: coordinates[0],
          zoom: 5.2,
          pitch: 24,
          bearing: 0,
          duration: reducedMotion ? 0 : 650,
          essential: false,
        })
        return
      }
      const bounds = coordinates.reduce(
        (current, coordinate) => current.extend(coordinate),
        new mapTilerSdk.LngLatBounds(coordinates[0], coordinates[0])
      )
      this.map.fitBounds(bounds, {
        padding:
          window.innerWidth <= 720
            ? { top: 90, right: 56, bottom: 80, left: 56 }
            : { top: 100, right: 100, bottom: 100, left: 500 },
        maxZoom: 6.4,
        pitch: 20,
        bearing: 0,
        duration: reducedMotion ? 0 : 700,
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
        new mapTilerSdk.LngLatBounds(coordinates[0], coordinates[0])
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
      if (this.focusedLocation) {
        this.focusLocation(this.focusedLocation)
        return
      }
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
      const bounds = new mapTilerSdk.LngLatBounds(from, from).extend(
        destination
      )
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
      this.flightMarker = new mapTilerSdk.Marker({ element, anchor: "center" })
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
  isolation: isolate;
  z-index: 0;
  background: var(--color-surface, #101b1d);
}

.my-atlas-map-status {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text, #ecf6f1);
  text-align: center;
  background: linear-gradient(
    145deg,
    var(--color-surface-raised, #162529),
    var(--color-page, #0c1417)
  );
}

.my-atlas-map-status span {
  max-width: 24rem;
  color: var(--color-text-muted, #a9bbb5);
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

.my-atlas-planner-map-status {
  position: absolute;
  z-index: 3;
  top: 1rem;
  right: 1rem;
  display: grid;
  gap: 0.12rem;
  max-width: min(18rem, calc(100% - 2rem));
  padding: 0.62rem 0.78rem;
  border: 1px solid rgba(var(--color-accent-rgb, 242, 199, 110), 0.52);
  border-radius: 0.75rem;
  color: var(--color-text, #edf7f2);
  background: rgba(var(--color-page-rgb, 8, 17, 19), 0.9);
  box-shadow: 0 0.7rem 1.8rem rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.my-atlas-planner-map-status strong {
  color: var(--color-accent-soft, #f2c76e);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.62rem;
}

.my-atlas-planner-map-status span {
  color: var(--color-text-muted, #b6c7c1);
  font-size: 0.6rem;
}

.my-atlas-planner-map-key {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  margin-top: 0.28rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}

.my-atlas-planner-map-key i {
  width: 0.48rem;
  height: 0.48rem;
  margin-left: 0.3rem;
  border-radius: 50%;
  background: var(--color-accent, #f8d58d);
  box-shadow: 0 0 0.45rem currentColor;
}

.my-atlas-planner-map-key i:first-child {
  margin-left: 0;
}

.my-atlas-planner-map-key .is-departure {
  color: #58d1c9;
  background: #58d1c9;
}

.my-atlas-planner-map-key .is-route {
  color: var(--color-accent-soft, #e6ba68);
  background: var(--color-accent, #e6ba68);
}

.my-atlas-planner-map-key .is-finish {
  color: #f08a72;
  background: #f08a72;
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
  border: 1px solid rgba(var(--color-accent-rgb, 242, 199, 110), 0.55);
  border-radius: 0.8rem;
  color: var(--color-text, #edf7f2);
  background: rgba(var(--color-page-rgb, 8, 17, 19), 0.92);
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.32);
  font-size: 0.68rem;
}

.my-atlas-placement-help strong {
  color: var(--color-accent-soft, #f2c76e);
}

.my-atlas-placement-help span {
  color: var(--color-text-muted, #b6c7c1);
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
  border: 3px solid var(--color-accent, #f7e4b6);
  border-radius: 50% 50% 50% 0;
  background: var(--color-accent, #e6ba68);
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
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 0.2rem;
}

.my-atlas-year-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.28rem 0.45rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 999px;
  color: var(--color-text, #f3f8f5);
  background: rgba(var(--color-page-rgb, 8, 18, 20), 0.82);
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
  /* SDK markers must remain out of document flow. Relative positioning
     overrides the SDK marker rule and creates cumulative vertical drift. */
  position: absolute;
  width: 2.2rem;
  height: 2.8rem;
  padding: 0;
  border: 0;
  overflow: visible;
  color: var(--color-text, #f6fbf8);
  background: transparent;
  cursor: pointer;
  transition: filter 180ms ease;
}

::v-deep .my-atlas-pin-shape {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.72);
  border-radius: 50% 50% 50% 0;
  background: var(--pin-color);
  box-shadow:
    0 0 0 0.32rem color-mix(in srgb, var(--pin-color) 24%, transparent),
    0 0.5rem 1.4rem rgba(0, 0, 0, 0.46),
    0 0 1.25rem color-mix(in srgb, var(--pin-color) 58%, transparent);
  transform: rotate(-45deg);
  transition: transform 180ms ease;
}

::v-deep .my-atlas-pin-shape i {
  position: absolute;
  inset: 0.52rem;
  border-radius: 50%;
  background: var(--color-surface-raised, #102023);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.16);
}

::v-deep .my-atlas-pin-cluster .my-atlas-pin-shape {
  display: grid;
  place-items: center;
  border-color: var(--color-accent, #f8e2af);
  background: var(--color-surface-raised, #122326);
}

::v-deep .my-atlas-pin-cluster .my-atlas-pin-shape strong {
  color: var(--color-accent-soft, #f8d58d);
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
  background: rgba(var(--color-page-rgb, 9, 19, 21), 0.9);
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

::v-deep .my-atlas-pin.has-memory .my-atlas-pin-label {
  width: min(16rem, calc(100vw - 2rem));
  min-width: 0;
}

::v-deep .my-atlas-pin-memory {
  display: block;
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  overflow: hidden;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.13);
  color: var(--color-text, #dce9e4);
  font-size: 0.62rem;
  font-style: italic;
  line-height: 1.4;
  overflow-wrap: anywhere;
  white-space: normal;
}

::v-deep .my-atlas-pin.has-memory:not(.is-selected) .my-atlas-pin-memory {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

::v-deep .my-atlas-pin:hover,
::v-deep .my-atlas-pin:focus-visible,
::v-deep .my-atlas-pin.is-selected {
  z-index: 4;
  filter: brightness(1.15);
}
::v-deep .my-atlas-pin:hover .my-atlas-pin-shape,
::v-deep .my-atlas-pin:focus-visible .my-atlas-pin-shape,
::v-deep .my-atlas-pin.is-selected .my-atlas-pin-shape {
  transform: rotate(-45deg) scale(1.16);
}

::v-deep .my-atlas-pin.is-selected .my-atlas-pin-label {
  border-color: var(--pin-color);
  transform: translateX(-50%) scale(1.04);
}

::v-deep .my-atlas-plan-pin {
  position: absolute;
  width: 2.55rem;
  height: 3rem;
  overflow: visible;
  color: var(--color-accent-contrast, #102023);
  pointer-events: none;
}

::v-deep .my-atlas-plan-pin-shape {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 3px solid var(--color-border, #fff2cf);
  border-radius: 50% 50% 50% 0;
  background: var(--color-accent, #e6ba68);
  box-shadow:
    0 0 0 0.4rem rgba(230, 186, 104, 0.2),
    0 0.65rem 1.5rem rgba(0, 0, 0, 0.52),
    0 0 1.5rem rgba(242, 199, 110, 0.7);
  transform: rotate(-45deg);
}

::v-deep .my-atlas-plan-pin.has-start .my-atlas-plan-pin-shape {
  background: #58d1c9;
  box-shadow:
    0 0 0 0.4rem rgba(88, 209, 201, 0.2),
    0 0.65rem 1.5rem rgba(0, 0, 0, 0.52),
    0 0 1.5rem rgba(88, 209, 201, 0.7);
}

::v-deep .my-atlas-plan-pin.has-finish .my-atlas-plan-pin-shape {
  border-color: var(--color-error, #ffd4ca);
  background: #f08a72;
}

::v-deep .my-atlas-plan-pin.has-start.has-finish .my-atlas-plan-pin-shape {
  border-color: var(--color-border, #fff2cf);
  background: linear-gradient(135deg, #58d1c9 0 50%, #f08a72 50% 100%);
}

::v-deep .my-atlas-plan-pin-shape strong {
  max-width: 2.15rem;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: rotate(45deg);
}

::v-deep .my-atlas-plan-pin-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.55rem);
  display: grid;
  min-width: max-content;
  gap: 0.08rem;
  padding: 0.4rem 0.52rem;
  border: 1px solid rgba(var(--color-accent-rgb, 242, 199, 110), 0.52);
  border-radius: 0.62rem;
  color: var(--color-text, #edf7f2);
  text-align: left;
  background: rgba(var(--color-page-rgb, 7, 16, 18), 0.94);
  box-shadow: 0 0.5rem 1.4rem rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(9px);
  transform: translateX(-50%);
}

::v-deep .my-atlas-plan-pin-label strong {
  max-width: 11rem;
  overflow: hidden;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

::v-deep .my-atlas-plan-pin-label small {
  color: var(--color-accent-soft, #f2c76e);
  font-size: 0.57rem;
  font-weight: 800;
}

::v-deep .my-atlas-flight {
  position: relative;
  z-index: 5;
  display: grid;
  width: 2.4rem;
  height: 2.4rem;
  place-items: center;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.72);
  border-radius: 50%;
  color: var(--color-accent-contrast, #102023);
  background: var(--color-accent, #f6cf7d);
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
  /* Keep provider credits accessible beside zoom controls, away from the menu. */
  ::v-deep .maplibregl-ctrl-bottom-right {
    top: 0;
    bottom: auto;
    right: 52px;
  }
  ::v-deep .maplibregl-ctrl-attrib {
    max-width: calc(100vw - 80px);
  }
  ::v-deep .maplibregl-ctrl-bottom-left {
    display: none;
  }

  .my-atlas-year-legend {
    right: 0.55rem;
    bottom: 1.6rem;
    max-width: calc(100vw - 4.5rem);
  }

  .my-atlas-planner-map-status {
    top: 0.65rem;
    right: 0.65rem;
    max-width: calc(100% - 1.3rem);
  }

  ::v-deep .my-atlas-pin-label {
    padding: 0.3rem 0.42rem;
  }

  ::v-deep .my-atlas-pin-label strong {
    max-width: 7.5rem;
    font-size: 0.66rem;
  }

  ::v-deep .my-atlas-pin.has-memory .my-atlas-pin-label {
    width: min(13rem, calc(100vw - 1.25rem));
  }

  ::v-deep .my-atlas-plan-pin-label strong {
    max-width: 7.5rem;
  }
}
</style>
