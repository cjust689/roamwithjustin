<!-- eslint-disable vue/no-deprecated-v-on-native-modifier -- Vue 2 RouterLink click tracking uses native listeners. -->
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
          <h1 :id="`story-title-${trip.id}`">{{ trip.name }}</h1>
          <p class="story-date">{{ trip.dates }}</p>
          <p v-if="trip.description">{{ trip.description }}</p>
          <div class="story-hero-actions">
            <router-link
              v-if="trip.atlasHref"
              :to="trip.atlasHref"
              @click.native="trackAtlasEntry"
            >
              Explore this trip in Atlas
            </router-link>
            <a v-if="trip.hasItinerary" href="#itinerary">
              {{
                trip.itineraryMode === "chapters"
                  ? "Read the chapters"
                  : "Read the itinerary"
              }}
            </a>
          </div>
        </div>

        <dl v-if="!trip.comingSoon" class="story-facts">
          <div v-if="trip.duration">
            <dt>Duration</dt>
            <dd>{{ trip.duration }}</dd>
          </div>
          <div v-if="trip.bestTimeToGo">
            <dt>Best time</dt>
            <dd>{{ trip.bestTimeToGo }}</dd>
          </div>
          <div v-if="trip.who">
            <dt>Made for</dt>
            <dd>{{ trip.who }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <div class="story-body">
      <section
        v-if="
          trip.comingSoon && trip.locations.length > 1 && !trip.hasItinerary
        "
        id="journey-preview"
        class="story-shell journey-preview"
      >
        <h2>Explore {{ trip.name }} by place.</h2>

        <div
          v-if="trip.locations.length"
          class="preview-destinations"
          :aria-label="`${trip.name} destinations`"
        >
          <article v-for="location in trip.locations" :key="location.visitId">
            <span>{{ location.type || "Destination" }}</span>
            <h3>{{ location.name }}</h3>
            <p v-if="location.description">{{ location.description }}</p>
          </article>
        </div>
      </section>

      <section
        v-if="trip.hasItinerary"
        id="itinerary"
        class="story-shell itinerary-section"
      >
        <header class="section-intro">
          <h2>Inside the journey</h2>
          <p>
            {{ itineraryIntroduction }}
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
              <p>
                {{
                  trip.itineraryMode === "chapters"
                    ? "Story chapter"
                    : "Itinerary chapter"
                }}
              </p>
              <h3>{{ day.label }}</h3>
            </div>
          </header>

          <p class="day-summary">{{ day.summary }}</p>

          <div
            v-if="day.partners && day.partners.length"
            class="experience-links"
          >
            <a
              v-for="partner in day.partners"
              :key="partner.id"
              :href="partner.href"
              target="_blank"
              rel="noopener noreferrer"
              @click="trackPartnerClick(partner)"
            >
              <span>{{ partner.label || "Trip resource" }}</span>
              <strong>{{ partner.name }}</strong>
              <small>{{ partner.disclosure }}</small>
            </a>
          </div>

          <div v-if="day.routes && day.routes.length" class="route-links">
            <a
              v-for="route in day.routes"
              :key="route.link"
              :href="route.link"
              target="_blank"
              rel="noopener noreferrer"
              @click="trackMapsHandoff"
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
                    v-if="getLocation(entry.ref).image"
                    :src="getLocation(entry.ref).image"
                    :alt="getLocation(entry.ref).name"
                    loading="lazy"
                  />
                  <span
                    v-else
                    class="location-image-placeholder"
                    aria-hidden="true"
                  ></span>
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
                @click.native="trackAtlasEntry"
              >
                View this stop in Atlas
              </router-link>
            </article>
          </div>
        </article>
      </section>

      <section
        v-if="trip.experiences.length"
        id="experiences"
        class="story-shell experience-section"
      >
        <header class="section-intro compact">
          <h2>Experiences and moments</h2>
        </header>

        <article
          v-for="experience in trip.experiences"
          :id="`experience-${experience.slug}`"
          :key="experience.id"
          class="experience-story"
        >
          <header>
            <h3>{{ experience.title }}</h3>
            <p v-if="experience.summary">{{ experience.summary }}</p>
          </header>

          <article
            v-for="moment in experience.moments"
            :key="moment.id"
            class="experience-moment"
          >
            <div class="moment-copy">
              <span v-if="moment.travelDate">{{ moment.travelDate }}</span>
              <h4>{{ moment.title }}</h4>
              <p v-if="moment.notes">{{ moment.notes }}</p>
            </div>
            <div v-if="moment.media.length" class="moment-media">
              <template v-for="media in moment.media">
                <video
                  v-if="media.kind === 'video'"
                  :key="media.id"
                  controls
                  playsinline
                  preload="metadata"
                  :poster="media.poster || null"
                  :aria-label="media.alt"
                >
                  <source
                    :src="media.src"
                    :type="media.mimeType || 'video/mp4'"
                  />
                  Your browser does not support HTML video.
                </video>
                <a
                  v-else
                  :key="media.id"
                  :href="media.src"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    :src="media.src"
                    :alt="media.alt"
                    :width="media.width || null"
                    :height="media.height || null"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </template>
            </div>
          </article>
        </article>
      </section>

      <AdSlot
        v-if="storyAdEligible"
        :slot-id="storyAdSlotId"
        placement="travel-story-inline-1"
      />

      <section
        v-if="trip.allMedia.length"
        id="all-photography"
        class="story-shell photography-section"
      >
        <header class="section-intro compact">
          <div>
            <h2>Photography and video</h2>
          </div>
          <p>
            Photographs and videos from this journey, grouped with the places
            and field notes that give them context.
          </p>
        </header>

        <div class="photography-grid">
          <div
            v-for="media in trip.allMedia"
            :key="media.id"
            class="photography-item"
          >
            <video
              v-if="media.kind === 'video'"
              controls
              playsinline
              preload="metadata"
              :poster="media.poster || null"
              :aria-label="media.alt"
            >
              <source :src="media.src" :type="media.mimeType || 'video/mp4'" />
              Your browser does not support HTML video.
            </video>
            <a
              v-else
              :href="media.src"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="media.src"
                :alt="media.alt"
                :width="media.width || null"
                :height="media.height || null"
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
        </div>
      </section>

      <section
        v-if="trip.lodging.length"
        class="story-shell story-support-section"
      >
        <header class="section-intro compact">
          <h2>Where we stayed</h2>
        </header>
        <div class="lodging-grid">
          <article
            v-for="stay in trip.lodging"
            :key="stay.id"
            class="lodging-card"
          >
            <img
              v-if="stay.image"
              :src="stay.image"
              :alt="stay.name"
              loading="lazy"
            />
            <div
              v-else
              class="lodging-media-placeholder"
              aria-hidden="true"
            ></div>
            <div>
              <span>{{ stay.location }}</span>
              <h3>{{ stay.name }}</h3>
              <p>{{ stay.blurb }}</p>
              <a
                v-if="stay.link"
                :href="stay.link"
                target="_blank"
                rel="noopener noreferrer"
                :title="stay.disclosure || null"
                @click="trackLodgingClick(stay)"
              >
                View stay &nearr;
              </a>
            </div>
          </article>
        </div>
      </section>

      <TravelPlanningOffers
        v-if="trip.commercialOffers.length"
        class="story-shell"
        :journey-id="trip.journeyId"
        :offers="trip.commercialOffers"
      />

      <section v-if="trip.hasFieldNotes" class="story-shell story-details-grid">
        <article v-if="trip.gearHighlights.length" class="story-detail-card">
          <h2>Gear highlights</h2>
          <div class="gear-list">
            <a
              v-for="item in gearWithLinks"
              :key="item.name"
              :href="item.link"
              target="_blank"
              :rel="item.rel || 'noopener noreferrer'"
              :title="item.disclosure || null"
            >
              {{ item.name }} <span>&nearr;</span>
            </a>
            <span v-for="item in gearWithoutLinks" :key="item.name">
              {{ item.name }}
            </span>
          </div>
          <p v-if="hasAffiliateGear" class="gear-disclosure">
            Some gear links are affiliate links. They may support Roam With
            Justin at no additional cost to you.
          </p>
        </article>

        <article
          v-if="trip.tips.length || trip.travelNotes.length"
          class="story-detail-card"
        >
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

      <section
        v-if="trip.atlasHref && !trip.comingSoon"
        class="story-shell atlas-handoff"
      >
        <div>
          <h2>See how the story moves across the map.</h2>
          <p>
            Continue geographically through the same canonical stops, route,
            photographs, and guided journey.
          </p>
        </div>
        <div class="handoff-actions">
          <router-link
            v-if="trip.atlasHref"
            :to="trip.atlasHref"
            @click.native="trackAtlasEntry"
          >
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
import { adSenseConfig } from "@/config/adsense.mjs"
import AdSlot from "@/components/AdSlot.vue"
import HeroCarousel from "@/components/HeroCarousel.vue"
import LocationModal from "@/components/LocationModal.vue"
import TravelPlanningOffers from "@/components/TravelPlanningOffers.vue"
import { trackAnalyticsEvent, trackAtlasOpen } from "@/utils/analytics.mjs"

export default {
  name: "TripOverview",
  components: {
    AdSlot,
    HeroCarousel,
    LocationModal,
    TravelPlanningOffers,
  },
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
      previousTitle: "",
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
    hasAffiliateGear() {
      return this.trip?.gearHighlights.some(item => item.affiliate) || false
    },
    storyAdEligible() {
      return Boolean(
        adSenseConfig.ready &&
          this.trip &&
          !this.trip.comingSoon &&
          this.trip.days.length >= 3
      )
    },
    storyAdSlotId() {
      return adSenseConfig.storySlotId
    },
    itineraryIntroduction() {
      return this.trip?.itineraryMode === "chapters"
        ? "These chapters follow the trip by experience, giving each place room for its own story. Open a place for field notes or jump to its Atlas pin."
        : "Open a place for photographs and field notes, or jump directly to its Atlas pin when that stop has a mapped presentation."
    },
  },
  watch: {
    id() {
      this.updateDocumentTitle()
    },
  },
  mounted() {
    this.previousTitle = document.title
    this.updateDocumentTitle()
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    document.title = this.previousTitle
  },
  methods: {
    trackAtlasEntry() {
      trackAtlasOpen({ entrySurface: "trip_story" })
    },
    trackMapsHandoff() {
      trackAnalyticsEvent("maps_handoff_clicked", {
        content_type: "journey",
        surface: "itinerary_route",
      })
    },
    trackPartnerClick(partner) {
      trackAnalyticsEvent("partner_click", {
        link_type: partner.linkType,
        partner_id: partner.id,
        placement: "trip_itinerary_partner",
        public_journey_id: this.trip.journeyId,
      })
    },
    trackLodgingClick(stay) {
      trackAnalyticsEvent("partner_click", {
        link_type: stay.linkType,
        partner_id: stay.id,
        placement: "trip_lodging",
        public_journey_id: this.trip.journeyId,
      })
    },
    updateDocumentTitle() {
      if (this.trip?.name) {
        document.title = `${this.trip.name} | Roam With Justin`
      }
    },
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

.photography-section {
  padding-top: clamp(4rem, 8vw, 7rem);
}

.experience-section {
  padding-top: clamp(4rem, 8vw, 7rem);
}

.experience-story {
  scroll-margin-top: 6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  padding: clamp(2.5rem, 6vw, 5rem) 0;
}

.experience-story > header {
  max-width: 760px;
}

.experience-story > header h3 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 1;
}

.experience-story > header p,
.moment-copy p {
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.9rem !important;
  font-weight: 400;
  line-height: 1.75;
  white-space: pre-line;
}

.experience-moment {
  display: grid;
  grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1.35fr);
  gap: clamp(1.5rem, 5vw, 4rem);
  margin-top: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  padding: clamp(1.2rem, 4vw, 2rem);
  background: #11191d;
}

