<template>
  <main class="my-atlas-public">
    <MyAtlasMap
      :places="displayedPlaces"
      :selected-place-id="selectedPlaceId"
      :show-memories="showMemories"
      :playback-active="timelinePlaying"
      @select="selectPlace"
    />

    <section class="my-atlas-public-panel" aria-labelledby="public-atlas-title">
      <header>
        <a href="/" aria-label="Roam With Justin home"><BrandMark /></a>
        <router-link to="/my-atlas/explore">Explore Atlases</router-link>
        <ThemeSelector />
      </header>

      <div v-if="loading" class="my-atlas-public-state" role="status">
        Loading this Atlas
      </div>
      <div v-else-if="error" class="my-atlas-public-state" role="alert">
        <h1 id="public-atlas-title">Atlas unavailable</h1>
        <p>This Atlas is not available to view.</p>
      </div>
      <template v-else>
        <div
          class="my-atlas-public-profile"
          :class="{ 'has-favorite-image': favoriteImageUrl }"
        >
          <img
            v-if="favoriteImageUrl"
            ref="favoriteImagePreview"
            class="my-atlas-public-favorite-image"
            :src="favoriteImageUrl"
            :alt="`${atlas.displayName}'s favorite travel image`"
          />
          <div class="my-atlas-public-intro">
            <p>@{{ atlas.handle }}</p>
            <h1 id="public-atlas-title">{{ atlas.displayName }}</h1>
            <span>{{ places.length }} {{ placeCountLabel }}</span>
            <button
              v-if="favoriteImageUrl"
              type="button"
              class="my-atlas-public-favorite-action"
              @click="openFavoriteImage"
            >
              <strong>Favorite travel image</strong>
              <span
                v-if="atlas.favoriteImage.location"
                class="my-atlas-public-favorite-location"
                >{{ atlas.favoriteImage.location }}</span
              >
              <span>View full image</span>
            </button>
          </div>
        </div>
        <p v-if="instagramUrl" class="my-atlas-public-instagram">
          <a
            :href="instagramUrl"
            target="_blank"
            rel="noopener noreferrer"
            referrerpolicy="no-referrer"
          >
            Instagram @{{ atlas.instagramHandle }}
          </a>
        </p>
        <p
          v-if="favoriteImageError"
          class="my-atlas-public-image-error"
          role="status"
        >
          The favorite travel image is temporarily unavailable.
        </p>

        <dialog
          v-if="favoriteImageUrl"
          ref="favoriteImageDialog"
          class="my-atlas-public-image-dialog"
        >
          <div>
            <button type="button" autofocus @click="closeFavoriteImage">
              Close
            </button>
            <img
              :src="favoriteImageUrl"
              :alt="`${atlas.displayName}'s favorite travel image`"
            />
            <p>
              Favorite travel image chosen by {{ atlas.displayName
              }}<template v-if="atlas.favoriteImage.location">
                · {{ atlas.favoriteImage.location }}</template
              >
            </p>
          </div>
        </dialog>

        <div class="my-atlas-public-stats" aria-label="Atlas statistics">
          <div>
            <strong>{{ visibleStats.places }}</strong
            ><span>Places</span>
          </div>
          <div>
            <strong>{{ visibleStats.countries }}</strong
            ><span>Countries</span>
          </div>
          <div>
            <strong>{{ visibleStats.continents }}</strong
            ><span>Continents</span>
          </div>
          <div>
            <strong>{{ visibleStats.spots || visibleStats.capitals }}</strong
            ><span>{{ visibleStats.spots ? "Spots" : "Capitals" }}</span>
          </div>
        </div>

        <button
          type="button"
          class="my-atlas-public-mobile-controls-toggle"
          :aria-expanded="String(mobileControlsOpen)"
          aria-controls="my-atlas-public-map-controls"
          @click="mobileControlsOpen = !mobileControlsOpen"
        >
          <span>Map controls</span>
          <strong>{{ mobileControlsOpen ? "Hide" : "Show" }}</strong>
        </button>
        <div
          id="my-atlas-public-map-controls"
          class="my-atlas-public-controls-drawer"
          :class="{ 'is-open': mobileControlsOpen }"
        >
          <div class="my-atlas-public-controls">
            <label>
              <span>Show</span>
              <select v-model="yearFilter" @change="resetTimeline">
                <option value="all">Every destination</option>
                <option v-for="year in years" :key="year" :value="String(year)">
                  {{ year }}
                </option>
                <option v-if="stats.undated" value="undated">Date open</option>
              </select>
            </label>
            <button
              type="button"
              :disabled="!years.length"
              @click="toggleTimeline"
            >
              {{ timelineButtonLabel }}
            </button>
            <button
              type="button"
              :disabled="storyExportPending"
              @click="exportStory"
            >
              {{ storyExportPending ? "Creating image" : "Story image" }}
            </button>
            <button
              type="button"
              :aria-pressed="String(showMemories)"
              :disabled="!visibleMemoryCount"
              @click="showMemories = !showMemories"
            >
              {{ showMemories ? "Hide memories" : "Show all memories" }}
            </button>
          </div>

          <div v-if="timelineEntry" class="my-atlas-public-timeline">
            <strong>{{ timelineEntry.place.name }}</strong>
            <span>
              {{ timelineEntry.year }} · {{ timelineIndex + 1 }} of
              {{ timelineSequence.length }}
            </span>
          </div>
          <p class="my-atlas-public-route-note">
            Playback follows visit years. Hops within a year are a visual
            sequence, not a recorded travel route.
          </p>
          <p
            v-if="storyExportStatus"
            class="my-atlas-public-export-status"
            role="status"
          >
            {{ storyExportStatus }}
          </p>
        </div>

        <div v-if="selectedPlace" class="my-atlas-public-selected">
          <button type="button" @click="cyclePlace(-1)">Previous</button>
          <div>
            <strong>{{ selectedPlace.name }}</strong>
            <span>{{ placeLabel(selectedPlace) }}</span>
            <small>{{ formatVisitedDates(selectedPlace) }}</small>
          </div>
          <button type="button" @click="cyclePlace(1)">Next</button>
          <blockquote v-if="selectedPlace.memory">
            {{ selectedPlace.memory }}
          </blockquote>
        </div>

        <ul class="my-atlas-public-places">
          <li v-for="place in displayedPlaces" :key="place.placeId">
            <button type="button" @click="selectPlace(place.placeId)">
              <strong>{{ place.name }}</strong>
              <span>{{ placeLabel(place) }}</span>
              <small>{{ formatVisitedDates(place) }}</small>
              <q v-if="place.memory">{{ place.memory }}</q>
            </button>
          </li>
        </ul>

        <p class="my-atlas-public-brand">My Atlas by RoamWithJustin.com</p>

        <p class="my-atlas-public-attribution">
          Place data
          <a
            v-if="attribution.url"
            :href="attribution.url"
            target="_blank"
            rel="noopener"
          >
            {{ attribution.provider }}
          </a>
          <span v-else>{{ attribution.provider }}</span>
          under {{ attribution.license }}. Custom pins are supplied by the Atlas
          owner. Map rendering uses MapTiler SDK JS with session-based map
          usage.
        </p>
      </template>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import { instagramProfileUrl } from "../../../../shared/my-atlas-instagram.mjs"
