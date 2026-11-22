<template>
  <section
    class="visit-manager"
    aria-label="Move destinations without deleting their memories"
  >
    <p v-if="!editing">
      {{
        sourceTrip
          ? sourceTrip.lifecycle === "past"
            ? "Choose destinations to move to another journey or return to Ungrouped. Memories and dates stay attached."
            : "Choose destinations to move to another planned journey. Memories and dates stay attached."
          : "These destinations are outside a journey. Select them to add to a named journey."
      }}
    </p>
    <p v-if="!items.length">No ungrouped visits.</p>
    <ul v-show="!editing">
      <li v-for="stop in items" :key="stop.stopId">
        <MyAtlasSwitch
          :value="selectedIds.includes(stop.stopId)"
          :disabled="pending"
          @input="toggleVisit(stop.stopId, $event)"
          >{{ stop.place.name }}</MyAtlasSwitch
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
    <div v-if="selectedIds.length && !editing" class="visit-form">
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
      <button type="button" :disabled="pending" @click="editingId = ''">
        Back to visits
      </button>
      <h4>{{ editing.place.name }}</h4>
      <div class="visit-editor-tabs" aria-label="Visit editor">
        <button
          type="button"
          :aria-pressed="String(editTab === 'details')"
          @click="editTab = 'details'"
        >
          Memory and dates
        </button>
        <button
          type="button"
          :aria-pressed="String(editTab === 'experiences')"
          @click="editTab = 'experiences'"
        >
          Experiences
        </button>
      </div>
      <div v-show="editTab === 'details'" class="visit-form">
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
      </div>
      <MyAtlasExperiences
        v-show="editTab === 'experiences'"
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
import MyAtlasSwitch from "./MyAtlasSwitch.vue"
export default {
  name: "MyAtlasVisitManager",
  components: { MyAtlasExperiences, MyAtlasSwitch },
  props: {
    sourceTrip: { type: Object, default: null },
    visits: { type: Array, default: () => [] },
    trips: { type: Array, default: () => [] },
    pending: { type: Boolean, default: false },
    savedSequence: { type: Number, default: 0 },
    initialTargetId: { type: String, default: "new" },
  },
  emits: ["transfer", "edit-visit"],
  data: () => ({
    selectedIds: [],
    target: "new",
    title: "",
    editingId: "",
    editTab: "details",
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
  created() {
    this.target = this.initialTargetId
  },
  methods: {
    toggleVisit(id, value) {
      this.selectedIds = value
        ? [...this.selectedIds, id]
        : this.selectedIds.filter(item => item !== id)
    },
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
      this.editTab = "details"
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
  margin: 0;
  padding: 0;
}
.visit-editor-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.visit-manager li > .atlas-switch {
  flex: 1;
  min-width: 0;
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
