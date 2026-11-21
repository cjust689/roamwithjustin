<template>
  <section class="pin-editor" aria-labelledby="pin-editor-title">
    <div class="pin-editor-heading">
      <div>
        <p>{{ editorLabel }}</p>
        <h2 id="pin-editor-title">{{ place.name }}</h2>
        <span>{{ placeLabel }}</span>
      </div>
      <button type="button" :disabled="pending" @click="$emit('cancel')">
        Close
      </button>
    </div>

    <div v-if="!memoryOnly" class="pin-editor-dates">
      <p>When did you visit?</p>
      <span>
        Optional. Add one or more years for timeline playback, or leave this
        destination undated.
      </span>
      <ul v-if="dates.length">
        <li v-for="date in dates" :key="dateKey(date)">
          {{ formatVisitedDate(date) }}
          <button
            type="button"
            :disabled="pending"
            :aria-label="'Remove ' + formatVisitedDate(date)"
            @click="removeDate(date)"
          >
            Remove
          </button>
        </li>
      </ul>
      <div class="pin-editor-date-row">
        <label>
          <span>Year</span>
          <input
            v-model.number="year"
            type="number"
            inputmode="numeric"
            min="1900"
            :max="currentYear"
            placeholder="Optional"
          />
        </label>
        <button
          type="button"
          :disabled="!validDraftDate || pending"
          @click="addDraftDate"
        >
          Add year
        </button>
      </div>
    </div>

    <label class="pin-editor-memory">
      <span>Favorite memory</span>
      <small>
        Optional. Add one plain-text memory for this destination. It appears on
        your shared Atlas when your Atlas is public.
      </small>
      <textarea
        ref="memoryInput"
        v-model="memory"
        rows="3"
        :maxlength="memoryMaxInputUnits"
        :aria-invalid="String(Boolean(memoryValidationMessage))"
        placeholder="What made this place memorable?"
        @input="memoryError = ''"
      />
      <span class="pin-editor-memory-count">
        {{ memoryCharacterCount }} / {{ memoryMaxCharacters }} characters
      </span>
      <span
        v-if="memoryValidationMessage"
        class="pin-editor-error"
        role="alert"
      >
        {{ memoryValidationMessage }}
      </span>
    </label>

    <details
      v-if="pin && place.placeType === 'custom' && !memoryOnly"
      @toggle="toggleLocationEditor"
    >
      <summary>Edit this custom location</summary>
      <MyAtlasLocationPicker
        v-if="locationEditing"
        :name="locationName"
        :latitude="locationLatitude"
        :longitude="locationLongitude"
        :pending="pending"
        :allow-search="false"
        :resolve-link="resolveLink"
        @update:name="locationName = $event"
        @update:latitude="locationLatitude = $event"
        @update:longitude="locationLongitude = $event"
        @coordinates-change="syncLocationPlacement"
        @choose-map="beginLocationPlacement"
      />
      <p>
        Saving updates this visited pin. Saved trip locations keep their
        original snapshots.
      </p>
      <p v-if="locationError" class="pin-editor-error" role="alert">
        {{ locationError }}
      </p>
    </details>
    <p v-if="error" class="pin-editor-error" role="alert">{{ error }}</p>

    <div class="pin-editor-actions">
      <button type="button" :disabled="pending" @click="submit">
        {{ saveLabel }}
      </button>
      <small v-if="!memoryOnly && !dates.length && !year">
        You can add this destination without a year.
      </small>
    </div>
    <MyAtlasExperiences
      v-if="pin"
      :experiences="pin.experiences || []"
      :pending="experiencePending"
      :error="experienceError"
      :saved-sequence="experienceSavedSequence"
      @change="$emit('experience-change', $event)"
    />
  </section>
</template>

<script>
import MyAtlasExperiences from "./MyAtlasExperiences.vue"
import MyAtlasLocationPicker from "./MyAtlasLocationPicker.vue"
import {
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
} from "../catalog/customPlace.mjs"
import {
  formatVisitedDate,
  visitedDatesForPlace,
} from "../catalog/atlasInsights.mjs"
import {
  MY_ATLAS_MEMORY_MAX_CHARACTERS,
  normalizeMyAtlasMemory,
} from "../catalog/memory.mjs"

