<template>
  <section class="destination-picker" aria-label="Choose a destination">
    <label :for="'destination-input-' + _uid"
      >Find a place or paste a location</label
    >
    <div class="destination-input-row">
      <input
        :id="'destination-input-' + _uid"
        ref="input"
        :value="value.query"
        type="text"
        maxlength="4096"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Place name, coordinates, Maps link or Plus Code"
        :disabled="pending"
        @input="changeQuery($event.target.value)"
        @paste="paste"
        @keydown.enter.prevent="readInput(true)"
      />
      <button
        type="button"
        :disabled="pending || resolving || !value.query.trim()"
        @click="readInput(true)"
      >
        {{ resolving ? "Finding…" : "Find" }}
      </button>
    </div>
    <p v-if="error" class="destination-error" role="alert">{{ error }}</p>
    <div v-if="status" class="destination-status" role="status">
      <strong>{{ status.title }}</strong
      ><span>{{ status.copy }}</span>
    </div>
    <ul
      v-if="results.length"
      class="destination-results"
      aria-label="Matching places"
      tabindex="0"
    >
      <li v-for="place in results" :key="place.placeId">
        <button type="button" :disabled="pending" @click="selectPlace(place)">
          <strong>{{ place.name }}</strong
          ><small>{{ context(place) }}</small>
        </button>
      </li>
    </ul>
    <div
      v-if="value.candidate?.kind === 'short-plus-code'"
      class="destination-reference"
    >
      <label :for="'destination-reference-' + _uid"
        >Nearby town for this short Plus Code</label
      >
      <div class="destination-input-row">
        <input
          :id="'destination-reference-' + _uid"
          :value="referenceQuery"
          :disabled="pending || resolving"
          @input="changeReference($event.target.value)"
          @keydown.enter.prevent="findReference"
        /><button
          type="button"
          :disabled="pending || resolving || referenceQuery.trim().length < 4"
          @click="findReference"
        >
          Find town
        </button>
      </div>
      <ul v-if="references.length" class="destination-results">
        <li v-for="place in references" :key="place.placeId">
          <button
            type="button"
            :disabled="pending"
            @click="useReference(place)"
          >
            <strong>{{ place.name }}</strong
            ><small>{{ context(place) }}</small>
          </button>
        </li>
      </ul>
    </div>
    <div
      v-if="value.place || value.candidate || value.reviewed"
      class="destination-preview"
    >
      <template v-if="value.place"
        ><strong>{{ value.place.name }}</strong
        ><small>{{ context(value.place) }}</small></template
      >
      <label v-else :for="'destination-name-' + _uid"
        >Place name<input
          :id="'destination-name-' + _uid"
          :value="value.name"
          maxlength="80"
          :disabled="pending"
          placeholder="Name this destination"
          @input="patch({ name: $event.target.value })"
      /></label>
      <small v-if="value.coordinates"
        >{{ value.coordinates[1].toFixed(6) }},
        {{ value.coordinates[0].toFixed(6) }}</small
      >
      <button
        v-if="
          value.candidate &&
          !value.reviewed &&
          value.candidate.kind !== 'short-plus-code'
        "
        type="button"
        :disabled="pending || resolving"
        @click="review"
      >
        {{
          value.candidate.kind === "explicit-coordinate"
            ? "Review on map"
            : "Choose exact spot on map"
        }}
      </button>
    </div>
    <div class="destination-actions">
      <button type="button" :disabled="pending || resolving" @click="dropPin">
        Drop a pin
      </button>
      <button
        v-if="value.place || value.reviewed"
        type="button"
        class="destination-add"
        :disabled="pending || resolving || !selection"
        @click="choose"
      >
        {{ actionLabel }}
      </button>
      <slot :selection="selection" />
    </div>
  </section>
