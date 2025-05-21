<template>
  <div v-if="trip" class="trip-overview">
    <!-- Hero Carousel -->
    <HeroCarousel :images="trip.gallery" :cover="trip.cover" />

    <!-- Trip Header -->
    <section class="trip-header container section-block">
      <h1>{{ trip.name }}</h1>
      <p class="description">{{ trip.description }}</p>
      <div class="meta">
        <p><strong>Dates:</strong> {{ trip.dates }} ({{ trip.duration }})</p>
        <p><strong>Who it's for:</strong> {{ trip.who }}</p>
        <p><strong>When:</strong> {{ trip.bestTimeToGo }}</p>
        <!-- <p><strong>Cost level:</strong> {{ trip.costLevel }}</p> -->
      </div>
    </section>

    <!-- Day Breakdown -->
    <section
      v-for="(day, index) in trip.days"
      :key="index"
      class="trip-day container section-block"
    >
      <h2>{{ day.label }}</h2>
      <p>{{ day.summary }}</p>
      <ul v-if="day.routes && day.routes.length" class="route-links">
        <li v-for="(route, i) in day.routes" :key="i">
          <a :href="route.link" target="_blank" class="map-link">
            📍 Open {{ route.label }} in Maps
            <span v-if="route.duration">({{ route.duration }})</span>
          </a>
        </li>
      </ul>

      <div class="day-locations">
        <div
          v-for="entry in day.locations"
          :key="entry.ref"
          class="location-card clickable-card"
          @click="openLocation(entry.ref)"
        >
          <img
            :src="getLocation(entry.ref).image"
            :alt="getLocation(entry.ref).name"
          />
          <h4>{{ getLocation(entry.ref).name }}</h4>
          <p>{{ entry.notes }}</p>
          <p class="see-more">See more →</p>
        </div>
      </div>
    </section>

    <!-- Gear Highlights -->
    <section class="gear-section container section-block">
      <h2>Gear Highlights</h2>
      <div class="gear-grid">
        <a
          v-for="item in gearWithLinks"
          :key="item.name"
          :href="item.link"
          target="_blank"
          class="gear-item link"
        >
          {{ item.name }}
        </a>
        <span
          v-for="item in gearWithoutLinks"
          :key="item.name"
          class="gear-item"
        >
          {{ item.name }}
        </span>
      </div>
    </section>

    <!-- Lodging -->
    <section class="lodging-section container section-block">
      <h2>Where We Stayed</h2>
      <div class="lodging-grid">
        <div v-for="stay in trip.lodging" :key="stay.name" class="lodging-card">
          <img :src="stay.image" :alt="stay.name" />
          <div class="lodging-info">
            <h4>{{ stay.name }}</h4>
            <p class="location">
              <strong>Location:</strong> {{ stay.location }}
            </p>
            <p>{{ stay.blurb }}</p>
            <a
              v-if="stay.link"
              :href="stay.link"
              target="_blank"
              class="stay-link"
            >
              View Hotel →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Travel Notes & Tips -->
    <section class="notes-section container section-block">
      <h2>Tips & Travel Notes</h2>
      <div class="notes-columns">
        <div class="notes-block">
          <h4>🧭 Tips</h4>
          <ul>
            <li v-for="tip in trip.tips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
        <div class="notes-block">
          <h4>📝 Travel Notes</h4>
          <ul>
            <li v-for="note in trip.travelNotes" :key="note">{{ note }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Reel -->
    <section v-if="trip.reel" class="reel container section-block">
      <h2>Watch the Reel</h2>
      <a :href="trip.reel" target="_blank" class="ig-watch-button"
        >View on Instagram</a
      >
    </section>

    <!-- Location Modal -->
    <LocationModal
      :open="modalOpen"
      :location="activeLocation"
      @close="modalOpen = false"
    />
  </div>
</template>

<script>
import { trips } from "@/data/trips"
import LocationModal from "@/components/LocationModal.vue"
import HeroCarousel from "@/components/HeroCarousel.vue"

export default {
  name: "TripOverview",
  components: { LocationModal, HeroCarousel },
  props: ["id"],
  data() {
    return {
      modalOpen: false,
      activeLocation: null,
    }
  },
  computed: {
    trip() {
      return trips.find(t => t.id === this.id)
    },
    gearWithLinks() {
      return this.trip.gearHighlights.filter(item => item.link)
    },
    gearWithoutLinks() {
      return this.trip.gearHighlights.filter(item => !item.link)
    },
  },
  methods: {
    getLocation(ref) {
      return this.trip.locations.find(loc => loc.id === ref) || {}
    },
    openLocation(ref) {
      this.activeLocation = this.getLocation(ref)
      this.modalOpen = true
    },
  },
}
</script>

<style scoped>
.trip-overview {
  font-family: "Poppins", sans-serif;
}
.trip-day {
  margin-bottom: 3rem;
}
.day-locations {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.location-card {
  flex: 1 1 calc(50% - 1rem);
  background: #f9f9f9;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: box-shadow 0.3s;
}
.location-card:hover {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
.location-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.see-more {
  font-size: 0.85rem;
  color: #0077cc;
  text-decoration: underline;
  margin-top: 0.5rem;
  display: inline-block;
}
.route-links {
  list-style: none;
  padding-left: 0;
  margin-bottom: 1rem;
}
.map-button {
  display: inline-block;
  margin: 0.25rem 0 0.75rem;
  padding: 0.5rem 1rem;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.95rem;
  transition: background-color 0.3s;
  background-color: #0077cc;
}
.ig-watch-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  background-color: #0077cc;
  color: white;
  text-decoration: none;
  font-weight: bold;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}
.gear-section {
  margin-top: 2rem;
}

.gear-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.gear-item {
  padding: 0.5rem 1rem;
  background-color: #f4f4f4;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  /* prettier-ignore */
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.gear-item.link {
  background-color: #e0f3ff;
  color: #0077cc;
  text-decoration: none;
}

.gear-item.link:hover {
  background-color: #d0eaff;
  transform: translateY(-1px);
  text-decoration: underline;
}

.lodging-section {
  margin-top: 3rem;
}

.lodging-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.lodging-card {
  background: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease;
}

.lodging-card:hover {
  transform: translateY(-4px);
}

.lodging-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.lodging-info {
  padding: 1rem;
}

.lodging-info h4 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  color: #333;
}

.lodging-info .location {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stay-link {
  display: inline-block;
  margin-top: 0.75rem;
  color: #0077cc;
  font-weight: 600;
  text-decoration: underline;
}

.notes-section {
  margin-top: 3rem;
}

.notes-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.notes-block h4 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: #333;
}

.notes-block ul {
  list-style: disc;
  padding-left: 1.25rem;
  color: #444;
  font-size: 0.95rem;
  line-height: 1.5;
}

.notes-block li {
  margin-bottom: 0.5rem;
}

.route-links {
  list-style: none;
  padding-left: 0;
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.route-links li {
  margin: 1rem;
}

.map-link {
  font-size: 1.5rem;
  color: #0077cc;
  background-color: #f0f8ff;
  padding: 6px 12px;
  border-radius: 999px;
  text-decoration: none;
  border: 1px solid #0077cc;
  /* prettier-ignore */
  transition: background-color 0.2s ease, color 0.2s ease;
  white-space: nowrap;
}

.map-link:hover {
  background-color: #e6f2ff;
  color: #005fa3;
}
.section-block {
  background-color: #f8f9fb;
  border-radius: 10px;
  padding: 2rem;
  margin-bottom: 3rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}
.trip-day {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e2e2;
}
.trip-day h2 {
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.location-card h4 {
  font-size: 1.1rem;
  font-weight: 600;
}
.location-card {
  /* prettier-ignore */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.location-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.trip-overview {
  background-color: #fff;
}
</style>
