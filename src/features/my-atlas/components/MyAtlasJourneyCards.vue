<template>
  <section class="journey-cards" aria-label="Your journeys">
    <h2>Your journeys</h2>
    <p>Past adventures and upcoming plans, together.</p>
    <p v-if="pending" role="status">Loading journeys</p>
    <div v-else-if="error" role="status">
      <p>Your journeys could not be loaded. Your Atlas is unchanged.</p>
      <button type="button" @click="$emit('refresh')">Retry journeys</button>
    </div>
    <template v-else>
      <p v-if="!records.length">
        Trips you create will appear here. Ungrouped destinations stay in Past.
      </p>
      <article
        v-for="record in visible"
        :key="record.trip.tripId || record.trip.planId"
      >
        <div>
          <h3>{{ record.trip.title }}</h3>
          <span>{{
            record.legacy || record.trip.lifecycle === "planned"
              ? "Planned"
              : "Past"
          }}</span>
        </div>
        <p>
          {{
            record.trip.stops
              .slice(0, 3)
              .map(stop => (stop.place || stop).name)
              .join(" → ")
          }}{{ record.trip.stops.length > 3 ? " …" : "" }}
        </p>
        <p>
          {{ record.trip.stops.length }}
          {{ record.trip.stops.length === 1 ? "destination" : "destinations"
          }}<template v-if="date(record)"> · {{ date(record) }}</template>
        </p>
        <p v-if="!record.trip.stops.length">
          Add your first destination when you are ready.
        </p>
        <div class="journey-actions">
          <button type="button" @click="$emit('open', record)">
            Open journey ›
          </button>
        </div>
      </article>
      <button
        v-if="records.length > 3"
        type="button"
        :aria-expanded="String(all)"
        @click="all = !all"
      >
        {{ all ? "Show fewer journeys" : "View all journeys" }}
      </button>
      <div v-if="!records.length" class="journey-actions">
        <button type="button" @click="$emit('past')">
          Organize destinations</button
        ><button type="button" @click="$emit('plan')">Plan a journey</button>
      </div>
      <button v-else class="journey-new" type="button" @click="$emit('plan')">
        + Add a trip
      </button>
    </template>
  </section>
</template>

<script>
import {
  journeyCardRecords,
  journeyCardDate,
} from "../planning/journeyCards.mjs"
export default {
  name: "MyAtlasJourneyCards",
  props: {
    trips: { type: Array, default: () => [] },
    legacyPlans: { type: Array, default: () => [] },
    pending: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  emits: ["open", "share", "refresh", "past", "plan"],
  data: () => ({ all: false }),
  computed: {
    records() {
      return journeyCardRecords(this.trips, this.legacyPlans)
    },
    visible() {
      return this.all ? this.records : this.records.slice(0, 3)
    },
  },
  methods: { date: journeyCardDate },
}
</script>

<style scoped>
.journey-cards {
  display: grid;
  gap: 0.7rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.journey-cards h2,
.journey-cards h3,
.journey-cards p {
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.journey-cards h2 {
  font-size: 0.95rem;
}
.journey-cards h3 {
  font-size: 0.85rem;
}
.journey-cards p,
.journey-cards span {
  font-size: 0.73rem;
}
.journey-cards span {
  color: var(--color-accent-soft, #e6ba68);
}
.journey-cards article {
  display: grid;
  gap: 0.5rem;
  padding: 0.8rem;
  border: 1px solid var(--color-control-border, #324959);
  border-radius: 0.7rem;
  background: var(--color-surface-raised, #152629);
}
.journey-cards article > div:first-child,
.journey-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}
.journey-cards button {
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  padding: 0.55rem 0.75rem;
  border-radius: 0.6rem;
  background: transparent;
  color: var(--color-accent-soft, #e6ba68);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  min-height: 44px;
}
.journey-actions > button {
  width: 100%;
}
.journey-cards .journey-new {
  background: var(--color-accent, #e6ba68);
  color: var(--color-on-accent, #112124);
  font-weight: 600;
}
</style>
