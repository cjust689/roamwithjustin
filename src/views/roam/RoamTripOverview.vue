<template>
  <main v-if="trip" class="trip-story">
    <section class="story-hero" :aria-labelledby="`story-title-${trip.id}`">
      <HeroCarousel
        class="story-hero-media"
        :images="trip.gallery"
        :cover="trip.cover"
        :label="`${trip.name} photography`"
      />
      <div class="story-hero-shade" aria-hidden="true"></div>

      <div class="story-shell story-hero-content">
        <router-link class="story-back" to="/trips">
          &larr; All travel stories
        </router-link>
        <div class="story-hero-copy">
          <span class="story-eyebrow">
            {{ trip.comingSoon ? "Journey preview" : "Travel story" }} /
            {{ trip.dates }}
          </span>
          <h1 :id="`story-title-${trip.id}`">{{ trip.name }}</h1>
          <p>{{ trip.description }}</p>
          <div class="story-hero-actions">
            <router-link v-if="trip.atlasHref" :to="trip.atlasHref">
              Explore this trip in Atlas
            </router-link>
            <a v-if="trip.hasItinerary" href="#itinerary">
              Read the itinerary
            </a>
            <a v-else-if="trip.comingSoon" href="#journey-preview">
              See what is ready
            </a>
          </div>
        </div>

        <dl class="story-facts">
          <template v-if="trip.comingSoon">
            <div>
              <dt>Status</dt>
              <dd>{{ trip.previewStatus }}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{{ trip.dates }}</dd>
            </div>
            <div>
              <dt>Media ready</dt>
              <dd>
                {{ trip.registeredMediaCount }}
                {{ trip.registeredMediaCount === 1 ? "image" : "images" }}
              </dd>
            </div>
          </template>
          <template v-else>
            <div>
              <dt>Duration</dt>
              <dd>{{ trip.duration }}</dd>
            </div>
            <div>
              <dt>Best time</dt>
              <dd>{{ trip.bestTimeToGo }}</dd>
            </div>
            <div>
              <dt>Made for</dt>
              <dd>{{ trip.who }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </section>

    <div class="story-body">
      <section
        v-if="trip.comingSoon"
        id="journey-preview"
        class="story-shell journey-preview"
      >
        <header class="section-intro">
          <div>
            <span class="story-eyebrow">Registered journey</span>
            <h2>A first look, without filling in the blanks.</h2>
          </div>
          <p>{{ trip.description }}</p>
        </header>

        <div class="preview-grid">
          <article>
            <span class="preview-number">01</span>
            <div>
              <span class="story-eyebrow">Ready now</span>
              <h3>The journey has a stable home.</h3>
              <p>
                Its canonical record, public URL, and available photography are
                already connected. Verified material can expand this preview in
                place without changing its address.
              </p>
            </div>
          </article>
          <article>
            <span class="preview-number">02</span>
            <div>
              <span class="story-eyebrow">Still to come</span>
              <h3>Stops, route, and field notes.</h3>
              <p>
                The itinerary and Atlas path remain hidden until the places,
                route order, and coordinates are confirmed. That keeps a
                polished preview from becoming a made-up trip.
              </p>
            </div>
          </article>
        </div>

        <router-link class="preview-atlas-link" to="/atlas">
          Explore journeys already mapped in Atlas &rarr;
        </router-link>
      </section>

      <section
        v-if="trip.hasItinerary"
        id="itinerary"
        class="story-shell itinerary-section"
      >
        <header class="section-intro">
          <span class="story-eyebrow">The route, day by day</span>
          <h2>Inside the journey</h2>
          <p>
            Open a place for photographs and field notes, or jump directly to
            its Atlas pin when that stop has a mapped presentation.
          </p>
        </header>

        <article
          v-for="(day, index) in trip.days"
          :key="day.label"
          class="story-day"
        >
          <header class="day-heading">
            <span>{{ String(index + 1).padStart(2, "0") }}</span>
            <div>
              <p>Itinerary chapter</p>
              <h3>{{ day.label }}</h3>
            </div>
          </header>

          <p class="day-summary">{{ day.summary }}</p>

          <div v-if="day.routes && day.routes.length" class="route-links">
            <a
              v-for="route in day.routes"
              :key="route.link"
              :href="route.link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Route</span>
              {{ route.label }}
              <small v-if="route.duration">{{ route.duration }}</small>
            </a>
          </div>

          <div class="location-grid">
            <article
              v-for="entry in day.locations"
              :key="entry.ref"
              class="location-card"
            >
              <button type="button" @click="openLocation(entry.ref)">
                <span class="location-image">
                  <img
                    :src="getLocation(entry.ref).image"
                    :alt="
                      getLocation(entry.ref).mediaPending
                        ? `${trip.name} journey cover; ${getLocation(entry.ref).name} photos coming soon`
                        : getLocation(entry.ref).name
                    "
                    loading="lazy"
                  />
                  <span
                    v-if="getLocation(entry.ref).mediaPending"
                    class="location-media-status"
                  >
                    Location photos coming soon
                  </span>
                </span>
                <span class="location-copy">
                  <span>{{ getLocation(entry.ref).type || "Trip stop" }}</span>
                  <strong>{{ getLocation(entry.ref).name }}</strong>
                  <small>{{ getLocationSummary(entry) }}</small>
                  <b>Open field notes &rarr;</b>
                </span>
              </button>
              <router-link
                v-if="getLocation(entry.ref).atlasExact"
                class="location-atlas-link"
                :to="getLocation(entry.ref).atlasHref"
              >
                View this stop in Atlas
              </router-link>
            </article>
          </div>
        </article>
      </section>

      <section
        v-if="trip.lodging.length"
        class="story-shell story-support-section"
      >
        <header class="section-intro compact">
          <span class="story-eyebrow">Where we reset</span>
          <h2>Where we stayed</h2>
        </header>
        <div class="lodging-grid">
          <article
            v-for="stay in trip.lodging"
            :key="stay.name"
            class="lodging-card"
          >
            <img
              v-if="stay.image"
              :src="stay.image"
              :alt="stay.name"
              loading="lazy"
            />
            <div v-else class="lodging-media-placeholder" aria-hidden="true">
              <span>Photography coming soon</span>
            </div>
            <div>
              <span>{{ stay.location }}</span>
              <h3>{{ stay.name }}</h3>
              <p>{{ stay.blurb }}</p>
              <a
                v-if="stay.link"
                :href="stay.link"
                target="_blank"
                rel="noopener noreferrer"
              >
                View hotel &nearr;
              </a>
            </div>
          </article>
        </div>
      </section>

      <section v-if="trip.hasFieldNotes" class="story-shell story-details-grid">
        <article v-if="trip.gearHighlights.length" class="story-detail-card">
          <span class="story-eyebrow">Field kit</span>
          <h2>Gear highlights</h2>
          <div class="gear-list">
            <a
              v-for="item in gearWithLinks"
              :key="item.name"
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.name }} <span>&nearr;</span>
            </a>
            <span v-for="item in gearWithoutLinks" :key="item.name">
              {{ item.name }}
            </span>
          </div>
        </article>

        <article
          v-if="trip.tips.length || trip.travelNotes.length"
          class="story-detail-card"
        >
          <span class="story-eyebrow">Before you go</span>
          <h2>Tips and notes</h2>
          <div class="notes-grid">
            <div>
              <h3>Useful tips</h3>
              <ul>
                <li v-for="tip in trip.tips" :key="tip">{{ tip }}</li>
              </ul>
            </div>
            <div>
              <h3>Travel notes</h3>
              <ul>
                <li v-for="note in trip.travelNotes" :key="note">
                  {{ note }}
                </li>
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section v-if="trip.atlasHref" class="story-shell atlas-handoff">
        <div>
          <span class="story-eyebrow">Change perspective</span>
          <h2>See how the story moves across the map.</h2>
          <p>
            Continue geographically through the same canonical stops, route,
            photographs, and guided journey.
          </p>
        </div>
        <div class="handoff-actions">
          <router-link v-if="trip.atlasHref" :to="trip.atlasHref">
            Open this journey in Atlas
          </router-link>
          <a
            v-if="trip.reel"
            :href="trip.reel"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch the trip reel &nearr;
          </a>
        </div>
      </section>
    </div>

    <LocationModal
      :open="modalOpen"
      :location="activeLocation"
      @close="modalOpen = false"
    />
  </main>