export default {
  name: "MyAtlasPinEditor",
  components: { MyAtlasExperiences, MyAtlasLocationPicker },
  props: {
    experiencePending: Boolean,
    resolveLink: { type: Function, default: null },
    experienceError: { type: String, default: "" },
    experienceSavedSequence: { type: Number, default: 0 },
    error: {
      type: String,
      default: "",
    },
    pending: {
      type: Boolean,
      default: false,
    },
    pin: {
      type: Object,
      default: null,
    },
    memoryOnly: {
      type: Boolean,
      default: false,
    },
    place: {
      type: Object,
      required: true,
    },
    placeLabel: {
      type: String,
      default: "",
    },
  },
  emits: ["cancel", "save", "experience-change", "location-placement-change"],
  data() {
    return {
      currentYear: new Date().getFullYear(),
      locationEditing: false,
      locationPlacementActive: false,
      locationName: this.place.name,
      locationLatitude: String(this.place.coordinates?.[1] ?? ""),
      locationLongitude: String(this.place.coordinates?.[0] ?? ""),
      locationError: "",
      dates: [
        ...new Set(visitedDatesForPlace(this.pin || {}).map(date => date.year)),
      ].map(year => ({ year })),
      year: "",
      memory: this.pin?.memory || "",
      memoryError: "",
      memoryMaxCharacters: MY_ATLAS_MEMORY_MAX_CHARACTERS,
      memoryMaxInputUnits: MY_ATLAS_MEMORY_MAX_CHARACTERS * 2,
    }
  },
  computed: {
    editorLabel() {
      if (this.memoryOnly) return "Edit memory"
      return this.pin ? "Edit destination" : "Add destination"
    },
    saveLabel() {
      if (this.pending) return "Saving"
      if (this.memoryOnly) return "Save memory"
      return this.pin ? "Save destination" : "Add to My Atlas"
    },
    validDraftDate() {
      return (
        Number.isInteger(this.year) &&
        this.year >= 1900 &&
        this.year <= this.currentYear &&
        !this.dates.some(date => date.year === this.year)
      )
    },
    memoryCharacterCount() {
      return Array.from(this.memory).length
    },
    memoryValidationMessage() {
      if (this.memoryError) return this.memoryError
      if (this.memoryCharacterCount > this.memoryMaxCharacters) {
        return `Keep your favorite memory to ${this.memoryMaxCharacters} characters.`
      }
      if (normalizeMyAtlasMemory(this.memory) === null) {
        return "Use plain text without markup or invisible formatting controls."
      }
      return ""
    },
  },
  mounted() {
    if (this.memoryOnly) this.$nextTick(() => this.$refs.memoryInput?.focus())
  },
  methods: {
    toggleLocationEditor(event) {
      this.locationEditing = event.target.open
      if (!this.locationEditing) this.stopLocationPlacement()
    },
    locationCoordinates() {
      const values = [this.locationLongitude, this.locationLatitude]
      return values.every(value => String(value).trim() !== "")
        ? normalizeMyAtlasCustomCoordinates(values.map(Number))
        : null
    },
    syncLocationPlacement() {
      this.locationError = ""
      this.$emit("location-placement-change", {
        active: this.locationPlacementActive,
        coordinates: this.locationCoordinates(),
      })
    },
    beginLocationPlacement() {
      this.locationPlacementActive = true
      this.syncLocationPlacement()
    },
    stopLocationPlacement() {
      this.locationPlacementActive = false
      this.syncLocationPlacement()
    },
    setLocationCoordinates(value) {
      const coordinates = normalizeMyAtlasCustomCoordinates(value)
      if (!this.locationPlacementActive || !coordinates) return
      this.locationLongitude = String(coordinates[0])
      this.locationLatitude = String(coordinates[1])
      this.syncLocationPlacement()
    },
    addDraftDate() {
      if (!this.validDraftDate) return
      this.dates = [...this.dates, { year: this.year }].sort(
        (left, right) => left.year - right.year
      )
      this.year = ""
    },
    dateKey(date) {
      return String(date.year)
    },
    formatVisitedDate,
    removeDate(date) {
      const key = this.dateKey(date)
      this.dates = this.dates.filter(
        candidate => this.dateKey(candidate) !== key
      )
    },
    submit() {
      const customPlace = this.locationEditing
        ? normalizeMyAtlasCustomPlace({
            name: this.locationName,
            coordinates: this.locationCoordinates(),
          })
        : undefined
      if (customPlace === null) {
        this.locationError = "Enter a name and valid coordinates before saving."
        return
      }
      if (this.year) this.addDraftDate()
      const memory = normalizeMyAtlasMemory(this.memory)
      if (memory === null) {
        this.memoryError =
          this.memoryCharacterCount > this.memoryMaxCharacters
            ? `Keep your favorite memory to ${this.memoryMaxCharacters} characters.`
            : "Use plain text without markup or invisible formatting controls."
        return
      }
      this.$emit("save", {
        visitedDates: this.dates.map(date => ({ ...date })),
        memory,
        ...(customPlace ? { customPlace } : {}),
      })
    },
  },
}
</script>