</template>
<script>
import {
  parseLocationInput,
  parsePlusCode,
} from "../../../../shared/my-atlas-location-input.mjs"
import { destinationSelection } from "../catalog/destinationDraft.mjs"
import { searchMyAtlasPlaces } from "../catalog/placeSearchClient.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import placeCatalog from "../data/place-catalog.proof.json"
export default {
  name: "MyAtlasDestinationPicker",
  props: {
    value: { type: Object, required: true },
    pending: Boolean,
    actionLabel: { type: String, default: "Add destination" },
    contextLabel: { type: String, default: "destination" },
    resolveLink: { type: Function, default: null },
  },
  emits: ["input", "review", "choose"],
  data: () => ({
    results: [],
    references: [],
    referenceQuery: "",
    resolving: false,
    error: "",
    sequence: 0,
    timer: null,
  }),
  computed: {
    selection() {
      return destinationSelection(this.value)
    },
    status() {
      if (this.resolving)
        return {
          title: "Finding your location",
          copy: "Keep this form open while the result is checked.",
        }
      if (this.value.place)
        return {
          title: "Place selected",
          copy:
            this.contextLabel === "lodging"
              ? "Review the place below, then select Use this location for your stay."
              : "Review the place below, then add it to your trip.",
        }
      if (this.value.reviewed)
        return {
          title: "Map position confirmed",
          copy: this.selection
            ? this.contextLabel === "lodging"
              ? "Ready to use. Select Use this location, then save your lodging."
              : "Ready to add. This destination is not saved until you add it."
            : "Enter a place name of up to 80 characters, without markup, then add it to your trip.",
        }
      const kind = this.value.candidate?.kind
      if (kind === "explicit-coordinate")
        return {
          title:
            this.value.candidate.provider === "Plus Code"
              ? "Plus Code located"
              : "Coordinates found",
          copy:
            this.value.candidate.provider === "Plus Code"
              ? "This is the code area's center. Review and adjust the pin before adding your destination."
              : "Review the pin on the map before adding this destination.",
        }
      if (kind === "short-plus-code")
        return {
          title: "A nearby reference is needed",
          copy: "Choose a town or area to locate this short Plus Code.",
        }
      if (kind)
        return {
          title: "Choose the exact location",
          copy: "This input does not identify one exact place. Drop or adjust the pin on the map.",
        }
      return null
    },
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    clearTimeout(this.timer)
    this.sequence++
  },
  methods: {
    patch(change) {
      this.$emit("input", { ...this.value, ...change })
    },
    context(place) {
      return [
        ...new Set(
          [
            place.admin1Name,
            place.countryName,
            place.placeType === "custom" ? "Custom pin" : place.placeType,
          ].filter(Boolean)
        ),
      ].join(" · ")
    },
    changeQuery(query) {
      clearTimeout(this.timer)
      this.sequence++
      this.resolving = false
      this.results = []
      this.references = []
      this.error = ""
      this.patch({
        query,
        name: this.value.place ? "" : this.value.name,
        candidate: null,
        place: null,
        coordinates: null,
        reviewed: false,
      })
      this.$nextTick(() => {
        this.timer = setTimeout(() => this.readInput(false), 300)
      })
    },
    paste(event) {
      const text = event.clipboardData?.getData("text/plain")
      if (!text || this.pending) return
      event.preventDefault()
      const input = event.target,
        start = input.selectionStart ?? input.value.length,
        end = input.selectionEnd ?? start
      const query =
        input.value.slice(0, start) +
        text.replace(/[\r\n\t]+/g, " ") +
        input.value.slice(end)
      if (query.length > 4096) {
        this.error =
          "Paste just the place, map link, Plus Code or coordinate pair."
        return
      }
      this.changeQuery(query)
    },
    async search(query) {
      const result = await searchMyAtlasPlaces({
        query,
        catalog: placeCatalog,
        endpoint: getMyAtlasPlaceSearchEndpoint(
          process.env,
          window.location.origin
        ),
      })
      return [
        ...new Map(
          (result.places || result).map(place => [place.placeId, place])
        ).values(),
      ]
    },
    async readInput(explicit = true) {
      if (this.pending || this.resolving) return
      clearTimeout(this.timer)
      const query = this.value.query.trim(),
        sequence = ++this.sequence
      if (!query) return
      this.error = ""
      this.results = []
      let candidate = parseLocationInput(query)
      if (candidate.kind === "short-link" && !explicit) {
        this.error = "Select Find to read this short Maps link, or drop a pin."
        return
      }
      this.resolving = true
      try {
        if (candidate.kind === "short-link") {
          if (!this.resolveLink) throw Error("short-link")
          candidate = await this.resolveLink(
            query.match(/https:\/\/[^\s<>]+/)?.[0] || query
          )
          if (candidate.kind === "unknown")
            candidate = parsePlusCode(candidate.label) || candidate
        }
        if (sequence !== this.sequence) return
        if (
          candidate.kind === "invalid-coordinate" ||
          candidate.kind === "ambiguous"
        ) {
          this.error =
            candidate.kind === "invalid-coordinate"
              ? "These coordinates are outside the map's supported range. Paste latitude, longitude in that order, or drop a pin."
              : "More than one location was found. Paste one location or drop a pin to choose the exact spot."
          return
        }
        if (candidate.kind === "unsupported") {
          if (/https?:|:\/\/|[<>]/i.test(query)) {
            this.error =
              "This link could not be read. Try a full Google or Apple Maps link, coordinates, or drop a pin."
            return
          }
          if (query.length < 4) {
            if (explicit)
              this.error = "Enter at least four characters, or drop a pin."
            return
          }
          const results = await this.search(query)
          if (sequence !== this.sequence) return
          this.results = results
          if (!results.length)
            this.error =
              "No matching place found. Try a nearby town or drop a pin for this spot."
        } else {
          this.patch({
            candidate,
            place: null,
            coordinates: null,
            reviewed: false,
          })
          this.referenceQuery = candidate.referenceQuery || ""
        }
      } catch {
        if (sequence === this.sequence)
          this.error =
            "The location could not be read. Try again, use full coordinates, or drop a pin."
      } finally {
        if (sequence === this.sequence) this.resolving = false
      }
    },
    choose() {
      if (!this.pending && !this.resolving && this.selection)
        this.$emit("choose", {
          selection: this.selection,
          name: this.value.place?.name || this.value.name,
          place: this.value.place,
        })
    },
    selectPlace(place) {
      if (this.pending) return
      this.patch({
        place,
        name: place.name,
        coordinates: place.coordinates ? [...place.coordinates] : null,
        candidate: null,
        reviewed: false,
      })
      this.results = []
      this.error = ""
    },
    review() {
      const candidate = this.value.candidate
      if (!candidate || this.pending) return
      this.$emit("review", {
        coordinates: candidate.coordinates || null,
        name: this.value.name.trim() || candidate.label || "",
        kind: candidate.kind,
      })
    },
    dropPin() {
      if (!this.pending)
        this.$emit("review", {
          coordinates: this.value.coordinates || null,
          name: this.value.name.trim() || this.value.place?.name || "",
          kind: "drop-pin",
        })
    },
    async findReference() {
      if (
        this.pending ||
        this.resolving ||
        this.referenceQuery.trim().length < 4
      )
        return
      const sequence = ++this.sequence
      this.resolving = true
      this.error = ""
      try {
        const results = await this.search(this.referenceQuery.trim())
        if (sequence === this.sequence) {
          this.references = results.filter(
            place =>
              place.placeType === "city" && Array.isArray(place.coordinates)
          )
          if (!this.references.length)
            this.error =
              "No reference town found. Try a nearby city, use a full Plus Code, or drop a pin."
        }
      } catch {
        if (sequence === this.sequence)
          this.error =
            "Nearby search is unavailable. Use the full Plus Code or drop a pin."
      } finally {
        if (sequence === this.sequence) this.resolving = false
      }
    },
    changeReference(query) {
      this.sequence++
      this.referenceQuery = query
      this.resolving = false
      this.references = []
      this.error = ""
    },
    useReference(place) {
      if (this.pending || this.value.candidate?.kind !== "short-plus-code")
        return
      const candidate = parsePlusCode(
        this.value.candidate.code,
        place.coordinates
      )
      if (candidate) {
        this.patch({ candidate })
        this.references = []
      }
    },
  },
}
</script>
<style scoped>
.destination-picker {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.destination-picker label {
  display: grid;
  gap: 6px;
  font-size: 0.78rem;
}
.destination-input-row {
  display: flex;
  gap: 8px;
  min-width: 0;
}
.destination-input-row input {
  flex: 1;
  min-width: 0;
}
.destination-picker input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--color-control-border, #71848d);
  border-radius: 8px;
  background: var(--color-surface, #112124);
  color: var(--color-text, #f3f1e9);
  font: inherit;
  font-size: 0.85rem;
}
.destination-picker button {
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 8px;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}
.destination-picker button:disabled {
  opacity: 0.5;
  cursor: default;
}
.destination-picker button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 2px;
}
.destination-status,
.destination-preview,
.destination-reference {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.destination-status {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.09);
}
.destination-status strong {
  color: var(--color-accent-soft, #e6ba68);
}
.destination-status span,
.destination-preview small {
  color: var(--color-text-muted, #adbcba);
}
.destination-results {
  display: grid;
  gap: 6px;
  max-height: min(240px, 35dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  padding: 0;
  margin: 0;
}
.destination-results button {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 12px;
  text-align: left;
}
.destination-results small {
  color: var(--color-text-muted, #adbcba);
}
.destination-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.destination-actions .destination-add {
  flex: 1;
  background: var(--color-accent, #e6ba68);
  color: var(--color-on-accent, #112124);
  font-weight: 600;
}
.destination-error {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-error, #eeafa7);
  line-height: 1.6;
}
</style>