</template>

<script>
import { getTripViewModel } from "@/content/selectors/trips"
import HeroCarousel from "@/components/HeroCarousel.vue"
import LocationModal from "@/components/LocationModal.vue"

export default {
  name: "TripOverview",
  components: { HeroCarousel, LocationModal },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      modalOpen: false,
      activeLocation: null,
    }
  },
  computed: {
    trip() {
      return getTripViewModel(this.id)
    },
    gearWithLinks() {
      return this.trip?.gearHighlights.filter(item => item.link) || []
    },
    gearWithoutLinks() {
      return this.trip?.gearHighlights.filter(item => !item.link) || []
    },
  },
  methods: {
    getLocation(ref) {
      return this.trip.locations.find(location => location.id === ref) || {}
    },
    getLocationSummary(entry) {
      return entry.notes || this.getLocation(entry.ref).description || ""
    },
    openLocation(ref) {
      this.activeLocation = this.getLocation(ref)
      this.modalOpen = true
    },
  },
}
</script>

<style scoped>
.trip-story {
  overflow: hidden;
  background: #0b1114;
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
}

.story-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
}

.story-hero {
  position: relative;
  min-height: min(860px, calc(100vh - 72px));
  isolation: isolate;
}

.story-hero-media,
.story-hero-shade {
  position: absolute;
  inset: 0;
}

