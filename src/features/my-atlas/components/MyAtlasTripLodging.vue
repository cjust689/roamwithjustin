<template>
  <section class="trip-lodging" aria-label="Trip lodging">
    <header>
      <div>
        <h4>Lodging</h4>
        <MyAtlasInfo label="About trip lodging"
          >Private places to stay for this trip. Lodging stays are independent
          of destinations and are excluded from shared links and public
          profiles.</MyAtlasInfo
        >
      </div>
      <button
        type="button"
        :disabled="pending || !enabled"
        @click="$emit('add')"
      >
        Add lodging
      </button>
    </header>
    <p v-if="!enabled" role="status">
      Lodging is unavailable on this server. Refresh trips to check again.
    </p>
    <p v-else-if="!stays.length" class="lodging-empty">No lodging added.</p>
    <ul v-else aria-label="Saved lodging">
      <li v-for="stay in stays" :key="stay.id">
        <div>
          <strong>{{ stay.name }}</strong
          ><small>{{ location(stay.place) }}</small
          ><span>{{ date(stay.checkIn) }} to {{ date(stay.checkOut) }}</span
          ><small
            >{{ nights(stay.checkIn, stay.checkOut) }}
            {{
              nights(stay.checkIn, stay.checkOut) === 1 ? "night" : "nights"
            }}</small
          >
          <a
            v-if="stay.url"
            :href="stay.url"
            target="_blank"
            rel="noopener noreferrer"
            referrerpolicy="no-referrer"
            >Open accommodation<span class="sr-only">
              for {{ stay.name }}</span
            ></a
          >
        </div>
        <button
          type="button"
          :disabled="pending"
          :aria-label="`Edit lodging ${stay.name}`"
          @click="$emit('edit', stay)"
        >
          Edit
        </button>
      </li>
    </ul>
  </section>
</template>
<script>
import MyAtlasInfo from "./MyAtlasInfo.vue"
import { sortedTripStays, stayDateLabel } from "../planning/stays.mjs"
import { tripStayNights } from "../../../../shared/my-atlas-trips.mjs"
export default {
  name: "MyAtlasTripLodging",
  components: { MyAtlasInfo },
  props: {
    trip: { type: Object, required: true },
    pending: Boolean,
    enabled: Boolean,
  },
  emits: ["add", "edit"],
  computed: {
    stays() {
      return sortedTripStays(this.trip)
    },
  },
  methods: {
    nights: tripStayNights,
    date: stayDateLabel,
    location(place) {
      return [place.name, place.admin1Name, place.countryName]
        .filter(Boolean)
        .join(", ")
    },
  },
}
</script>
<style scoped>
.trip-lodging {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-soft, #ffffff26);
}
header,
header > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
header {
  justify-content: space-between;
}
h4 {
  margin: 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0.6rem 0 0;
  max-height: 25rem;
  overflow-y: auto;
}
li {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--border-soft, #ffffff26);
}
li > div {
  display: grid;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
li button {
  flex: none;
}
small,
.lodging-empty {
  opacity: 0.8;
}
button {
  min-height: 2.75rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.65rem;
  background: transparent;
  color: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
a {
  color: var(--color-accent, #e6ba68);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 3px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