import { fetchPublicAtlas, fetchPublicAtlasImage } from "../api/client.mjs"
import {
  atlasTimelineSequence,
  atlasStats,
  atlasYears,
  formatVisitedDates,
  placesForYear,
  placesThroughTimelineStep,
} from "../catalog/atlasInsights.mjs"
import { formatPlaceLabel } from "../catalog/search.mjs"
import { getMyAtlasApiBaseUrl } from "../config/api.mjs"
import placeCatalog from "../data/place-catalog.proof.json"
import { downloadMyAtlasStory } from "../export/storyExport.mjs"

export default {
  name: "MyAtlasPublicView",
  components: { MyAtlasMap },
  props: {
    handle: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      error: "",
      atlas: null,
      selectedPlaceId: "",
      timelinePlaying: false,
      timelineTimer: null,
      timelineIndex: -1,
      yearFilter: "all",
      showMemories: false,
      mobileControlsOpen: false,
      apiBaseUrl: "",
      favoriteImageUrl: "",
      favoriteImageError: "",
      storyExportPending: false,
      storyExportStatus: "",
      previousTitle: "",
      robotsMeta: null,
      previousRobotsContent: null,
      createdRobotsMeta: false,
    }
  },
  computed: {
    instagramUrl() {
      return instagramProfileUrl(this.atlas?.instagramHandle)
    },
    places() {
      return (this.atlas?.places || []).map(place => {
        const country = place.countryCode
          ? placeCatalog.records.find(
              record => record.placeId === `iso-country:${place.countryCode}`
            )
          : null
        return {
          ...place,
          continent: place.continent || country?.continent,
        }
      })
    },
    attribution() {
      return this.atlas?.catalog?.attribution || {}
    },
    placeCountLabel() {
      return this.places.length === 1 ? "place" : "places"
    },
    displayedPlaces() {
      return this.timelineIndex >= 0
        ? placesThroughTimelineStep(this.timelineSequence, this.timelineIndex)
        : placesForYear(this.places, this.yearFilter)
    },
    filterLabel() {
      if (this.timelineEntry) {
        return `Timeline through ${this.timelineEntry.place.name}, ${this.timelineEntry.year}`
      }
      if (this.yearFilter === "all") return "All destinations"
      if (this.yearFilter === "undated") return "Destinations with open dates"
      return `Destinations from ${this.yearFilter}`
    },
    selectedPlace() {
      return (
        this.displayedPlaces.find(
          place => place.placeId === this.selectedPlaceId
        ) || this.displayedPlaces[0]
      )
    },
    stats() {
      return atlasStats(this.places)
    },
    visibleStats() {
      return atlasStats(this.displayedPlaces)
    },
    visibleMemoryCount() {
      return this.displayedPlaces.filter(place => Boolean(place.memory)).length
    },
    years() {
      return atlasYears(this.places)
    },
    timelineSequence() {
      return atlasTimelineSequence(this.places)
    },
    timelineEntry() {
      return this.timelineSequence[this.timelineIndex] || null
    },
    timelineButtonLabel() {
      if (this.timelinePlaying) return "Pause timeline"
      if (
        this.timelineIndex >= 0 &&
        this.timelineIndex < this.timelineSequence.length - 1
      ) {
        return "Resume timeline"
      }
      if (
        this.timelineSequence.length &&
        this.timelineIndex === this.timelineSequence.length - 1
      ) {
        return "Replay timeline"
      }
      return "Play timeline"
    },
  },
  created() {
    this.previousTitle = document.title
    this.robotsMeta = document.querySelector('meta[name="robots"]')
    if (!this.robotsMeta) {
      this.robotsMeta = document.createElement("meta")
      this.robotsMeta.setAttribute("name", "robots")
      document.head.appendChild(this.robotsMeta)
      this.createdRobotsMeta = true
    } else {
      this.previousRobotsContent = this.robotsMeta.getAttribute("content")
    }
    this.robotsMeta.setAttribute("content", "noindex, nofollow")
    this.loadAtlas()
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.clearTimeout(this.timelineTimer)
    if (this.favoriteImageUrl) URL.revokeObjectURL(this.favoriteImageUrl)
    document.title = this.previousTitle
    if (this.createdRobotsMeta) this.robotsMeta?.remove()
    else if (this.previousRobotsContent === null) {
      this.robotsMeta?.removeAttribute("content")
    } else {
      this.robotsMeta?.setAttribute("content", this.previousRobotsContent)
    }
  },
  methods: {
    async loadAtlas() {
      try {
        this.apiBaseUrl = getMyAtlasApiBaseUrl(
          process.env,
          window.location.origin
        )
        this.atlas = await fetchPublicAtlas({
          apiBaseUrl: this.apiBaseUrl,
          handle: this.handle,
        })
        if (this.atlas.favoriteImage) await this.loadFavoriteImage()
        document.title = `${this.atlas.displayName} | My Atlas`
      } catch (error) {
        this.error = "atlas_unavailable"
        document.title = "Atlas unavailable | Roam With Justin"
      } finally {
        this.loading = false
      }
    },
    async loadFavoriteImage() {
      try {
        const blob = await fetchPublicAtlasImage({
          apiBaseUrl: this.apiBaseUrl,
          handle: this.handle,
        })
        if (this.favoriteImageUrl) URL.revokeObjectURL(this.favoriteImageUrl)
        this.favoriteImageUrl = URL.createObjectURL(blob)
        this.favoriteImageError = ""
      } catch {
        this.favoriteImageError = "favorite_image_unavailable"
      }
    },
    openFavoriteImage() {
      this.$refs.favoriteImageDialog?.showModal()
    },
    closeFavoriteImage() {
      this.$refs.favoriteImageDialog?.close()
    },
    selectPlace(placeId) {
      if (this.timelinePlaying) this.pauseTimeline()
      this.selectedPlaceId = placeId
    },
    cyclePlace(direction) {
      if (!this.displayedPlaces.length) return
      if (this.timelinePlaying) this.pauseTimeline()
      const currentIndex = this.displayedPlaces.findIndex(
        place => place.placeId === this.selectedPlaceId
      )
      const baseIndex =
        currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0
      const nextIndex =
        (baseIndex + direction + this.displayedPlaces.length) %
        this.displayedPlaces.length
      this.selectedPlaceId = this.displayedPlaces[nextIndex].placeId
    },
    pauseTimeline() {
      window.clearTimeout(this.timelineTimer)
      this.timelineTimer = null
      this.timelinePlaying = false
    },
    resetTimeline() {
      this.pauseTimeline()
      this.timelineIndex = -1
    },
    showTimelineStep(index) {
      const entry = this.timelineSequence[index]
      if (!entry) return false
      this.timelineIndex = index
      this.selectedPlaceId = entry.place.placeId
      return true
    },
    scheduleTimelineStep() {
      window.clearTimeout(this.timelineTimer)
      this.timelineTimer = window.setTimeout(() => {
        if (!this.timelinePlaying) return
        const nextIndex = this.timelineIndex + 1
        if (!this.showTimelineStep(nextIndex)) {
          this.timelinePlaying = false
          this.timelineTimer = null
          return
        }
        this.scheduleTimelineStep()
      }, 4200)
    },
    toggleTimeline() {
      if (this.timelinePlaying) {
        this.pauseTimeline()
        return
      }
      if (!this.timelineSequence.length) return
      this.yearFilter = "all"
      if (
        this.timelineIndex < 0 ||
        this.timelineIndex >= this.timelineSequence.length - 1
      ) {
        this.showTimelineStep(0)
      }
      this.timelinePlaying = true
      this.scheduleTimelineStep()
    },
    async exportStory() {
      if (this.storyExportPending) return
      this.storyExportPending = true
      this.storyExportStatus = "Creating the Story image."
      try {
        const favoriteImage = this.$refs.favoriteImagePreview || null
        if (favoriteImage?.decode) await favoriteImage.decode()
        const filename = await downloadMyAtlasStory({
          displayName: this.atlas.displayName,
          favoriteImage,
          favoriteImageLocation: this.atlas.favoriteImage?.location || "",
          filterLabel: this.filterLabel,
          handle: this.atlas.handle,
          places: this.displayedPlaces,
          stats: this.visibleStats,
        })
        this.storyExportStatus = `${filename} was downloaded.`
      } catch {
        this.storyExportStatus =
          "The Story image could not be created. Try again."
      } finally {
        this.storyExportPending = false
      }
    },
    formatVisitedDates,
    placeLabel(place) {
      if (place.placeType === "custom") return "Custom map pin"
      const label = formatPlaceLabel(place)
      return place.placeType === "country"
        ? place.placeId
        : label.replace(place.name + ", ", "")
    },
  },
}
</script>