<style scoped>
.pin-editor {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.34);
  border-radius: 1.1rem;
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(var(--color-accent-rgb, 230, 186, 104), 0.13),
      transparent 45%
    ),
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.045);
}

.pin-editor-heading,
.pin-editor-date-row,
.pin-editor-actions {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
}

.pin-editor-heading {
  align-items: flex-start;
  justify-content: space-between;
}

.pin-editor-heading p,
.pin-editor-dates p {
  margin: 0;
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.62rem;
  font-weight: 800;
}

.pin-editor-heading h2 {
  margin: 0.2rem 0;
  color: var(--color-text, #f4fbf7);
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 1.35rem;
}

.pin-editor-heading span,
.pin-editor-dates > span,
.pin-editor-actions small {
  color: var(--color-text-muted, #91a59f);
  font-size: 0.68rem;
}

.pin-editor button,
.pin-editor input,
.pin-editor textarea {
  font: inherit;
}

.pin-editor button {
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.48);
  border-radius: 0.7rem;
  color: var(--color-accent-soft, #f8e6bd);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
  cursor: pointer;
}

.pin-editor button:disabled {
  cursor: wait;
  opacity: 0.48;
}

.pin-editor-dates {
  display: grid;
  gap: 0.55rem;
}

.pin-editor-dates ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pin-editor-dates li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.35rem 0.25rem 0.55rem;
  border-radius: 999px;
  color: var(--color-text, #dce9e4);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  font-size: 0.65rem;
}

.pin-editor-dates li button {
  padding: 0.25rem 0.4rem;
  border: 0;
  color: var(--color-error, #d9aaa5);
  background: transparent;
  font-size: 0.58rem;
}

.pin-editor-date-row {
  align-items: end;
}

.pin-editor-date-row label {
  display: grid;
  flex: 1;
  gap: 0.25rem;
  color: var(--color-text-muted, #b6c6c1);
  font-size: 0.65rem;
}

.pin-editor input {
  box-sizing: border-box;
  height: 2.9rem;
  margin: 0;
  min-width: 0;
  width: 100%;
  padding: 0.55rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.15);
  border-radius: 0.65rem;
  color: var(--color-text, #f4fbf7);
  background: var(--color-surface-raised, #111f22);
}

.pin-editor-memory {
  display: grid;
  gap: 0.4rem;
  color: var(--color-text-muted, #b6c6c1);
  font-size: 0.65rem;
}

.pin-editor-memory > span:first-child {
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.62rem;
  font-weight: 800;
}

.pin-editor-memory small,
.pin-editor-memory-count {
  color: var(--color-text-muted, #91a59f);
  line-height: 1.45;
}

.pin-editor-memory textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 5.5rem;
  margin: 0;
  padding: 0.7rem;
  resize: vertical;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.15);
  border-radius: 0.65rem;
  color: var(--color-text, #f4fbf7);
  background: var(--color-surface-raised, #111f22);
  line-height: 1.5;
}

.pin-editor-memory textarea:focus {
  border-color: var(--color-accent, #e6ba68);
  box-shadow: 0 0 0 2px rgba(230, 186, 104, 0.16);
  outline: none;
}

.pin-editor-memory textarea[aria-invalid="true"] {
  border-color: var(--color-error, #d58f88);
}

.pin-editor-memory-count {
  justify-self: end;
}

.pin-editor-date-row > button {
  box-sizing: border-box;
  height: 2.9rem;
  white-space: nowrap;
}

.pin-editor-actions {
  align-items: center;
  justify-content: space-between;
}

.pin-editor-actions > button {
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
  font-weight: 800;
}

.pin-editor-error {
  color: var(--color-error, #e7aaa4) !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

@media (max-width: 520px) {
  .pin-editor-date-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
