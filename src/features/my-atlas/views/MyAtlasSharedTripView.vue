<template>
  <main class="shared-trip-page">
    <header>
      <router-link to="/atlas" aria-label="Return to the Travel Atlas"
        >RWJ</router-link
      >
      <span>Shared trip</span>
    </header>

    <section v-if="trip" class="shared-trip-card">
      <div class="shared-trip-heading">
        <div>
          <p>Read only itinerary</p>
          <h1>{{ trip.title }}</h1>
          <span v-if="trip.desiredYear"
            >Planned for {{ trip.desiredYear }}</span
          >
        </div>
        <button type="button" @click="copyLink">Copy link</button>
      </div>

      <ol aria-label="Shared trip itinerary">
        <li>
          <b>S</b>
          <div>
            <small>Start</small><strong>{{ trip.start.name }}</strong
            ><span>{{ context(trip.start) }}</span>
          </div>
        </li>
        <li v-for="(stop, index) in trip.stops" :key="`${stop.name}-${index}`">
          <b>{{ index + 1 }}</b>
          <div>
            <small>Stop {{ index + 1 }}</small
            ><strong>{{ stop.name }}</strong
            ><span>{{ context(stop) }}</span>
          </div>
        </li>
        <li>
          <b>F</b>
          <div>
            <small>Finish</small><strong>{{ finish.name }}</strong
            ><span>{{ context(finish) }}</span>
          </div>
        </li>
      </ol>

      <p class="shared-trip-note">
        This snapshot is read only. It includes the route order and broad place
        details, but not private notes, account details, or live location.
      </p>
      <p class="shared-trip-status" aria-live="polite">{{ announcement }}</p>
    </section>

    <section v-else class="shared-trip-card shared-trip-error" role="alert">
      <h1>This trip link could not be opened.</h1>
      <p>Ask the trip owner to copy a new read only link from My Atlas.</p>
      <router-link to="/atlas">Open the Travel Atlas</router-link>
    </section>
  </main>
</template>

<script>
import { decodeSharedTrip } from "../planning/sharedTrip.mjs"

export default {
  name: "MyAtlasSharedTripView",
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
  box-sizing: border-box;
  min-height: 100dvh;
  padding: clamp(1rem, 4vw, 3rem);
  color: #edf7f2;
  background: #0a1416;
  font-family: "Poppins", sans-serif;
}
.shared-trip-page > header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  max-width: 52rem;
  margin: 0 auto 1.5rem;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  font-weight: 800;
}
.shared-trip-page > header a {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 50%;
  color: #132023;
  background: #e6ba68;
  letter-spacing: 0;
  text-decoration: none;
}
.shared-trip-card {
  display: grid;
  gap: 1.25rem;
  box-sizing: border-box;
  max-width: 52rem;
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 2rem);
  border: 1px solid rgba(230, 186, 104, 0.32);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.035);
}
.shared-trip-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}
.shared-trip-heading > div {
  display: grid;
  gap: 0.2rem;
}
.shared-trip-heading p,
.shared-trip-heading h1,
.shared-trip-heading span {
  margin: 0;
}
.shared-trip-heading p {
  color: #e6ba68;
  font-size: 0.75rem;
  font-weight: 800;
}
.shared-trip-heading h1 {
  font-size: clamp(1.8rem, 6vw, 3.4rem);
  line-height: 1.05;
}
.shared-trip-heading span {
  color: #9eb0aa;
}
.shared-trip-heading button,
.shared-trip-error a {
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e6ba68;
  border-radius: 0.7rem;
  color: #132023;
  background: #e6ba68;
  font: inherit;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
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
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.55rem 0;
}
.shared-trip-card li > b {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: 1px solid #e6ba68;
  border-radius: 50%;
  color: #e6ba68;
}
.shared-trip-card li > div {
  display: grid;
  gap: 0.1rem;
}
.shared-trip-card small {
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.shared-trip-card span,
.shared-trip-note {
  color: #9eb0aa;
}
.shared-trip-note {
  margin: 0;
  line-height: 1.6;
}
.shared-trip-status {
  min-height: 1.5rem;
  margin: 0;
  color: #e6ba68;
}
.shared-trip-error h1,
.shared-trip-error p {
  margin: 0;
}
.shared-trip-error a {
  justify-self: start;
}
@media (max-width: 560px) {
  .shared-trip-heading {
    flex-direction: column;
  }
  .shared-trip-heading button {
    width: 100%;
  }
}
</style>