<style scoped>
.my-atlas-public {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface, #0d1719);
  font-family: "Poppins", sans-serif;
}

.my-atlas-public-instagram {
  margin: 0.8rem 0;
}
.my-atlas-public-instagram a {
  color: var(--color-accent-soft, #f4d38f);
  font-weight: 700;
  overflow-wrap: anywhere;
}
.my-atlas-public-instagram a:focus-visible {
  outline: 2px solid var(--color-focus, #f4d38f);
  outline-offset: 3px;
}

.my-atlas-public-panel {
  box-sizing: border-box;
  position: relative;
  z-index: 3;
  width: min(28rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  margin: 1rem;
  padding: 1.25rem;
  overflow-y: auto;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  border-radius: 1.5rem;
  background: rgba(var(--color-page-rgb, 10, 20, 22), 0.92);
  box-shadow: 0 1.4rem 4rem rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
}

.my-atlas-public-panel > header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 700;
}

.my-atlas-public-panel > header a:first-child {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  letter-spacing: 0;
}

.my-atlas-public-panel > header a:not(:first-child) {
  margin-left: auto;
  color: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
}

.my-atlas-public-profile.has-favorite-image {
  position: relative;
  display: flex;
  min-height: 16rem;
  align-items: flex-end;
  margin: 1.15rem 0 1rem;
  overflow: hidden;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.28);
  border-radius: 1.1rem;
  background: var(--color-surface-raised, #102023);
  isolation: isolate;
}

.my-atlas-public-favorite-image {
  position: absolute;
  z-index: -2;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.my-atlas-public-profile.has-favorite-image::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(var(--color-page-rgb, 5, 13, 15), 0.08) 15%,
      rgba(var(--color-page-rgb, 5, 13, 15), 0.92)
    ),
    linear-gradient(
      90deg,
      rgba(var(--color-page-rgb, 5, 13, 15), 0.45),
      transparent 70%
    );
  content: "";
}

.my-atlas-public-profile.has-favorite-image .my-atlas-public-intro {
  width: 100%;
  margin: 0;
  padding: 1rem;
}

.my-atlas-public-favorite-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.8rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.24);
  border-radius: 0.72rem;
  color: var(--color-text, #fff8e8);
  text-align: left;
  background: rgba(var(--color-page-rgb, 6, 17, 19), 0.72);
  font: inherit;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.my-atlas-public-favorite-action strong {
  font-size: 0.68rem;
}

.my-atlas-public-favorite-action span {
  flex: 0 0 auto;
  margin: 0;
  color: var(--color-accent-soft, #f0cc82);
  font-size: 0.6rem;
  font-weight: 700;
}

.my-atlas-public-favorite-action:hover,
.my-atlas-public-favorite-action:focus-visible {
  border-color: var(--color-accent, #e6ba68);
  outline: none;
}

.my-atlas-public-favorite-action > span:last-child {
  grid-column: 2;
  grid-row: 1;
}

.my-atlas-public-favorite-action .my-atlas-public-favorite-location {
  min-width: 0;
  grid-column: 1 / -1;
  grid-row: 2;
  overflow-wrap: anywhere;
  white-space: normal;
  text-align: left;
}

.my-atlas-public-favorite-action:focus-visible {
  box-shadow: 0 0 0 3px rgba(230, 186, 104, 0.28);
}

.my-atlas-public-image-error,
.my-atlas-public-export-status {
  margin: 0 0 0.8rem;
  color: var(--color-text-muted, #9fb1ab);
  font-size: 0.62rem;
  line-height: 1.5;
}

.my-atlas-public-image-dialog {
  width: min(42rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 1rem;
  color: var(--color-text, #edf7f2);
  background: var(--color-page, #081416);
  box-shadow: 0 1.4rem 4rem rgba(0, 0, 0, 0.55);
}

.my-atlas-public-image-dialog::backdrop {
  background: rgba(var(--color-page-rgb, 2, 8, 10), 0.86);
  backdrop-filter: blur(8px);
}

.my-atlas-public-image-dialog > div {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
}

.my-atlas-public-image-dialog button {
  justify-self: end;
  min-height: 2.75rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.65rem;
  color: var(--color-accent-soft, #f6e4bc);
  background: var(--color-surface-raised, #111f22);
  font: inherit;
  font-size: 0.65rem;
  font-weight: 700;
}

.my-atlas-public-image-dialog img {
  width: 100%;
  max-height: calc(100dvh - 8rem);
  border-radius: 0.7rem;
  object-fit: contain;
}

.my-atlas-public-image-dialog p {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--color-text-muted, #b9cac4);
  font-size: 0.7rem;
  text-align: center;
}

.my-atlas-public-state,
.my-atlas-public-intro {
  margin: 1.8rem 0 1.2rem;
}

.my-atlas-public-state h1,
.my-atlas-public-intro h1 {
  margin: 0;
  font-family: "Poppins", system-ui, sans-serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 1;
  text-wrap: balance;
}

.my-atlas-public-state p,
.my-atlas-public-intro p,
.my-atlas-public-intro > span {
  margin: 0 0 0.4rem;
  color: var(--color-text-muted, #a8bab4);
  font-size: 0.76rem;
}

.my-atlas-public-intro p {
  color: var(--color-accent-soft, #e6ba68);
  font-weight: 700;
}

.my-atlas-public-intro > span {
  display: block;
  margin-top: 0.75rem;
}

.my-atlas-public-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}

.my-atlas-public-stats > div {
  display: grid;
  gap: 0.1rem;
  padding: 0.5rem 0.25rem;
  border-radius: 0.7rem;
  text-align: center;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055);
}

.my-atlas-public-stats strong {
  color: var(--color-accent-soft, #e6ba68);
  font-size: 1.05rem;
}

.my-atlas-public-stats span {
  overflow: hidden;
  color: var(--color-text-subtle, #879b94);
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.48rem;
}

.my-atlas-public-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem;
}

.my-atlas-public-controls-drawer {
  display: grid;
  gap: 0.55rem;
  margin-bottom: 0.8rem;
}

.my-atlas-public-mobile-controls-toggle {
  display: none;
}

.my-atlas-public-controls label {
  display: grid;
  flex: 1 1 10rem;
  gap: 0.2rem;
  color: var(--color-text-muted, #93a69f);
  font-size: 0.6rem;
}

.my-atlas-public-controls select,
.my-atlas-public-controls button,
.my-atlas-public-selected button {
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.38);
  border-radius: 0.65rem;
  color: var(--color-accent-soft, #f6e4bc);
  background: var(--color-surface-raised, #111f22);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-public-controls select {
  display: block;
}

.my-atlas-public-controls button:disabled {
  cursor: wait;
  opacity: 0.56;
}

.my-atlas-public-timeline {
  display: grid;
  gap: 0.08rem;
  margin: 0 0 0.32rem;
  color: var(--color-accent-soft, #f0c978);
}

.my-atlas-public-timeline strong {
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 1.05rem;
}

.my-atlas-public-timeline span,
.my-atlas-public-route-note {
  color: var(--color-text-muted, #8fa39c);
  font-size: 0.6rem;
}

.my-atlas-public-route-note {
  margin: 0;
  line-height: 1.45;
}

.my-atlas-public-selected {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.8rem;
  padding: 0.65rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.18);
  border-radius: 0.8rem;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.05);
}

.my-atlas-public-selected > div {
  display: grid;
  min-width: 0;
  text-align: center;
}

.my-atlas-public-selected span,
.my-atlas-public-selected small {
  overflow: hidden;
  color: var(--color-text-muted, #94a7a0);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6rem;
}

.my-atlas-public-selected small {
  color: var(--color-accent-soft, #d5b979);
}

.my-atlas-public-selected blockquote {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-left: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.55);
  color: var(--color-text, #dce9e4);
  text-align: left;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.06);
  font-size: 0.68rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-public-places {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.my-atlas-public-places button {
  display: grid;
  grid-template-columns: 1fr auto;
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  border-radius: 0.85rem;
  color: inherit;
  text-align: left;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.05);
  cursor: pointer;
}

.my-atlas-public-places button:hover,
.my-atlas-public-places button:focus-visible {
  border-color: var(--color-accent, #e6ba68);
}

.my-atlas-public-places span {
  grid-column: 1;
  color: var(--color-text-muted, #9eb0aa);
  font-size: 0.7rem;
}

.my-atlas-public-places small {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.66rem;
}

.my-atlas-public-places q {
  grid-column: 1;
  max-width: 36ch;
  margin-top: 0.2rem;
  overflow: hidden;
  color: var(--color-text-muted, #becdc8);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  quotes: none;
}

.my-atlas-public-attribution {
  margin: 1.1rem 0 0;
  color: var(--color-text-subtle, #80938d);
  font-size: 0.65rem;
  line-height: 1.5;
}

.my-atlas-public-brand {
  margin: 1rem 0 0;
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.68rem;
  font-weight: 700;
}

.my-atlas-public-attribution a {
  color: var(--color-accent-soft, #cdb171);
}

@media (max-width: 720px) {
  .my-atlas-public {
    display: grid;
    grid-template-rows: minmax(20rem, 54dvh) auto;
    overflow: visible;
  }

  .my-atlas-public > :first-child {
    position: relative;
  }

  .my-atlas-public-panel {
    width: 100%;
    max-height: none;
    margin: -1.4rem 0 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 1.5rem 1.5rem 0 0;
    background: var(--color-page, #0a1416);
  }

  .my-atlas-public-state,
  .my-atlas-public-intro {
    margin: 0.9rem 0 0.85rem;
  }

  .my-atlas-public-profile.has-favorite-image {
    min-height: 14rem;
    margin-top: 0.9rem;
  }

  .my-atlas-public-profile.has-favorite-image .my-atlas-public-intro {
    margin: 0;
    padding: 0.9rem;
  }

  .my-atlas-public-favorite-action {
    grid-column: 1 / -1;
  }

  .my-atlas-public-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: end;
    column-gap: 0.85rem;
  }

  .my-atlas-public-intro p,
  .my-atlas-public-intro h1 {
    grid-column: 1;
    min-width: 0;
  }

  .my-atlas-public-intro p {
    grid-row: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .my-atlas-public-intro h1 {
    grid-row: 2;
    font-size: clamp(1.8rem, 10vw, 2.45rem);
  }

  .my-atlas-public-intro > span {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: end;
    margin: 0 0 0.12rem;
    padding: 0.42rem 0.58rem;
    border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.24);
    border-radius: 999px;
    color: var(--color-accent-soft, #d9c58f);
    background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
    white-space: nowrap;
  }

  .my-atlas-public-mobile-controls-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 0.8rem;
    padding: 0.7rem 0.75rem;
    border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.32);
    border-radius: 0.75rem;
    color: var(--color-text, #edf7f2);
    background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .my-atlas-public-mobile-controls-toggle strong {
    color: var(--color-accent-soft, #e6ba68);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.56rem;
  }

  .my-atlas-public-controls-drawer {
    display: none;
  }

  .my-atlas-public-controls-drawer.is-open {
    display: grid;
  }

  .my-atlas-public-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .my-atlas-public-controls label {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .my-atlas-public-controls select {
    width: 100%;
  }

  .my-atlas-public-controls button {
    width: 100%;
  }
}
</style>
