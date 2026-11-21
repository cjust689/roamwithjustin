<template>
  <section
    class="visit-manager"
    aria-label="Move visits without deleting their memories"
  >
    <h4>{{ sourceTrip ? "Move or ungroup visits" : "Ungrouped visits" }}</h4>
    <p>
      {{
        sourceTrip
          ? "Choose visits to move. Their memories and dates stay attached. An empty source trip is kept for you to review."
          : "These visits are outside a trip. Edit them here or add them to a named trip."
      }}
    </p>
    <p v-if="!items.length">No ungrouped visits.</p>
    <ul>
      <li v-for="stop in items" :key="stop.stopId">
        <label class="visit-check"
          ><input
            v-model="selectedIds"
            type="checkbox"
            :value="stop.stopId"
            :disabled="pending"
          />
          <span>{{ stop.place.name }}</span></label
        >
        <button
          v-if="!sourceTrip"
          type="button"
          :disabled="pending"
          @click="edit(stop)"
        >
          Edit visit
        </button>
      </li>
    </ul>
    <div v-if="selectedIds.length" class="visit-form">
      <label
        >Move to<select v-model="target" :disabled="pending">
          <option v-if="sourceTrip && sourceTrip.lifecycle === 'past'" value="">
            Ungrouped destinations
          </option>
          <option value="new">A new trip</option>
          <option
            v-for="trip in targets"
            :key="trip.tripId"
            :value="trip.tripId"
          >
            {{ trip.title }} ·
            {{ trip.sharing.publicAtlas ? "Public Atlas" : "Private" }}
          </option>
        </select></label
      >
      <label v-if="target === 'new'"
        >New trip name<input v-model="title" maxlength="80" :disabled="pending"
      /></label>
      <p v-if="target === ''">
        The visits keep their existing Atlas visibility. The source trip and its
        travel details are retained.
      </p>
      <p v-else>
        {{
          target === "new"
            ? "The new trip starts private."
            : "Destination visibility follows the chosen trip. Private memories stay private."
        }}
      </p>
      <button
        type="button"
        :disabled="pending || (target === 'new' && !title.trim())"
        @click="transfer"
      >
        {{ target === "" ? "Return to Ungrouped" : "Move selected visits" }}
      </button>
    </div>
    <div v-if="editing && !sourceTrip" class="visit-form">
      <h4>{{ editing.place.name }}</h4>
      <label
        >Favorite memory<textarea
          v-model="memory"
          maxlength="500"
          :disabled="pending"
        />
      </label>
      <div class="visit-dates">
        <label v-for="field in dateFields" :key="field.key"
          >{{ field.label
          }}<input v-model="dates[field.key]" type="date" :disabled="pending"
        /></label>
      </div>
      <button type="button" :disabled="pending" @click="save">
        Save visit details
      </button>
      <button type="button" @click="editingId = ''">Close editor</button>
      <MyAtlasExperiences
        :experiences="editing.experiences"
        :pending="pending"
        :saved-sequence="savedSequence"
        @change="
          $emit('edit-visit', {
            stopId: editingId,
            patch: { experienceChange: $event },
          })
        "
      />
    </div>
  </section>
</template>

<script>
import MyAtlasExperiences from "./MyAtlasExperiences.vue"
export default {
  name: "MyAtlasVisitManager",
  components: { MyAtlasExperiences },
  props: {
    sourceTrip: { type: Object, default: null },
    visits: { type: Array, default: () => [] },
    trips: { type: Array, default: () => [] },
    pending: { type: Boolean, default: false },
    savedSequence: { type: Number, default: 0 },
  },
  emits: ["transfer", "edit-visit"],
  data: () => ({
    selectedIds: [],
    target: "new",
    title: "",
    editingId: "",
    memory: "",
    dates: {},
    dateFields: [
      { key: "plannedArrival", label: "Planned arrival" },
      { key: "plannedDeparture", label: "Planned departure" },
      { key: "actualArrival", label: "Actual arrival" },
      { key: "actualDeparture", label: "Actual departure" },
    ],
  }),
  computed: {
    items() {
      return this.sourceTrip
        ? this.sourceTrip.stops
        : this.visits.map(visit => visit.stop)
    },
    editing() {
      return this.items.find(stop => stop.stopId === this.editingId)
    },
    targets() {
      return this.trips.filter(
        trip =>
          trip.tripId !== this.sourceTrip?.tripId &&
          trip.lifecycle === (this.sourceTrip?.lifecycle || "past") &&
          trip.workflow !== "archived"
      )
    },
  },
  watch: {
    items(value) {
      this.selectedIds = this.selectedIds.filter(id =>
        value.some(stop => stop.stopId === id)
      )
      if (!value.some(stop => stop.stopId === this.editingId))
        this.editingId = ""
    },
  },
  methods: {
    transfer() {
      if (
        this.pending ||
        !this.selectedIds.length ||
        (this.target === "new" && !this.title.trim())
      )
        return
      this.$emit("transfer", {
        fromTripId: this.sourceTrip?.tripId || null,
        targetTripId:
          this.target === "new" || this.target === "" ? null : this.target,
        stopIds: [...this.selectedIds],
        ...(this.target === "new" ? { title: this.title.trim() } : {}),
      })
    },
    edit(stop) {
      this.editingId = stop.stopId
      this.memory = stop.memories.find(item => item.kind === "note")?.text || ""
      this.dates = {
        plannedArrival: stop.plannedDates.arrival || "",
        plannedDeparture: stop.plannedDates.departure || "",
        actualArrival: stop.actualDates.arrival || "",
        actualDeparture: stop.actualDates.departure || "",
      }
    },
    save() {
      this.$emit("edit-visit", {
        stopId: this.editingId,
        patch: {
          memory: this.memory,
          plannedDates: {
            arrival: this.dates.plannedArrival || null,
            departure: this.dates.plannedDeparture || null,
          },
          actualDates: {
            arrival: this.dates.actualArrival || null,
            departure: this.dates.actualDeparture || null,
          },
        },
      })
    },
  },
}
</script>

<style scoped>
.visit-manager,
.visit-form {
  display: grid;
  gap: 0.7rem;
}
.visit-manager {
  margin-block: 0.8rem;
  padding: 0.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.25);
  border-radius: 0.8rem;
}
.visit-manager h4,
.visit-manager p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.6;
}
.visit-manager ul {
  display: grid;
  gap: 0.6rem;
  padding: 0;
  margin: 0;
  list-style: none;
}
.visit-manager li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.visit-check {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.visit-check input {
  position: static;
  opacity: 1;
  appearance: auto;
  pointer-events: auto;
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  margin: 0;
}
.visit-check span {
  padding: 0 !important;
  height: auto !important;
  line-height: 1.5 !important;
  font-size: 0.78rem !important;
}
.visit-check span::before,
.visit-check span::after {
  content: none !important;
}
.visit-form label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.75rem;
}
.visit-form input,
.visit-form textarea,
.visit-form select {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 0.65rem;
  color: inherit;
  background: var(--color-surface, #112124);
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 0.5rem;
  font: inherit;
}
.visit-manager button {
  padding: 0.55rem 0.7rem;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.4);
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}
.visit-dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}
</style>
