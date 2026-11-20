<template>
  <main class="shared-trip-page">
    <MyAtlasMap
      v-if="trip"
      class="shared-trip-map"
      :places="[]"
      :show-connections="false"
      :planner-active="true"
      :planner-route="plannerRoute"
      :planner-read-only="true"
    />

    <header>
      <router-link to="/atlas" aria-label="Return to the Travel Atlas">
        RWJ
      </router-link>
      <span>Shared trip</span>
    </header>

    <section v-if="trip" class="shared-trip-card">
      <div class="shared-trip-heading">
        <div>
          <p>Read only trip</p>
          <h1>{{ trip.title }}</h1>
          <span v-if="trip.desiredYear">
            Planned for {{ trip.desiredYear }}
          </span>
        </div>
        <button type="button" @click="copyLink">Copy link</button>
      </div>

      <details open>
        <summary>
          <span>Trip summary</span>
          <small>{{ trip.stops.length }} stops</small>
        </summary>

        <ol aria-label="Shared trip itinerary">
          <li>
            <b>S</b>
            <div>
              <small>Start</small>
              <strong>{{ trip.start.name }}</strong>
              <span>{{ context(trip.start) }}</span>
            </div>
          </li>
          <li
            v-for="(stop, index) in trip.stops"
            :key="`${stop.name}-${index}`"
          >
            <b>{{ index + 1 }}</b>
            <div>
              <small>Stop {{ index + 1 }}</small>
              <strong>{{ stop.name }}</strong>
              <span>{{ context(stop) }}</span>
            </div>
          </li>
          <li>
            <b>F</b>
            <div>
              <small>Finish</small>
              <strong>{{ finish.name }}</strong>
              <span>{{ context(finish) }}</span>
            </div>
          </li>
        </ol>

        <p class="shared-trip-note">
          The map follows the saved order. It does not include private notes,
          account details, live location, or turn by turn directions.
        </p>
      </details>

      <p class="shared-trip-status" aria-live="polite">
        {{ announcement }}
      </p>
    </section>

    <section v-else class="shared-trip-card shared-trip-error" role="alert">
      <h1>This trip link could not be opened.</h1>
      <p>Ask the trip owner to copy a new read only link from My Atlas.</p>
      <router-link to="/atlas">Open the Travel Atlas</router-link>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import { buildPlannerMapRoute } from "../planning/mapProjection.mjs"
import { decodeSharedTrip } from "../planning/sharedTrip.mjs"

export default {
  name: "MyAtlasSharedTripView",
  components: { MyAtlasMap },
  props: { snapshot: { type: String, required: true } },
  data() {
    let trip = null
    try {
      trip = decodeSharedTrip(this.snapshot)
    } catch {
      trip = null
    }
    return { trip, announcement: "" }
  },
  computed: {
    finish() {
      if (this.trip.endMode === "return-to-start") return this.trip.start
      if (this.trip.endMode === "selected-end") return this.trip.end
      return this.trip.stops[this.trip.stops.length - 1]
    },
    plannerRoute() {
      if (!this.trip) return []
      return buildPlannerMapRoute({
        start: this.trip.start,
        stops: this.trip.stops,
        endMode: this.trip.endMode,
        end: this.trip.end || null,
      })
    },
  },
  methods: {
    context(location) {
      return [location.admin1Name, location.countryName]
        .filter(Boolean)
        .join(", ")
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(window.location.href)
        this.announcement = "The read only trip link was copied."
      } catch {
        this.announcement = "Copy this page address to share the trip."
      }
    },
  },
}
</script>

<style scoped>
.shared-trip-page {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: #edf7f2;
  background: #0a1416;
  font-family: "Poppins", sans-serif;
}

.shared-trip-map {
  z-index: 0;
}

