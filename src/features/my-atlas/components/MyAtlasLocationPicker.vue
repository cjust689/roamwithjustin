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
      <button
        type="button"
        :disabled="pending"
        :aria-expanded="String(linkOpen)"
        @click="linkOpen = !linkOpen"
      >
        Paste a map link
      </button>
    </div>
    <div v-if="linkOpen" class="location-link">
      <label
        >Google or Apple Maps link<input
          v-model="link"
          type="url"
          maxlength="4096"
          autocomplete="off"
          @input="clearCandidate"
      /></label>
      <button
        type="button"
        :disabled="pending || resolving || !link.trim()"
        @click="readLink"
      >
        {{ resolving ? "Reading location" : "Read location" }}
      </button>
      <small
        >Short links contact the map provider only when you select Read
        location.</small
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <div v-if="candidate" role="status">
        <strong>{{ candidate.provider }}</strong>
        <p v-if="candidate.label">{{ candidate.label }}</p>
        <p>{{ candidateMessage }}</p>
        <p v-if="candidate.coordinates">
          {{ candidate.coordinates[1] }}, {{ candidate.coordinates[0] }}
        </p>
        <button
          v-if="candidate.kind === 'explicit-coordinate'"
          type="button"
          :disabled="pending"
          @click="useCandidate"
        >
          Use these coordinates
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
    <div class="location-coordinates">
      <label
        >Latitude<input
          :value="latitude"
          type="number"
          min="-85.051129"
          max="85.051129"
          step="0.000001"
          @input="coordinateInput('latitude', $event.target.value)"
      /></label>
      <label
        >Longitude<input
          :value="longitude"
          type="number"
          min="-180"
          max="180"
          step="0.000001"
          @input="coordinateInput('longitude', $event.target.value)"
      /></label>
    </div>
    <p class="location-help">
      Review the name and map position before saving. Moving the map does not
      save a place.
    </p>
    <slot />
  </div>
</template>

<script>
import { parseMapLinkCandidate } from "../../../../shared/my-atlas-map-links.mjs"

export default {
  name: "MyAtlasLocationPicker",
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
    linkOpen: false,
    link: "",
    candidate: null,
    error: "",
    resolving: false,
    requestSequence: 0,
  }),
  computed: {
    candidateMessage() {
      return (
        {
          "explicit-coordinate":
            "Coordinates found. Confirm the marker, then adjust it if needed.",
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
    coordinateInput(field, value) {
      this.$emit(`update:${field}`, value)
      this.$emit("coordinates-change")
    },
    clearCandidate() {
      this.candidate = null
      this.error = ""
      this.requestSequence++
      this.resolving = false
    },
    async readLink() {
      const sequence = ++this.requestSequence
      this.error = ""
      const candidate = parseMapLinkCandidate(this.link)
      if (candidate.kind === "unsupported") {
        this.candidate = null
        this.error =
          "Use a Google or Apple Maps location link, or drop a pin instead."
      } else if (candidate.kind === "short-link") {
        this.candidate = null
        if (!this.resolveLink) {
          this.error =
            "Open the short link and copy the full Maps URL, or drop a pin instead."
          return
        }
        this.resolving = true
        try {
          const resolved = await this.resolveLink(this.link)
          if (sequence === this.requestSequence) this.candidate = resolved
        } catch {
          if (sequence === this.requestSequence)
            this.error =
              "The short link could not be read. Copy its full Maps URL, or drop a pin instead."
        } finally {
          if (sequence === this.requestSequence) this.resolving = false
        }
      } else this.candidate = candidate
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
.location-methods,
.location-coordinates {
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
.location-coordinates > label {
  flex: 1 1 110px;
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
.location-help {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
</style>
