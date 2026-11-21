<!-- eslint-disable vue/no-deprecated-v-on-native-modifier -- Vue 2 RouterLink click tracking uses native listeners. -->
<!-- Shared canonical Journey renderer for the public story and Atlas reader. -->
<template>
  <div class="journey-story-body" :class="{ 'is-embedded': embedded }">
    <section
      v-if="trip.hasItinerary"
      id="itinerary"
      class="journey-story-section itinerary-section"
    >
      <header class="journey-section-intro">
        <h2>Inside the journey</h2>
        <p>{{ itineraryIntroduction }}</p>
      </header>

      <article
        v-for="(day, index) in trip.days"
        :id="day.id"
        :key="day.id"
        :data-story-section="day.id"
        class="journey-story-day"
        :aria-labelledby="`${day.id}-title`"
      >
        <header class="journey-day-heading">
          <span>{{ String(index + 1).padStart(2, "0") }}</span>
          <div>
            <p>
              {{
                trip.itineraryMode === "chapters"
                  ? "Story chapter"
                  : "Itinerary chapter"
              }}
            </p>
            <h3 :id="`${day.id}-title`" tabindex="-1">{{ day.label }}</h3>
          </div>
        </header>

        <p class="journey-day-summary">{{ day.summary }}</p>

        <div
          v-if="!embedded && day.partners && day.partners.length"
          class="journey-experience-links"
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

        <div v-if="day.routes && day.routes.length" class="journey-route-links">
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

        <div class="journey-location-grid">
          <article
            v-for="entry in day.locations"
            :key="entry.ref"
            class="journey-location-card"
          >
            <button type="button" @click="openLocation(entry.ref)">
              <span class="journey-location-image">
                <img
                  v-if="getLocation(entry.ref).image"
                  :src="getLocation(entry.ref).image"
                  :alt="getLocation(entry.ref).name"
                  loading="lazy"
                  decoding="async"
                />
                <span
                  v-else
                  class="journey-location-placeholder"
                  aria-hidden="true"
                ></span>
              </span>
              <span class="journey-location-copy">
                <span>{{ getLocation(entry.ref).type || "Trip stop" }}</span>
                <strong>{{ getLocation(entry.ref).name }}</strong>
                <small>{{ getLocationSummary(entry) }}</small>
                <b>Open field notes</b>
              </span>
            </button>
            <button
              v-if="embedded && getLocation(entry.ref).atlasExact"
              class="journey-location-atlas-link"
              type="button"
              @click="$emit('show-stop', getLocation(entry.ref))"
            >
              Show on map
            </button>
            <router-link
              v-else-if="getLocation(entry.ref).atlasExact"
              class="journey-location-atlas-link"
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
      class="journey-story-section journey-experience-section"
    >
      <header class="journey-section-intro compact">
        <h2>Experiences and moments</h2>
      </header>

      <article
        v-for="experience in trip.experiences"
        :id="`experience-${experience.slug}`"
        :key="experience.id"
        :data-story-section="`experience-${experience.slug}`"
        class="journey-experience-story"
      >
        <header>
          <EditorialExperienceCard
            :experience="experience"
            :show-image="!experience.moments.length"
            story
          />
        </header>

        <article
          v-for="moment in experience.moments"
          :key="moment.id"
          class="journey-experience-moment"
        >
          <div class="journey-moment-copy">
            <span v-if="moment.travelDate">{{ moment.travelDate }}</span>
            <h4>{{ moment.title }}</h4>
            <p v-if="moment.notes">{{ moment.notes }}</p>
          </div>
          <div v-if="moment.media.length" class="journey-moment-media">
            <template v-for="media in moment.media">
              <video
                v-if="media.kind === 'video'"
                :key="media.id"
                controls
                playsinline
                :preload="embedded ? 'none' : 'metadata'"
                :poster="media.poster || null"
                :aria-label="media.alt"
              >
                <source
                  :src="media.src"
                  :type="media.mimeType || 'video/mp4'"
                />
                Your browser does not support HTML video.
              </video>
              <button
                v-else-if="embedded"
                :key="media.id"
                type="button"
                :aria-label="`Open ${media.alt}`"
                @click="openMedia(media, $event)"
              >
                <img
                  :src="media.src"
                  :alt="media.alt"
                  :width="media.width || null"
                  :height="media.height || null"
                  loading="lazy"
                  decoding="async"
                />
              </button>
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

    <slot name="between-content"></slot>

    <section
      v-if="trip.allMedia.length"
      id="all-photography"
      class="journey-story-section journey-photography-section"
    >
      <header class="journey-section-intro compact">
        <h2>Photography and video</h2>
        <p>
          Photographs and videos from this journey, grouped with the places and
          field notes that give them context.
        </p>
      </header>

      <div class="journey-photography-grid">
        <div
          v-for="media in trip.allMedia"
          :key="media.id"
          class="journey-photography-item"
        >
          <video
            v-if="media.kind === 'video'"
            controls
            playsinline
            :preload="embedded ? 'none' : 'metadata'"
            :poster="media.poster || null"
            :aria-label="media.alt"
          >
            <source :src="media.src" :type="media.mimeType || 'video/mp4'" />
            Your browser does not support HTML video.
          </video>
          <button
            v-else-if="embedded"
            type="button"
            :aria-label="`Open ${media.alt}`"
            @click="openMedia(media, $event)"
          >
            <img
              :src="media.src"
              :alt="media.alt"
              :width="media.width || null"
              :height="media.height || null"
              loading="lazy"
              decoding="async"
            />
          </button>
          <a v-else :href="media.src" target="_blank" rel="noopener noreferrer">
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
      v-if="showFieldNotes && (trip.tips.length || trip.travelNotes.length)"
      class="journey-story-section journey-field-notes"
    >
      <header class="journey-section-intro compact">
        <h2>Tips and notes</h2>
      </header>
      <div class="journey-notes-grid">
        <div v-if="trip.tips.length">
          <h3>Useful tips</h3>
          <ul>
            <li v-for="tip in trip.tips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
        <div v-if="trip.travelNotes.length">
          <h3>Travel notes</h3>
          <ul>
            <li v-for="note in trip.travelNotes" :key="note">{{ note }}</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import EditorialExperienceCard from "./EditorialExperienceCard.vue"
