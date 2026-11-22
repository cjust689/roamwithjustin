<template>
  <div class="atlas-location-picker">
    <div class="location-methods" role="group" aria-label="Choose a location">
      <button
        v-if="allowSearch"
        type="button"
        :disabled="pending"
        @click="$emit('search')"
      >
        Search places
      </button>
      <button type="button" :disabled="pending" @click="$emit('choose-map')">
        Drop a pin
      </button>
    </div>
    <div class="location-link">
      <div class="location-heading">
        <strong>Location</strong
        ><MyAtlasInfo label="Supported location formats"
          >Use a Google or Apple Maps link, a Plus Code, or latitude followed by
          longitude. Decimal degrees and coordinates with N/S/E/W or degrees,
          minutes and seconds are supported. Short Plus Codes require a nearby
          reference town or neighborhood. Shorter codes need a closer reference.
          Short map links contact the provider only when you select Read
          location. Links with only a place ID may require dropping a pin.
          Review the decoded location before applying it.</MyAtlasInfo
        >
      </div>
      <label
        >Map link, Plus Code or coordinates<input
          v-model="link"
          type="text"
          placeholder="e.g. 33.749, -84.38798"
          maxlength="4096"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :disabled="pending"
          @input="clearCandidate"
          @paste="pasteLocation"
          @keydown.enter.prevent="readLink"
      /></label>
      <button
        type="button"
        :disabled="pending || resolving || !link.trim()"
        @click="readLink"
      >
        {{ resolving ? "Reading location" : "Read location" }}
      </button>
      <p v-if="error" role="alert">{{ error }}</p>
      <div v-if="candidate" role="status">
        <strong>{{ candidate.provider }}</strong>
        <p v-if="candidate.label">{{ candidate.label }}</p>
        <p>{{ candidateMessage }}</p>
        <section
          v-if="candidate.kind === 'short-plus-code'"
          class="reference-search"
        >
          <label
            >Nearby town or area<input
              v-model="referenceQuery"
              :disabled="pending || resolving"
              maxlength="160"
              @input="clearReferences"
              @keydown.enter.prevent="findReferences"
          /></label>
          <button
            type="button"
            :disabled="pending || resolving || referenceQuery.trim().length < 2"
            @click="findReferences"
          >
            {{
              resolving ? "Searching nearby places" : "Find reference location"
            }}
          </button>
          <ul
            v-if="references.length"
            aria-label="Choose a nearby reference location"
            tabindex="0"
          >
            <li v-for="place in references" :key="place.placeId">
              <button
                type="button"
                :disabled="pending || resolving"
                @click="useReference(place)"
              >
                <strong>{{ place.name }}</strong
                ><small>{{
                  [place.admin1Name, place.countryName]
                    .filter(Boolean)
                    .join(", ")
                }}</small>
              </button>
            </li>
          </ul>
        </section>
        <p v-if="candidate.coordinates">
          {{ candidate.coordinates[1].toFixed(6) }},
          {{ candidate.coordinates[0].toFixed(6) }}
        </p>
        <button
          v-if="candidate.kind === 'explicit-coordinate'"
          type="button"
          :disabled="pending"
          @click="useCandidate"
        >
          Use this location
        </button>
        <button
          v-else-if="candidate.label"
          type="button"
          :disabled="pending"
          @click="useCandidate"
        >
          Use name and choose on map
        </button>
      </div>
    </div>
    <label
      >Place name<input
        ref="name"
        :value="name"
        type="text"
        maxlength="80"
        autocomplete="off"
        @input="$emit('update:name', $event.target.value)"
    /></label>
    <p v-if="selectedCoordinates" class="location-position" role="status">
      Selected position {{ selectedCoordinates }}
    </p>
    <p class="location-help">
      Review the name and map position before saving. Moving the map does not
      save a place.
    </p>
    <slot />
  </div>
</template>

