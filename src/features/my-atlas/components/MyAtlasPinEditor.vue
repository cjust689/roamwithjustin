<template>
  <section class="pin-editor" aria-labelledby="pin-editor-title">
    <div class="pin-editor-heading">
      <div>
        <p>{{ pin ? "Edit destination" : "Add destination" }}</p>
        <h2 id="pin-editor-title">{{ place.name }}</h2>
        <span>{{ placeLabel }}</span>
      </div>
      <button type="button" :disabled="pending" @click="$emit('cancel')">
        Close
      </button>
    </div>

    <div class="pin-editor-dates">
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
      <p v-if="error" class="pin-editor-error" role="alert">{{ error }}</p>
    </div>

    <div class="pin-editor-actions">
      <button type="button" :disabled="pending" @click="submit">
        {{ pending ? "Saving" : pin ? "Save years" : "Add to My Atlas" }}
      </button>
      <small v-if="!dates.length && !year">
        You can add this destination without a year.
      </small>
    </div>
  </section>
</template>

<script>
import {
  formatVisitedDate,
  visitedDatesForPlace,
} from "../catalog/atlasInsights.mjs"

export default {
  name: "MyAtlasPinEditor",
  props: {
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
    place: {
      type: Object,
      required: true,
    },
    placeLabel: {
      type: String,
      default: "",
    },
  },
  emits: ["cancel", "save"],
  data() {
    return {
      currentYear: new Date().getFullYear(),
      dates: [
        ...new Set(visitedDatesForPlace(this.pin || {}).map(date => date.year)),
      ].map(year => ({ year })),
      year: "",
    }
  },
  computed: {
    validDraftDate() {
      return (
        Number.isInteger(this.year) &&
        this.year >= 1900 &&
        this.year <= this.currentYear &&
        !this.dates.some(date => date.year === this.year)
      )
    },
  },
  methods: {
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
      if (this.year) this.addDraftDate()
      this.$emit(
        "save",
        this.dates.map(date => ({ ...date }))
      )
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
  border: 1px solid rgba(230, 186, 104, 0.34);
  border-radius: 1.1rem;
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(230, 186, 104, 0.13),
      transparent 45%
    ),
    rgba(255, 255, 255, 0.045);
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
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.62rem;
  font-weight: 800;
}

.pin-editor-heading h2 {
  margin: 0.2rem 0;
  color: #f4fbf7;
  font-family: "Russo One", sans-serif;
  font-size: 1.35rem;
}

.pin-editor-heading span,
.pin-editor-dates > span,
.pin-editor-actions small {
  color: #91a59f;
  font-size: 0.68rem;
}

.pin-editor button,
.pin-editor input {
  font: inherit;
}

.pin-editor button {
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(230, 186, 104, 0.48);
  border-radius: 0.7rem;
  color: #f8e6bd;
  background: rgba(230, 186, 104, 0.08);
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
  color: #dce9e4;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.65rem;
}

.pin-editor-dates li button {
  padding: 0.25rem 0.4rem;
  border: 0;
  color: #d9aaa5;
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
  color: #b6c6c1;
  font-size: 0.65rem;
}

.pin-editor input {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.65rem;
  color: #f4fbf7;
  background: #111f22;
}

.pin-editor-actions {
  align-items: center;
  justify-content: space-between;
}

.pin-editor-actions > button {
  color: #132023;
  background: #e6ba68;
  font-weight: 800;
}

.pin-editor-error {
  color: #e7aaa4 !important;
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