.shared-trip-page > header {
  position: absolute;
  z-index: 5;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.35rem 0.65rem 0.35rem 0.35rem;
  border: 1px solid rgba(230, 186, 104, 0.34);
  border-radius: 999px;
  color: #e6ba68;
  background: rgba(8, 17, 19, 0.9);
  box-shadow: 0 0.7rem 1.8rem rgba(0, 0, 0, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  font-weight: 800;
}

.shared-trip-page > header a {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 50%;
  color: #132023;
  background: #e6ba68;
  letter-spacing: 0;
  text-decoration: none;
}

.shared-trip-card {
  position: absolute;
  z-index: 4;
  top: 5rem;
  bottom: 1rem;
  left: 1rem;
  display: grid;
  width: min(25rem, calc(100vw - 2rem));
  align-content: start;
  gap: 1rem;
  box-sizing: border-box;
  padding: 1rem;
  overflow-y: auto;
  border: 1px solid rgba(230, 186, 104, 0.4);
  border-radius: 1.15rem;
  background: rgba(8, 17, 19, 0.92);
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(14px);
}

.shared-trip-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.shared-trip-heading > div {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.shared-trip-heading p,
.shared-trip-heading h1,
.shared-trip-heading span {
  margin: 0;
}

.shared-trip-heading p {
  color: #e6ba68;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.shared-trip-heading h1 {
  font-size: clamp(1.55rem, 4vw, 2.35rem);
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.shared-trip-heading span {
  color: #9eb0aa;
}

.shared-trip-heading button,
.shared-trip-error a {
  min-height: 2.6rem;
  flex: 0 0 auto;
  padding: 0.6rem 0.78rem;
  border: 1px solid #e6ba68;
  border-radius: 0.7rem;
  color: #132023;
  background: #e6ba68;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.shared-trip-card details {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.shared-trip-card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 2.9rem;
  color: #edf7f2;
  cursor: pointer;
  list-style: none;
}

.shared-trip-card summary::-webkit-details-marker {
  display: none;
}

.shared-trip-card summary span {
  font-size: 0.82rem;
  font-weight: 800;
}

.shared-trip-card summary small {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #e6ba68;
}

.shared-trip-card summary small::after {
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border: 1px solid rgba(230, 186, 104, 0.5);
  border-radius: 50%;
  content: "+";
  font-size: 0.82rem;
  line-height: 1;
}

.shared-trip-card details[open] summary small::after {
  content: "−";
}

.shared-trip-card ol {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shared-trip-card li {
  display: grid;
  grid-template-columns: 2.15rem minmax(0, 1fr);
  gap: 0.7rem;
  padding: 0.48rem 0;
}

.shared-trip-card li > b {
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border: 1px solid #e6ba68;
  border-radius: 50%;
  color: #e6ba68;
  font-size: 0.76rem;
}

.shared-trip-card li > div {
  display: grid;
  min-width: 0;
  gap: 0.08rem;
}

.shared-trip-card li strong {
  overflow-wrap: anywhere;
}

.shared-trip-card li small {
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.62rem;
}

.shared-trip-card li span,
.shared-trip-note {
  color: #9eb0aa;
}

.shared-trip-card li span {
  font-size: 0.7rem;
}

.shared-trip-note {
  margin: 0.6rem 0 0;
  font-size: 0.72rem;
  line-height: 1.55;
}

.shared-trip-status {
  min-height: 1.2rem;
  margin: 0;
  color: #e6ba68;
  font-size: 0.72rem;
}

.shared-trip-error {
  top: 50%;
  bottom: auto;
  left: 50%;
  max-width: 34rem;
  transform: translate(-50%, -50%);
}

.shared-trip-error h1,
.shared-trip-error p {
  margin: 0;
}

.shared-trip-error a {
  justify-self: start;
}

@media (max-width: 720px) {
  .shared-trip-page > header {
    top: 0.65rem;
    left: 0.65rem;
  }

  .shared-trip-card {
    top: auto;
    right: 0.65rem;
    bottom: 0.65rem;
    left: 0.65rem;
    width: auto;
    max-height: min(52dvh, 30rem);
    padding: 0.85rem;
  }

  .shared-trip-heading h1 {
    font-size: clamp(1.35rem, 7vw, 2rem);
  }

  .shared-trip-heading button {
    min-height: 2.45rem;
  }

  .shared-trip-error {
    top: 50%;
    right: 1rem;
    bottom: auto;
    left: 1rem;
    width: auto;
    max-height: none;
    transform: translateY(-50%);
  }
}

@media (max-width: 420px) {
  .shared-trip-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .shared-trip-heading button {
    width: 100%;
  }
}
</style>
