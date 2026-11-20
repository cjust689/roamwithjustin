<template>
  <section
    class="atlas-map-shell"
    :class="{ 'is-moving': mapMoving }"
    aria-label="Interactive travel map"
  >
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
    <div
      v-if="journeyNodes.length > 1 && !guidedControlsVisible"
      class="atlas-route-key"
    >
      <span>Journey path</span>
      <strong>{{ journeyNodes.length }} stops in visit order</strong>
    </div>
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import {
  hasMapTilerKey,
  mapTilerMapOptions,
  mapTilerSdk,
} from "../config/mapConfig"
import {
  atlasMarkerClusterRadius,
  atlasMarkerCompactClusterRadius,
  buildAtlasMarkerGroups,
} from "../config/markerLayout.mjs"

const journeySourceId = "atlas-journey-route"
const journeyShadowLayerId = "atlas-journey-shadow"
const journeyLineLayerId = "atlas-journey-line"
const compactMarkerQuery = "(max-width: 720px), (any-pointer: coarse)"
const transportIcons = {
  drive: "🚗",
  car: "🚗",
  walk: "🥾",
  hike: "🥾",
  bike: "🚲",
  bicycle: "🚲",
  ferry: "⛴",
  boat: "⛴",
  train: "🚆",
  flight: "✈",
  plane: "✈",
}

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
    guidedControlsVisible: Boolean,
    journeyTravel: {
      type: Object,
      default: null,
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
      mapMoving: false,
      markerRefreshFrame: null,
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
    journeyTravel: {
      deep: true,
      handler(travel) {
        if (!travel) {
          this.cancelJourneyTravel()
          return
        }
        this.startJourneyTravel(travel)
      },
    },
  },
  mounted() {
    this.compactMarkerMedia = window.matchMedia(compactMarkerQuery)
    if (this.compactMarkerMedia.addEventListener) {
      this.compactMarkerMedia.addEventListener(
        "change",
        this.handleMarkerMediaChange
      )
    } else {
      // Safari versions before 14 use the legacy MediaQueryList API.
      this.compactMarkerMedia.addListener(this.handleMarkerMediaChange)
    }
    this.initializeMap()
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.cancelScheduledMarkerRefresh()
    if (this.compactMarkerMedia?.removeEventListener) {
      this.compactMarkerMedia.removeEventListener(
        "change",
        this.handleMarkerMediaChange
      )
    } else if (this.compactMarkerMedia) {
      this.compactMarkerMedia.removeListener(this.handleMarkerMediaChange)
    }
    this.clearMarkers()
    this.cancelJourneyTravel()
    if (this.popup) this.popup.remove()
    if (this.map) this.map.remove()
  },
  methods: {
    handleMarkerMediaChange() {
      this.renderMarkers()
    },
    collapseAttribution() {
      const attributionElement = this.$refs.map?.querySelector(
        ".maplibregl-ctrl-attrib"
      )
      attributionElement?.classList.remove("maplibregl-compact-show")
      attributionElement?.removeAttribute("open")
    },
    startJourneyTravel(travel) {
      if (!this.map || !this.ready || !travel) return
      if (this.activeJourneyTravelId === travel.id) return

      this.cancelJourneyTravel()
      this.activeJourneyTravelId = travel.id
      this.activeJourneyTravel = travel
      this.transportProgress = 0

      if (!travel.fromCoordinates || !travel.toCoordinates) return
      // Reduced-motion playback still changes stops, but it must not introduce
      // a moving decorative marker between the direct camera cuts.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

      const element = document.createElement("div")
      const mode = (travel.mode || "").toLowerCase()
      element.className = "atlas-transport-marker"
      element.setAttribute("role", "img")
      element.setAttribute(
        "aria-label",
        mode ? `${mode} journey progress` : "Journey progress"
      )
      element.textContent = transportIcons[mode] || "✦"

      this.transportMarker = new mapTilerSdk.Marker({
        element,
        anchor: "center",
      })
        .setLngLat(travel.fromCoordinates)
        .addTo(this.map)

      this.animateJourneyTransport(0, travel.duration)
    },
    animateJourneyTransport(startProgress, duration) {
      if (!this.transportMarker || !this.activeJourneyTravel) return

      const travel = this.activeJourneyTravel
      const startedAt = performance.now()
      const safeDuration = Math.max(1, duration || 1)

      const step = now => {
        const elapsedRatio = Math.min(1, (now - startedAt) / safeDuration)
        const progress = startProgress + (1 - startProgress) * elapsedRatio
        const easedProgress = 1 - Math.pow(1 - progress, 2)
        const longitude =
          travel.fromCoordinates[0] +
          (travel.toCoordinates[0] - travel.fromCoordinates[0]) * easedProgress
        const latitude =
          travel.fromCoordinates[1] +
          (travel.toCoordinates[1] - travel.fromCoordinates[1]) * easedProgress

        this.transportProgress = progress
        this.transportMarker.setLngLat([longitude, latitude])
        if (elapsedRatio < 1) {
          this.transportAnimationFrame = requestAnimationFrame(step)
        } else {
          this.transportAnimationFrame = null
        }
      }

      this.transportAnimationFrame = requestAnimationFrame(step)
    },
    pauseJourneyTravel() {
      if (this.map) this.map.stop()
      if (this.transportAnimationFrame) {
        cancelAnimationFrame(this.transportAnimationFrame)
        this.transportAnimationFrame = null
      }
    },
    resumeJourneyTravel(camera, duration) {
      if (!this.map || !this.ready || !camera) return

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      const options = {
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      }

      if (prefersReducedMotion) this.map.jumpTo(options)
      else this.map.flyTo({ ...options, duration, essential: false })

      this.animateJourneyTransport(this.transportProgress || 0, duration)
    },
    cancelJourneyTravel() {
      if (this.transportAnimationFrame) {
        cancelAnimationFrame(this.transportAnimationFrame)
        this.transportAnimationFrame = null
      }
      if (this.transportMarker) {
        this.transportMarker.remove()
        this.transportMarker = null
      }
      this.activeJourneyTravel = null
      this.activeJourneyTravelId = null
      this.transportProgress = 0
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
          center: this.camera.center,
          zoom: this.camera.zoom,
          pitch: this.camera.pitch,
          bearing: this.camera.bearing,
          maxPitch: 78,
          cooperativeGestures: true,
        })

        // The SDK expands a new compact attribution control once
        // on mount. Start with only its information icon and let the visitor
        // open the attribution when needed.
        this.collapseAttribution()

        this.map.on("load", () => {
          this.ready = true
          this.$emit("ready")
          // Style initialization can re-run the compact-state update.
          // Close it again after load so the initial UI is icon-only.
          this.collapseAttribution()

          this.renderJourney()
          this.renderMarkers()
          if (this.journeyTravel) this.startJourneyTravel(this.journeyTravel)
        })

        this.map.on("movestart", event => {
          this.cancelScheduledMarkerRefresh()
          this.mapMoving = true
          if (event.originalEvent) this.$emit("manual-interaction")
        })

        this.map.on("moveend", () => {
          this.mapMoving = false
          const center = this.map.getCenter()
          this.$emit("camera-change", {
            center: [center.lng, center.lat],
            zoom: this.map.getZoom(),
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing(),
          })
          this.scheduleMarkerRefresh()
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
    cancelScheduledMarkerRefresh() {
      if (this.markerRefreshFrame === null) return
      window.cancelAnimationFrame(this.markerRefreshFrame)
      this.markerRefreshFrame = null
    },
    scheduleMarkerRefresh() {
      this.cancelScheduledMarkerRefresh()
      // The SDK can emit moveend before its final DOM marker transforms have
      // painted. Recreate the markers after two paint frames so releasing a
      // drag/rotation always snaps cards back to the final projected points.
      this.markerRefreshFrame = window.requestAnimationFrame(() => {
        this.markerRefreshFrame = window.requestAnimationFrame(() => {
          this.markerRefreshFrame = null
          if (!this.map || !this.ready || this.mapMoving) return
          this.renderMarkers()
          this.map.triggerRepaint()
        })
      })
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

      // A selected structural destination already owns the detail panel. Hide
      // its broad center marker while presenting its child stops so it cannot
      // compete with the more precise Place coordinates.
      const markerNodes = this.nodes.filter(
        node =>
          !(
            node.id === this.selectedNode?.id &&
            node.childIds?.length &&
            this.journeyNodes.length
          )
      )
      const clusterRadius = this.compactMarkerMedia?.matches
        ? atlasMarkerCompactClusterRadius
        : atlasMarkerClusterRadius
      const groups = buildAtlasMarkerGroups(markerNodes, {
        zoom: this.map.getZoom(),
        project: coordinates => this.map.project(coordinates),
        selectedId: this.selectedNode?.id || "",
        clusterRadius,
      })

      groups.forEach(group => {
        if (group.isCluster) this.addClusterMarker(group)
        else this.addPlaceMarker(group.nodes[0])
      })
    },
    addPlaceMarker(node) {
      const element = document.createElement("button")
      const card = document.createElement("span")
      const avatar = document.createElement(node.image ? "img" : "span")
      const label = document.createElement("span")
      const selected = this.selectedNode?.id === node.id
      const journeyIndex = this.journeyNodes.findIndex(
        journeyNode => journeyNode.id === node.id
      )

      element.type = "button"
      element.className = `atlas-marker${selected ? " selected" : ""}`
      element.setAttribute(
        "aria-label",
        journeyIndex >= 0
          ? `Stop ${journeyIndex + 1}. Open ${node.title} on the map`
          : `Open ${node.title} on the map`
      )
      card.className = "atlas-marker-card"
      label.className = "atlas-marker-label"
      label.textContent = node.title

      if (node.image) {
        avatar.src = node.image
        avatar.alt = ""
      } else {
        avatar.className = "atlas-marker-placeholder"
        avatar.setAttribute("aria-hidden", "true")
      }
      card.append(avatar, label)
      element.append(card)

      element.addEventListener("mouseenter", () => this.showPreview(node))
      element.addEventListener("mouseleave", () => this.hidePreview())
      element.addEventListener("focus", () => this.showPreview(node))
      element.addEventListener("blur", () => this.hidePreview())
      element.addEventListener("click", event => {
        event.stopPropagation()
        this.hidePreview()
        this.$emit("select", node.id)
      })

      this.addCoordinatePin(node.coordinates, {
        nodeId: node.id,
        label: journeyIndex >= 0 ? String(journeyIndex + 1) : "",
        selected,
      })
      element.dataset.nodeId = node.id
      this.addCardMarker(element, node.coordinates)
    },
    addClusterMarker(group) {
      const element = document.createElement("button")
      const card = document.createElement("span")
      const count = document.createElement("span")
      const label = document.createElement("span")
      const titles = group.nodes.map(node => node.title)

      element.type = "button"
      element.className = "atlas-marker atlas-marker-cluster"
      element.setAttribute(
        "aria-label",
        `Zoom in to ${group.nodes.length} nearby stops: ${titles.join(", ")}`
      )
      card.className = "atlas-marker-card"
      count.className = "atlas-marker-cluster-count"
      count.textContent = String(group.nodes.length)
      label.className = "atlas-marker-label"
      label.textContent = `${group.nodes.length} nearby stops`
      card.append(count, label)
      element.append(card)

      element.addEventListener("click", event => {
        event.stopPropagation()
        this.hidePreview()
        this.zoomToMarkerGroup(group)
      })

      this.addCoordinatePin(group.coordinates, {
        cluster: true,
        groupId: group.id,
      })
      element.dataset.clusterId = group.id
      this.addCardMarker(element, group.coordinates)
    },
    addCoordinatePin(
      coordinates,
      {
        label = "",
        selected = false,
        cluster = false,
        nodeId = "",
        groupId = "",
      } = {}
    ) {
      const pin = document.createElement("span")
      pin.className = [
        "atlas-coordinate-pin",
        label ? "is-numbered" : "",
        selected ? "is-selected" : "",
        cluster ? "is-cluster" : "",
      ]
        .filter(Boolean)
        .join(" ")
      pin.setAttribute("aria-hidden", "true")
      pin.textContent = label
      if (nodeId) pin.dataset.nodeId = nodeId
      if (groupId) pin.dataset.clusterId = groupId

      const marker = new mapTilerSdk.Marker({
        element: pin,
        anchor: "center",
        rotationAlignment: "map",
        pitchAlignment: "map",
        subpixelPositioning: true,
        opacityWhenCovered: 0.35,
      })
        .setLngLat(coordinates)
        .addTo(this.map)

      this.markers.push(marker)
    },
    addCardMarker(element, coordinates) {
      const marker = new mapTilerSdk.Marker({
        element,
        anchor: "bottom",
        offset: [0, this.compactMarkerMedia?.matches ? -21 : -14],
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
        (result, node) => result.extend(node.coordinates),
        new mapTilerSdk.LngLatBounds()
      )
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      this.map.fitBounds(bounds, {
        padding: this.compactMarkerMedia?.matches ? 72 : 110,
        maxZoom: 13.4,
        duration: reducedMotion ? 0 : 850,
        essential: false,
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
      const content = document.createElement("div")
      const title = document.createElement("strong")
      const summary = document.createElement("p")

      card.className = "atlas-map-preview"
      if (media.length) {
        const image = document.createElement("img")
        this.previewCounts[node.id] = (index + 1) % media.length
        image.src = media[index % media.length]
        image.alt = ""
        card.append(image)
      } else {
        this.previewCounts[node.id] = 0
      }
      title.textContent = node.title
      summary.textContent = node.summary
      content.append(title, summary)
      card.append(content)

      this.popup = new mapTilerSdk.Popup({
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
  background: var(--color-surface, #10181c);
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
  color: var(--color-text, #fff);
}

.atlas-route-key {
  position: absolute;
  z-index: 4;
  top: 5.85rem;
  left: 1.25rem;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.34);
  border-radius: 13px;
  padding: 0.65rem 0.8rem;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.8);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
  color: var(--color-text, #fff);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.atlas-route-key span {
  color: var(--color-accent-soft, #f6bd60);
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
  border: 2px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
  border-top-color: var(--color-accent, #f6bd60);
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
  background: var(--color-surface, #111a1e);
  color: var(--color-text, #fff);
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
    rgba(var(--color-page-rgb, 5, 9, 11), 0.92),
    rgba(var(--color-page-rgb, 5, 9, 11), 0.35)
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
  color: var(--color-accent-soft, #f6bd60);
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

.atlas-transport-marker {
  display: grid;
  place-items: center;
  width: 2.9rem;
  height: 2.9rem;
  border: 3px solid var(--color-accent, #f6bd60);
  border-radius: 50%;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.94);
  box-shadow:
    0 0 0 5px rgba(7, 11, 14, 0.38),
    0 10px 28px rgba(0, 0, 0, 0.52);
  color: var(--color-text, #fff);
  font-size: 1.25rem;
  line-height: 1;
  pointer-events: none;
}

.atlas-marker {
  --marker-avatar-size: 38px;

  /* SDK markers must remain out of document flow. `position: relative`
     here overrides the SDK marker rule and adds one card-height of drift
     for every preceding marker. */
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-text, #fff);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.atlas-marker-card {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.68);
  border-radius: 999px;
  padding: 0.28rem 0.62rem 0.28rem 0.28rem;
  background: rgba(var(--color-page-rgb, 8, 12, 15), 0.84);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(10px);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    opacity 120ms ease;
}

.atlas-coordinate-pin {
  z-index: 2;
  display: block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-border, #fff);
  border-radius: 50%;
  background: var(--color-accent, #f6bd60);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.4);
  color: var(--color-accent-contrast, #111);
  pointer-events: none;
}

.atlas-coordinate-pin.is-numbered {
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  font-size: 0.65rem;
  font-weight: 900;
}

.atlas-coordinate-pin.is-selected {
  box-shadow:
    0 0 0 5px rgba(246, 189, 96, 0.22),
    0 5px 14px rgba(0, 0, 0, 0.4);
}

.atlas-coordinate-pin.is-cluster {
  border-color: var(--color-accent, #f6bd60);
  background: var(--color-surface-raised, #fff);
}

.atlas-marker:hover .atlas-marker-card,
.atlas-marker:focus-visible .atlas-marker-card,
.atlas-marker.selected .atlas-marker-card {
  border-color: var(--color-accent, #f6bd60);
  transform: translateY(-3px);
}

.atlas-marker:focus-visible {
  outline: none;
}

.atlas-marker:focus-visible .atlas-marker-card {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

.atlas-marker-card img,
.atlas-marker-placeholder {
  width: var(--marker-avatar-size);
  height: var(--marker-avatar-size);
  border-radius: 50%;
}

.atlas-marker-card img {
  object-fit: cover;
}

.atlas-marker-placeholder {
  flex: 0 0 auto;
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.28),
      transparent 38%
    ),
    var(--color-surface-raised, #142128);
}

.atlas-marker-label {
  max-width: 160px;
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
}

.atlas-marker-cluster .atlas-marker-card {
  border-color: rgba(var(--color-accent-rgb, 246, 189, 96), 0.82);
  background: rgba(var(--color-page-rgb, 8, 12, 15), 0.94);
}

.atlas-marker-cluster-count {
  display: grid;
  width: var(--marker-avatar-size);
  height: var(--marker-avatar-size);
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--color-accent, #f6bd60);
  color: var(--color-accent-contrast, #111);
  font-size: 0.78rem;
  font-weight: 900;
}

.atlas-map-shell.is-moving .atlas-marker:not(.selected) .atlas-marker-card {
  opacity: 0;
  transform: translateY(6px) scale(0.92);
  pointer-events: none;
}

.maplibregl-popup-content {
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.16);
  border-radius: 16px;
  padding: 0;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.94);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.46);
  color: var(--color-text, #fff);
  backdrop-filter: blur(14px);
}

.maplibregl-popup-tip {
  border-top-color: rgba(var(--color-page-rgb, 7, 11, 14), 0.94) !important;
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
  color: var(--color-text-muted, rgba(255, 255, 255, 0.65));
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
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 12px;
  background: rgba(var(--color-page-rgb, 8, 12, 15), 0.78);
}

.atlas-map .maplibregl-ctrl-group button span {
  filter: invert(1);
}

@media (max-width: 720px) {
  .atlas-route-key {
    top: 5.65rem;
    left: 0.7rem;
    padding: 0.65rem 0.8rem;
  }

  .atlas-route-key span {
    font-size: 0.76rem;
  }

  .atlas-route-key strong {
    font-size: 0.86rem;
  }
}

/*
 * CSS pixels are density-independent, so a larger minimum target remains
 * physically usable on high-DPI phones. Coarse-pointer detection also covers
 * wide/landscape phones whose viewport no longer matches the width breakpoint.
 */
@media (max-width: 720px), (any-pointer: coarse) {
  .atlas-transport-marker {
    width: 3.3rem;
    height: 3.3rem;
    font-size: 1.45rem;
  }

  .atlas-marker {
    --marker-avatar-size: 52px;
  }

  .atlas-marker-card {
    min-width: 64px;
    min-height: 64px;
    gap: 0.5rem;
    padding: 4px;
    border-width: 2px;
  }

  .atlas-coordinate-pin.is-numbered {
    width: 2.25rem;
    height: 2.25rem;
    border-width: 2px;
    font-size: 0.88rem;
  }

  .atlas-coordinate-pin:not(.is-numbered) {
    width: 11px;
    height: 11px;
  }

  .atlas-marker-label {
    display: none;
  }

  /* Show context without covering the map with every destination label. */
  .atlas-marker.selected .atlas-marker-label,
  .atlas-marker:focus-visible .atlas-marker-label {
    display: block;
    max-width: min(34vw, 150px);
    padding-right: 0.45rem;
    font-size: 0.94rem;
  }

  .atlas-map .maplibregl-ctrl-group button {
    width: 2.75rem;
    height: 2.75rem;
  }

  .atlas-map .maplibregl-ctrl-group button span {
    transform: scale(1.12);
  }
}

@media (orientation: portrait) {
  .atlas-route-key {
    top: 5.65rem;
    left: 0.7rem;
    padding: 0.65rem 0.8rem;
  }

  .atlas-map .maplibregl-ctrl-bottom-left {
    bottom: calc(6.4rem + env(safe-area-inset-bottom));
    left: 0.7rem;
  }

  .atlas-map .maplibregl-ctrl-bottom-right {
    bottom: calc(6.4rem + env(safe-area-inset-bottom));
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