<script>
import {
  parseLocationInput,
  parsePlusCode,
  locationCoordinates,
} from "../../../../shared/my-atlas-location-input.mjs"
import { searchMyAtlasPlaces } from "../catalog/placeSearchClient.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import placeCatalog from "../data/place-catalog.proof.json"
import MyAtlasInfo from "./MyAtlasInfo.vue"

export default {
  name: "MyAtlasLocationPicker",
  components: { MyAtlasInfo },
  props: {
    name: { type: String, default: "" },
    latitude: { type: [String, Number], default: "" },
    longitude: { type: [String, Number], default: "" },
    pending: Boolean,
    allowSearch: { type: Boolean, default: true },
    resolveLink: { type: Function, default: null },
  },
  emits: [
    "search",
    "choose-map",
    "update:name",
    "update:latitude",
    "update:longitude",
    "coordinates-change",
  ],
  data: () => ({
    link: "",
    referenceQuery: "",
    references: [],
    candidate: null,
    error: "",
    resolving: false,
    requestSequence: 0,
  }),
  computed: {
    selectedCoordinates() {
      if (
        [this.latitude, this.longitude].some(
          value => String(value).trim() === ""
        )
      )
        return ""
      const point = locationCoordinates(
        Number(this.latitude),
        Number(this.longitude)
      )
      return point ? `${point[1].toFixed(6)}, ${point[0].toFixed(6)}` : ""
    },
    candidateMessage() {
      if (this.candidate?.code && this.candidate.kind === "explicit-coordinate")
        return "Plus Code decoded to the center of its area. Review the location before using it."
      return (
        {
          "explicit-coordinate":
            "Coordinates found. Confirm the marker, then adjust it if needed.",
          "short-plus-code":
            "Choose a nearby town or neighborhood for this short Plus Code. Shorter codes need a closer reference. Review the decoded location before using it.",
          "view-center":
            "This is the map's view center, not a place pin. Choose the exact location on the map.",
          unknown:
            "This link does not include a place coordinate. Choose the location on the map.",
          ambiguous:
            "This link has several possible locations. Choose the intended point on the map.",
          "invalid-coordinate":
            "The coordinate is outside the supported map area. Choose a point on the map.",
        }[this.candidate?.kind] || "Choose a point on the map."
      )
    },
  },
  // The app uses Vue 2.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.requestSequence++
  },
  methods: {
    focusName() {
      this.$refs.name?.focus()
    },
    pasteLocation(event) {
      const text = event.clipboardData?.getData("text/plain")
      if (!text || this.pending) return
      event.preventDefault()
      const input = event.target
      const start = input.selectionStart ?? input.value.length
      const end = input.selectionEnd ?? start
      const normalized = text.replace(/[\r\n\t]+/g, " ")
      const next =
        input.value.slice(0, start) + normalized + input.value.slice(end)
      this.clearCandidate()
      if (next.length > 4096) {
        this.error =
          "This location is too long. Paste only the map link, Plus Code or coordinate pair."
        return
      }
      this.link = next
      this.$nextTick(() =>
        input.setSelectionRange(
          start + normalized.length,
          start + normalized.length
        )
      )
    },
    clearCandidate() {
      this.candidate = null
      this.error = ""
      this.requestSequence++
      this.resolving = false
      this.references = []
      this.referenceQuery = ""
    },
    clearReferences() {
      this.references = []
      this.error = ""
      this.requestSequence++
    },
    async findReferences() {
      if (
        this.pending ||
        this.resolving ||
        this.referenceQuery.trim().length < 2
      )
        return
      const sequence = ++this.requestSequence
      this.resolving = true
      this.error = ""
      this.references = []
      try {
        const results = await searchMyAtlasPlaces({
          query: this.referenceQuery,
          catalog: placeCatalog,
          endpoint: getMyAtlasPlaceSearchEndpoint(
            process.env,
            window.location.origin
          ),
          limit: 8,
        })
        if (sequence !== this.requestSequence) return
        this.references = results.filter(
          place =>
            place.placeType === "city" &&
            Array.isArray(place.coordinates) &&
            locationCoordinates(place.coordinates[1], place.coordinates[0])
        )
        if (!this.references.length)
          this.error =
            "No nearby towns found. Try another name, use the full Plus Code, or drop a pin."
      } catch {
        if (sequence === this.requestSequence)
          this.error =
            "Nearby search is unavailable. Try again, use the full Plus Code, or drop a pin."
      } finally {
        if (sequence === this.requestSequence) this.resolving = false
      }
    },
    useReference(place) {
      if (this.pending || this.candidate?.kind !== "short-plus-code") return
      const decoded = parsePlusCode(this.candidate.code, place.coordinates)
      if (!decoded) return
      this.candidate = decoded
      this.references = []
    },
    async readLink() {
      if (this.pending || this.resolving) return
      const sequence = ++this.requestSequence
      this.error = ""
      this.references = []
      const candidate = parseLocationInput(this.link)
      if (candidate.kind === "unsupported") {
        this.candidate = null
        this.error =
          "Paste a Google or Apple Maps link, a valid Plus Code, or a latitude, longitude pair. You can also drop a pin."
      } else if (candidate.kind === "short-link") {
        this.candidate = null
        if (!this.resolveLink) {
          this.error =
            "Open the short link and copy the full Maps URL, or drop a pin instead."
          return
        }
        this.resolving = true
        try {
          const sourceUrl =
            this.link.match(/https:\/\/[^\s<>]+/)?.[0] || this.link.trim()
          const resolved = await this.resolveLink(sourceUrl)
          if (sequence === this.requestSequence) {
            const code =
              resolved.kind === "unknown" && parsePlusCode(resolved.label)
            this.candidate = code
              ? { ...code, provider: resolved.provider }
              : resolved
            this.referenceQuery = this.candidate.referenceQuery || ""
          }
        } catch {
          if (sequence === this.requestSequence)
            this.error =
              "The short link could not be read. Copy its full Maps URL, or drop a pin instead."
        } finally {
          if (sequence === this.requestSequence) this.resolving = false
        }
      } else {
        this.candidate = candidate
        this.referenceQuery = candidate.referenceQuery || ""
      }
    },
    useCandidate() {
      const candidate = this.candidate
      if (!candidate || this.pending) return
      if (!this.name.trim() && candidate.label)
        this.$emit("update:name", candidate.label)
      if (candidate.kind === "explicit-coordinate") {
        this.$emit("update:longitude", String(candidate.coordinates[0]))
        this.$emit("update:latitude", String(candidate.coordinates[1]))
        this.$emit("coordinates-change")
      }
      this.$emit("choose-map")
    },
  },
}
</script>

<style scoped>
.atlas-location-picker {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.location-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.atlas-location-picker label {
  display: grid;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
}
.atlas-location-picker input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 10px;
  color: inherit;
  background: var(--atlas-surface, #112124);
  border: 1px solid var(--atlas-border, #53645c);
  border-radius: 8px;
}
.atlas-location-picker button {
  min-height: 44px;
  padding: 9px 11px;
  color: inherit;
  background: transparent;
  border: 1px solid var(--atlas-border, #82703d);
  border-radius: 9px;
  cursor: pointer;
  font-size: 11px;
}
.atlas-location-picker button:disabled {
  opacity: 0.55;
  cursor: default;
}
.location-link {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--atlas-border, #53645c);
  border-radius: 10px;
  overflow-wrap: anywhere;
}
.location-link p,
.location-help,
.location-position {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.location-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.reference-search {
  display: grid;
  gap: 8px;
}
.reference-search ul {
  display: grid;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.reference-search li button {
  display: grid;
  gap: 4px;
  text-align: left;
  width: 100%;
}
.location-position {
  overflow-wrap: anywhere;
  color: var(--color-accent-soft, #e6ba68);
}
</style>