.moment-copy > span {
  color: #f6bd60;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.moment-copy h4 {
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.5rem, 3vw, 2.4rem);
  font-weight: 500;
  line-height: 1.05;
}

.moment-media {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.moment-media > a,
.moment-media > video {
  display: block;
  overflow: hidden;
  width: 100%;
  border-radius: 14px;
  background: #0b1114;
  aspect-ratio: 4 / 3;
}

.moment-media img,
.moment-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photography-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.photography-item,
.photography-grid a {
  display: block;
  overflow: hidden;
  border-radius: 1rem;
  background: #111b20;
  aspect-ratio: 4 / 3;
}

.photography-grid img,
.photography-grid video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photography-grid img {
  transition: transform 220ms ease;
}

.photography-grid a:hover img,
.photography-grid a:focus-visible img {
  transform: scale(1.025);
}

@media (max-width: 760px) {
  .photography-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  width: 100%;
  min-width: 0;
  max-width: 820px;
  text-shadow: 0 8px 40px rgba(0, 0, 0, 0.38);
}

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
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3.6rem, 9vw, 8.5rem);
  font-weight: 500;
  letter-spacing: -0.065em;
  line-height: 0.88;
}

.story-hero-copy > .story-date {
  margin-top: 0.85rem;
  color: #f6bd60;
  font-size: 0.86rem !important;
  font-weight: 700;
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

.journey-preview h2 {
  max-width: 780px;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.2rem, 6vw, 4.5rem);
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.98;
}

