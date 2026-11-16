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
  </section>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapStyleUrl, terrainSource } from "../../atlas/config/mapConfig"
import { decorativeConnections } from "../catalog/atlasInsights.mjs"

const CONNECTION_SOURCE = "my-atlas-connections"

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
  },
  data() {
    return {
      map: null,
      markers: [],
      ready: false,
      error: "",
    }
  },
  watch: {
    places: {
      deep: true,
      handler() {
        this.renderConnections()
        this.renderMarkers()
      },
    },
    selectedPlaceId() {
      this.renderMarkers()
      this.focusSelectedPlace()
    },
    showConnections() {
      this.renderConnections()
    },
  },
  mounted() {
    this.initializeMap()
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
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
            const [fromLongitude, fromLatitude] = edge.from.coordinates
            let [toLongitude, toLatitude] = edge.to.coordinates
            if (toLongitude - fromLongitude > 180) toLongitude -= 360
            if (fromLongitude - toLongitude > 180) toLongitude += 360
            const longitudeDistance = Math.abs(toLongitude - fromLongitude)
            const latitudeDistance = Math.abs(toLatitude - fromLatitude)
            const lift = Math.min(
              18,
              2.5 + longitudeDistance * 0.045 + latitudeDistance * 0.025
            )
            const coordinates = Array.from({ length: 25 }, (_value, index) => {
              const progress = index / 24
              return [
                fromLongitude + (toLongitude - fromLongitude) * progress,
                fromLatitude +
                  (toLatitude - fromLatitude) * progress +
                  Math.sin(progress * Math.PI) * lift,
              ]
            })
            return {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates },
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
        element.setAttribute("aria-label", "Select " + place.name)
        element.dataset.placeId = place.placeId
        element.innerHTML = "<span></span>"
        element.addEventListener("click", () =>
          this.$emit("select", place.placeId)
        )

        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat(place.coordinates)
          .addTo(this.map)
        this.markers.push(marker)
      })

      if (this.places.length === 1) this.focusSelectedPlace()
      else if (this.places.length > 1) this.fitPlaces()
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
        zoom: place.placeType === "country" ? 4 : 7,
        pitch: 28,
        duration: 650,
        essential: false,
      })
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

::v-deep .my-atlas-pin {
  width: 2.1rem;
  height: 2.7rem;
  padding: 0;
  border: 0;
  border-radius: 50% 50% 50% 0;
  background: #e6ba68;
  box-shadow: 0 0.5rem 1.4rem rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transform: rotate(-45deg);
  transition:
    transform 160ms ease,
    background 160ms ease;
}

::v-deep .my-atlas-pin span {
  position: absolute;
  inset: 0.55rem;
  border-radius: 50%;
  background: #142226;
}

::v-deep .my-atlas-pin:hover,
::v-deep .my-atlas-pin:focus-visible,
::v-deep .my-atlas-pin.is-selected {
  background: #fff3d8;
  transform: rotate(-45deg) scale(1.16);
}
</style>