import commercialLinks from "@/content/commercial-links.js"
import { trackAnalyticsEvent, trackAtlasOpen } from "@/utils/analytics.mjs"

export default {
  name: "JourneyStoryBody",
  components: { EditorialExperienceCard },
  props: {
    trip: {
      type: Object,
      required: true,
    },
    embedded: Boolean,
    showFieldNotes: Boolean,
  },
  emits: ["open-location", "open-media", "show-stop"],
  computed: {
    itineraryIntroduction() {
      return this.trip.itineraryMode === "chapters"
        ? "These chapters follow the trip by experience, giving each place room for its own story. Open a place for field notes or view its Atlas pin."
        : "Open a place for photographs and field notes, or view its Atlas pin when that stop has a mapped presentation."
    },
  },
  methods: {
    scrollToStorySection(sectionId, options = {}) {
      if (!sectionId) return false
      const section = Array.from(
        this.$el.querySelectorAll("[data-story-section]")
      ).find(element => element.dataset.storySection === sectionId)
      if (!section) return false

      section.scrollIntoView({ block: "start" })
      if (options.focus) {
        section.querySelector("h3")?.focus({ preventScroll: true })
      }
      return true
    },
    getLocation(ref) {
      return this.trip.locations.find(location => location.id === ref) || {}
    },
    getLocationSummary(entry) {
      return entry.notes || this.getLocation(entry.ref).description || ""
    },
    openLocation(ref) {
      this.$emit("open-location", this.getLocation(ref))
    },
    openMedia(media, event) {
      this.$emit("open-media", media, event.currentTarget)
    },
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
      const parameters = commercialLinks.buildPartnerClickParameters({
        linkType: partner.linkType,
        partnerId: partner.id,
        placement: "trip_itinerary_partner",
        publicJourneyId: this.trip.journeyId,
      })
      if (parameters) trackAnalyticsEvent("partner_click", parameters)
    },
  },
}
</script>

<style scoped>
.journey-story-body {
  color: var(--color-text, #fff);
}

.journey-story-section {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
}

.journey-story-section + .journey-story-section {
  padding-top: clamp(4rem, 8vw, 7rem);
}

.journey-section-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  align-items: end;
  gap: 4rem;
  margin-bottom: clamp(2.5rem, 6vw, 5rem);
}

.journey-section-intro.compact {
  display: block;
}

.journey-section-intro h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.7rem, 6vw, 5rem);
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.95;
}

.journey-section-intro > p {
  margin: 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  font-size: max(1rem, 16px);
  line-height: 1.7;
}

.journey-section-intro:not(.compact) > p {
  grid-column: 2;
}

.journey-section-intro.compact > p {
  max-width: 720px;
  margin-top: 1rem;
}

.journey-story-day {
  display: grid;
  grid-template-columns: minmax(190px, 0.34fr) minmax(0, 1fr);
  column-gap: clamp(2rem, 7vw, 7rem);
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.13);
  padding: clamp(2.5rem, 6vw, 5rem) 0;
}

.journey-story-day > * {
  min-width: 0;
}

.journey-day-heading {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.journey-day-heading > span {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.42);
  border-radius: 50%;
  color: var(--color-accent-soft, #f6bd60);
  font-size: max(0.875rem, 14px);
  font-weight: 800;
}

.journey-day-heading p,
.journey-location-copy > span,
.journey-moment-copy > span,
.journey-experience-links span,
.journey-route-links span {
  margin: 0;
  color: var(--color-accent-soft, #f6bd60);
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.journey-day-heading h3,
.journey-experience-story h3,
.journey-moment-copy h4 {
  margin: 0.35rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 500;
  line-height: 1.05;
}

.journey-day-heading h3 {
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.journey-day-summary,
.journey-experience-links,
.journey-route-links,
.journey-location-grid {
  grid-column: 2;
}

.journey-day-summary {
  margin: 0 0 1.3rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.72));
  font-size: max(1rem, 16px);
  line-height: 1.75;
  white-space: pre-line;
}

.journey-experience-links,
.journey-route-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1.2rem;
}

.journey-experience-links a,
.journey-route-links a {
  display: grid;
  min-height: 3rem;
  align-content: center;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.3);
  border-radius: 14px;
  padding: 0.7rem 0.85rem;
  color: var(--color-text, #fff);
  font-size: max(0.875rem, 14px);
  text-decoration: none;
}

.journey-experience-links strong,
.journey-experience-links small,
.journey-route-links small {
  display: block;
}

.journey-experience-links small,
.journey-route-links small {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.58));
}