.story-hero-shade {
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(5, 9, 11, 0.88), rgba(5, 9, 11, 0.22) 70%),
    linear-gradient(180deg, rgba(5, 9, 11, 0.18), #0b1114 98%);
}

.story-hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: min(860px, calc(100vh - 72px));
  flex-direction: column;
  justify-content: flex-end;
  padding: 3rem 0 clamp(2.5rem, 7vw, 5rem);
}

.story-back {
  position: absolute;
  top: 1.5rem;
  left: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.76rem;
  font-weight: 700;
  text-decoration: none;
}

.story-hero-copy {
  max-width: 820px;
  text-shadow: 0 8px 40px rgba(0, 0, 0, 0.38);
}

.story-eyebrow,
.story-facts dt,
.day-heading > span,
.day-heading p,
.location-copy > span,
.lodging-card > div > span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.story-hero h1 {
  max-width: 900px;
  margin: 0.65rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3.6rem, 9vw, 8.5rem);
  font-weight: 500;
  letter-spacing: -0.065em;
  line-height: 0.88;
}

.story-hero-copy > p {
  max-width: 690px;
  margin: 1.3rem 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: clamp(0.98rem, 1.5vw, 1.12rem) !important;
  font-weight: 400;
  line-height: 1.65;
}

.story-hero-actions,
.handoff-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.5rem;
}

.story-hero-actions a,
.handoff-actions a {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.8rem 1rem;
  background: rgba(7, 11, 14, 0.44);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  backdrop-filter: blur(10px);
}

.story-hero-actions a:first-child,
.handoff-actions a:first-child {
  border-color: #f6bd60;
  background: #f6bd60;
  color: #111719;
}

.story-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 850px;
  margin: clamp(2rem, 5vw, 4rem) 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.story-facts div {
  min-width: 0;
  padding: 1rem 1.2rem 0 0;
}

.story-facts dd {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 0.86rem;
  line-height: 1.4;
}

.story-body {
  padding: clamp(4rem, 9vw, 8rem) 0;
  background:
    radial-gradient(
      circle at 90% 12%,
      rgba(246, 189, 96, 0.07),
      transparent 28%
    ),
    #0b1114;
}

.journey-preview {
  border: 1px solid rgba(246, 189, 96, 0.22);
  border-radius: 28px;
  padding: clamp(1.5rem, 5vw, 3.5rem);
  background:
    radial-gradient(
      circle at 92% 4%,
      rgba(246, 189, 96, 0.12),
      transparent 32%
    ),
    #11191d;
}