.preview-destinations {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: clamp(2rem, 5vw, 3.5rem);
}

.preview-destinations article {
  min-width: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  padding: 1rem 0.2rem 0;
}

.preview-destinations span {
  color: #f6bd60;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.preview-destinations h3 {
  margin: 0.35rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.3rem, 2.5vw, 1.9rem);
  font-weight: 500;
  line-height: 1.05;
}

.preview-destinations p {
  margin: 0.65rem 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.78rem !important;
  font-weight: 400;
  line-height: 1.6;
}

.section-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  align-items: end;
  column-gap: 4rem;
  margin-bottom: clamp(2.5rem, 6vw, 5rem);
}

.section-intro h2,
.story-detail-card h2,
.atlas-handoff h2 {
  margin: 0;
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

.story-day > * {
  min-width: 0;
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
.experience-links,
.route-links,
.location-grid {
  grid-column: 2;
}

.experience-links {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1.4rem;
}

.experience-links a {
  display: grid;
  min-width: 0;
  flex: 0 1 520px;
  gap: 0.22rem;
  width: 100%;
  max-width: 520px;
  border: 1px solid rgba(246, 189, 96, 0.28);
  border-radius: 16px;
  padding: 0.8rem 0.95rem;
  background: rgba(246, 189, 96, 0.05);
  color: #fff;
  text-decoration: none;
}

.experience-links span {
  color: #f6bd60;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.experience-links strong {
  font-size: 0.85rem;
}

.experience-links small {
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.66rem;
  line-height: 1.45;
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
  background:
    radial-gradient(
      circle at 28% 22%,
      rgba(246, 189, 96, 0.18),
      transparent 35%
    ),
    linear-gradient(145deg, #15242a, #091014);
}

.location-image-placeholder {
  display: block;
  width: 100%;
  height: 100%;
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

.gear-disclosure {
  margin: 1rem 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.72rem;
  line-height: 1.55;
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
  .experience-moment {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  .section-intro > p,
  .day-summary,
  .experience-links,
  .route-links,
  .location-grid {
    grid-row: auto;
    grid-column: 1;
  }

  .story-day {
    gap: 1.5rem;
  }

  .experience-links {
    width: 100%;
  }

  .experience-links a {
    max-width: none;
  }

  .lodging-grid {
    grid-template-columns: 1fr;
  }

  .preview-destinations {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    overflow-wrap: anywhere;
    font-size: clamp(3rem, 15vw, 5rem);
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

  .moment-media {
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

  .preview-destinations {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .location-card,
  .location-image img {
    transition: none;
  }
}
</style>