.journey-location-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.journey-location-card {
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  border-radius: 20px;
  background: var(--color-surface, #11191d);
}

.journey-location-card > button:first-child {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-text, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.journey-location-image {
  display: block;
  height: 220px;
  overflow: hidden;
  background: var(--color-surface-raised, #17242a);
}

.journey-location-image img,
.journey-location-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.journey-location-image img {
  object-fit: cover;
}

.journey-location-placeholder {
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.18),
      transparent 38%
    ),
    var(--color-surface-raised, #142128);
}

.journey-location-copy {
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
}

.journey-location-copy strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.55rem;
  font-weight: 500;
}

.journey-location-copy small {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.66));
  font-size: max(1rem, 16px);
  line-height: 1.6;
}

.journey-location-copy b {
  color: var(--color-accent-soft, #f8d79f);
  font-size: max(0.875rem, 14px);
}

.journey-location-atlas-link {
  display: flex;
  width: 100%;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  padding: 0.7rem;
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.08);
  color: var(--color-accent-soft, #f8d79f);
  font: inherit;
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.journey-experience-story {
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.13);
  padding: clamp(2.5rem, 6vw, 5rem) 0;
}

.journey-experience-story > header {
  max-width: 760px;
}

.journey-experience-story h3 {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  letter-spacing: -0.045em;
}

.journey-experience-story > header p,
.journey-moment-copy p {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  font-size: max(1rem, 16px);
  line-height: 1.75;
  white-space: pre-line;
}

.journey-experience-moment {
  display: grid;
  grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1.35fr);
  gap: clamp(1.5rem, 5vw, 4rem);
  margin-top: 2rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  border-radius: 22px;
  padding: clamp(1.2rem, 4vw, 2rem);
  background: var(--color-surface, #11191d);
}

.journey-moment-copy h4 {
  font-size: clamp(1.5rem, 3vw, 2.4rem);
}

.journey-moment-media,
.journey-photography-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.journey-photography-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.journey-moment-media > a,
.journey-moment-media > button,
.journey-moment-media > video,
.journey-photography-item,
.journey-photography-item > a,
.journey-photography-item > button {
  display: block;
  overflow: hidden;
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 0;
  background: var(--color-surface, #111b20);
  aspect-ratio: 4 / 3;
}

.journey-moment-media > button,
.journey-photography-item > button {
  cursor: zoom-in;
}

.journey-moment-media img,
.journey-moment-media video,
.journey-photography-grid img,
.journey-photography-grid video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.journey-notes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  border-radius: 22px;
  padding: 1.25rem;
  background: var(--color-surface, #11191d);
}

.journey-notes-grid h3 {
  margin: 0;
  font-size: 1.1rem;
}

.journey-notes-grid ul {
  margin: 0.8rem 0 0;
  padding-left: 1.2rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.7));
  font-size: max(1rem, 16px);
  line-height: 1.7;
}

.journey-story-body.is-embedded .journey-story-section {
  width: 100%;
}

.journey-story-body.is-embedded
  .journey-story-section
  + .journey-story-section {
  padding-top: 4rem;
}

.journey-story-body.is-embedded .journey-section-intro {
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.journey-story-body.is-embedded .journey-section-intro > p {
  grid-column: 1;
}

.journey-story-body.is-embedded .journey-story-day,
.journey-story-body.is-embedded .journey-experience-moment {
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.journey-story-body.is-embedded .journey-day-summary,
.journey-story-body.is-embedded .journey-experience-links,
.journey-story-body.is-embedded .journey-route-links,
.journey-story-body.is-embedded .journey-location-grid {
  grid-column: 1;
}

.journey-story-body.is-embedded .journey-location-grid,
.journey-story-body.is-embedded .journey-photography-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-focus, #f6bd60);
  outline-offset: 3px;
}

@media (max-width: 820px) {
  .journey-section-intro,
  .journey-story-day,
  .journey-experience-moment {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .journey-section-intro > p,
  .journey-day-summary,
  .journey-experience-links,
  .journey-route-links,
  .journey-location-grid {
    grid-column: 1;
  }
}

@media (max-width: 620px) {
  .journey-story-section {
    width: 100%;
  }

  .journey-location-grid,
  .journey-photography-grid,
  .journey-notes-grid,
  .journey-moment-media,
  .journey-story-body.is-embedded .journey-location-grid,
  .journey-story-body.is-embedded .journey-photography-grid {
    grid-template-columns: 1fr;
  }

  .journey-location-image {
    height: 240px;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
  }
}
</style>