.journey-preview .section-intro {
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.preview-grid article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  padding: 1.5rem 0 0;
}

.preview-number {
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border: 1px solid rgba(246, 189, 96, 0.42);
  border-radius: 50%;
  color: #f8d79f;
  font-size: 0.68rem;
  font-weight: 800;
}

.preview-grid h3 {
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 500;
  line-height: 1.05;
}

.preview-grid p {
  max-width: 520px;
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.82rem !important;
  font-weight: 400;
  line-height: 1.7;
}

.preview-atlas-link {
  display: inline-block;
  margin-top: 2rem;
  border-bottom: 1px solid rgba(246, 189, 96, 0.54);
  color: #f8d79f;
  font-size: 0.74rem;
  font-weight: 800;
  text-decoration: none;
  text-transform: uppercase;
}

.section-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  align-items: end;
  column-gap: 4rem;
  margin-bottom: clamp(2.5rem, 6vw, 5rem);
}

.section-intro .story-eyebrow {
  grid-column: 1;
}

.section-intro h2,
.story-detail-card h2,
.atlas-handoff h2 {
  margin: 0.55rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.7rem, 6vw, 5rem);
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.95;
}

.section-intro > p {
  grid-row: 1 / span 2;
  grid-column: 2;
  margin: 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.88rem !important;
  font-weight: 400;
  line-height: 1.7;
}

.section-intro.compact {
  display: block;
}

.story-day {
  display: grid;
  grid-template-columns: minmax(190px, 0.34fr) minmax(0, 1fr);
  column-gap: clamp(2rem, 7vw, 7rem);
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  padding: clamp(2.5rem, 6vw, 5rem) 0;
}

.day-heading {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.day-heading > span {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  border: 1px solid rgba(246, 189, 96, 0.42);
  border-radius: 50%;
  font-size: 0.72rem;
}

.day-heading p {
  margin: 0;
  color: rgba(255, 255, 255, 0.42);
}

.day-heading h3 {
  margin: 0.35rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 500;
  line-height: 1;
}

.day-summary,
.route-links,
.location-grid {
  grid-column: 2;
}

.day-summary {
  max-width: 760px;
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.94rem !important;
  font-weight: 400;
  line-height: 1.75;
  white-space: pre-line;
}

.route-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.4rem;
}

.route-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  padding: 0.6rem 0.75rem;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.76rem;
  font-weight: 700;
  text-decoration: none;
}

.route-links a > span {
  color: #f6bd60;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.route-links small {
  color: rgba(255, 255, 255, 0.44);
}

.location-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.6rem;
}

.location-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: #11191d;
  transition:
    transform 240ms ease,
    border-color 240ms ease;
}

.location-card:hover,
.location-card:focus-within {
  border-color: rgba(246, 189, 96, 0.42);
  transform: translateY(-3px);
}

.location-card > button {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.location-image {
  position: relative;
  display: block;
  height: 220px;
  overflow: hidden;
}

.location-media-status {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  background: rgba(7, 11, 14, 0.82);
  color: rgba(255, 255, 255, 0.84);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
}

.location-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 500ms ease;
}

.location-card:hover .location-image img {
  transform: scale(1.035);
}

.location-copy {
  display: flex;
  min-height: 205px;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.2rem;
}

.location-copy strong {
  margin-top: 0.4rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.55rem;
  font-weight: 500;
  line-height: 1.08;
}

.location-copy small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.65rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.78rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.location-copy b {
  margin-top: auto;
  padding-top: 1rem;
  color: #f8d79f;
  font-size: 0.72rem;
}

.location-atlas-link {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: 1px solid rgba(246, 189, 96, 0.5);
  border-radius: 999px;
  padding: 0.48rem 0.65rem;
  background: rgba(7, 11, 14, 0.78);
  color: #fff;
  font-size: 0.66rem;
  font-weight: 800;
  text-decoration: none;
  backdrop-filter: blur(10px);
}

.story-support-section,
.story-details-grid,
.atlas-handoff {
  margin-top: clamp(4rem, 10vw, 9rem);
}

.lodging-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.lodging-card {
  display: grid;
  grid-template-columns: minmax(150px, 0.75fr) minmax(0, 1.25fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  background: #11191d;
}

.lodging-card > img,
.lodging-media-placeholder {
  width: 100%;
  height: 100%;
  min-height: 270px;
}

.lodging-card > img {
  object-fit: cover;
}

.lodging-media-placeholder {
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    radial-gradient(
      circle at 70% 20%,
      rgba(246, 189, 96, 0.18),
      transparent 34%
    ),
    linear-gradient(145deg, #18252b, #0b1114);
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}

.lodging-card > div {
  padding: 1.4rem;
}

.lodging-card h3 {
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.65rem;
  font-weight: 500;
  line-height: 1.05;
}

.lodging-card p,
.atlas-handoff p {
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.82rem !important;
  font-weight: 400;
  line-height: 1.65;
}

.lodging-card a {
  display: inline-block;
  margin-top: 0.5rem;
  color: #f8d79f;
  font-size: 0.74rem;
  font-weight: 800;
  text-decoration: none;
}

.story-details-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
  gap: 1rem;
}

.story-detail-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: clamp(1.4rem, 4vw, 2.5rem);
  background: #11191d;
}

.story-detail-card h2 {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
}

.gear-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1.4rem;
}

.gear-list > * {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.55rem 0.7rem;
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
}

.gear-list a {
  border-color: rgba(246, 189, 96, 0.35);
  color: #f8d79f;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.notes-grid h3 {
  margin: 0;
  color: #fff;
  font-size: 0.84rem;
}

.notes-grid ul {
  margin: 0.75rem 0 0;
  padding-left: 1.15rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.76rem;
  line-height: 1.65;
}

.notes-grid li + li {
  margin-top: 0.5rem;
}

.atlas-handoff {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  align-items: end;
  gap: 3rem;
  overflow: hidden;
  border: 1px solid rgba(246, 189, 96, 0.3);
  border-radius: 28px;
  padding: clamp(1.5rem, 5vw, 3.5rem);
  background:
    linear-gradient(120deg, rgba(246, 189, 96, 0.1), transparent 45%), #11191d;
}

.atlas-handoff h2 {
  max-width: 680px;
}

.atlas-handoff p {
  max-width: 610px;
}

.handoff-actions {
  align-items: stretch;
  flex-direction: column;
  margin: 0;
}

.handoff-actions a {
  text-align: center;
}

@media (max-width: 820px) {
  .section-intro,
  .story-day,
  .story-details-grid,
  .atlas-handoff,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .section-intro {
    gap: 1rem;
  }

  .section-intro > p,
  .day-summary,
  .route-links,
  .location-grid {
    grid-row: auto;
    grid-column: 1;
  }

  .story-day {
    gap: 1.5rem;
  }

  .lodging-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .story-hero,
  .story-hero-content {
    min-height: 720px;
  }

  .story-hero-shade {
    background:
      linear-gradient(180deg, rgba(5, 9, 11, 0.2), #0b1114 91%),
      linear-gradient(90deg, rgba(5, 9, 11, 0.55), transparent);
  }

  .story-hero h1 {
    font-size: clamp(3.3rem, 17vw, 5rem);
  }

  .story-facts,
  .location-grid,
  .notes-grid {
    grid-template-columns: 1fr;
  }

  .story-facts {
    gap: 0.65rem;
  }

  .story-facts div {
    display: grid;
    grid-template-columns: 90px 1fr;
    align-items: baseline;
    padding-top: 0.65rem;
  }

  .story-facts dd {
    margin: 0;
  }

  .location-image {
    height: 240px;
  }

  .lodging-card {
    grid-template-columns: 1fr;
  }

  .lodging-card > img,
  .lodging-media-placeholder {
    height: 240px;
    min-height: 0;
  }

  .journey-preview {
    width: min(100% - 1rem, 1180px);
    border-radius: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .location-card,
  .location-image img {
    transition: none;
  }
}
</style>
