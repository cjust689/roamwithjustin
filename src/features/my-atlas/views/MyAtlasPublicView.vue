<template>
  <main class="my-atlas-public">
    <MyAtlasMap
      :places="displayedPlaces"
      :selected-place-id="selectedPlaceId"
      @select="selectPlace"
    />

    <section class="my-atlas-public-panel" aria-labelledby="public-atlas-title">
      <header>
        <a href="/" aria-label="Roam With Justin home">RWJ</a>
        <span>Shared Atlas</span>
      </header>

      <div v-if="loading" class="my-atlas-public-state" role="status">
        Loading this Atlas
      </div>
      <div v-else-if="error" class="my-atlas-public-state" role="alert">
        <h1 id="public-atlas-title">Atlas unavailable</h1>
        <p>This Atlas is not available to view.</p>
      </div>
      <template v-else>
        <div class="my-atlas-public-intro">
          <p>@{{ atlas.handle }}</p>
          <h1 id="public-atlas-title">{{ atlas.displayName }}</h1>
          <span>{{ places.length }} {{ placeCountLabel }}</span>
        </div>

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
            <strong>{{ visibleStats.capitals }}</strong
            ><span>Capitals</span>
          </div>
        </div>

        <div class="my-atlas-public-controls">
          <label>
            <span>Show</span>
            <select v-model="yearFilter" @change="stopTimeline">
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
            {{ timelinePlaying ? "Pause timeline" : "Play timeline" }}
          </button>
          <button type="button" @click="exportStory">Story image</button>
        </div>

        <div v-if="selectedPlace" class="my-atlas-public-selected">
          <button type="button" @click="cyclePlace(-1)">Previous</button>
          <div>
            <strong>{{ selectedPlace.name }}</strong>
            <span>{{ placeLabel(selectedPlace) }}</span>
            <small>{{ formatVisitedDates(selectedPlace) }}</small>
          </div>
          <button type="button" @click="cyclePlace(1)">Next</button>
        </div>

        <ul class="my-atlas-public-places">
          <li v-for="place in displayedPlaces" :key="place.placeId">
            <button type="button" @click="selectPlace(place.placeId)">
              <strong>{{ place.name }}</strong>
              <span>{{ placeLabel(place) }}</span>
              <small>{{ formatVisitedDates(place) }}</small>
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
          under {{ attribution.license }}. Map rendering uses MapLibre and the
          configured tile provider.
        </p>
      </template>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import { fetchPublicAtlas } from "../api/client.mjs"
import {
  atlasStats,
  atlasYears,
  formatVisitedDates,
  placesForYear,
  placesThroughYear,
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
      timelineYear: null,
      yearFilter: "all",
      previousTitle: "",
      robotsMeta: null,
      previousRobotsContent: null,
      createdRobotsMeta: false,
    }
  },
  computed: {
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
      return this.timelineYear
        ? placesThroughYear(this.places, this.timelineYear)
        : placesForYear(this.places, this.yearFilter)
    },
    filterLabel() {
      if (this.timelineYear) return `Destinations through ${this.timelineYear}`
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
    years() {
      return atlasYears(this.places)
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
    window.clearInterval(this.timelineTimer)
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
        const apiBaseUrl = getMyAtlasApiBaseUrl(
          process.env,
          window.location.origin
        )
        this.atlas = await fetchPublicAtlas({
          apiBaseUrl,
          handle: this.handle,
        })
        document.title = `${this.atlas.displayName} | My Atlas`
      } catch (error) {
        this.error = "atlas_unavailable"
        document.title = "Atlas unavailable | Roam With Justin"
      } finally {
        this.loading = false
      }
    },
    selectPlace(placeId) {
      this.selectedPlaceId = placeId
    },
    cyclePlace(direction) {
      if (!this.displayedPlaces.length) return
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
    stopTimeline() {
      window.clearInterval(this.timelineTimer)
      this.timelineTimer = null
      this.timelinePlaying = false
      this.timelineYear = null
    },
    toggleTimeline() {
      if (this.timelinePlaying) {
        this.stopTimeline()
        return
      }
      if (!this.years.length) return
      this.yearFilter = "all"
      let index = 0
      this.timelineYear = this.years[index]
      this.timelinePlaying = true
      this.timelineTimer = window.setInterval(() => {
        index += 1
        if (index >= this.years.length) {
          window.clearInterval(this.timelineTimer)
          this.timelineTimer = null
          this.timelinePlaying = false
          return
        }
        this.timelineYear = this.years[index]
      }, 1500)
    },
    exportStory() {
      downloadMyAtlasStory({
        displayName: this.atlas.displayName,
        filterLabel: this.filterLabel,
        handle: this.atlas.handle,
        places: this.displayedPlaces,
        stats: this.visibleStats,
      })
    },
    formatVisitedDates,
    placeLabel(place) {
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
  color: #edf7f2;
  background: #0d1719;
  font-family: "Poppins", sans-serif;
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.5rem;
  background: rgba(10, 20, 22, 0.92);
  box-shadow: 0 1.4rem 4rem rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
}

.my-atlas-public-panel > header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 700;
}

.my-atlas-public-panel > header a {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 50%;
  color: #132023;
  background: #e6ba68;
  letter-spacing: 0;
}

.my-atlas-public-state,
.my-atlas-public-intro {
  margin: 1.8rem 0 1.2rem;
}

.my-atlas-public-state h1,
.my-atlas-public-intro h1 {
  margin: 0;
  font-family: "Russo One", sans-serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 1;
  text-wrap: balance;
}

.my-atlas-public-state p,
.my-atlas-public-intro p,
.my-atlas-public-intro span {
  margin: 0 0 0.4rem;
  color: #a8bab4;
  font-size: 0.76rem;
}

.my-atlas-public-intro p {
  color: #e6ba68;
  font-weight: 700;
}

.my-atlas-public-intro span {
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
  background: rgba(255, 255, 255, 0.055);
}

.my-atlas-public-stats strong {
  color: #e6ba68;
  font-size: 1.05rem;
}

.my-atlas-public-stats span {
  overflow: hidden;
  color: #879b94;
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
  margin-bottom: 0.8rem;
}

.my-atlas-public-controls label {
  display: grid;
  flex: 1 1 10rem;
  gap: 0.2rem;
  color: #93a69f;
  font-size: 0.6rem;
}

.my-atlas-public-controls select,
.my-atlas-public-controls button,
.my-atlas-public-selected button {
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(230, 186, 104, 0.38);
  border-radius: 0.65rem;
  color: #f6e4bc;
  background: #111f22;
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-public-selected {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.8rem;
  padding: 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.18);
  border-radius: 0.8rem;
  background: rgba(230, 186, 104, 0.05);
}

.my-atlas-public-selected > div {
  display: grid;
  min-width: 0;
  text-align: center;
}

.my-atlas-public-selected span,
.my-atlas-public-selected small {
  overflow: hidden;
  color: #94a7a0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6rem;
}

.my-atlas-public-selected small {
  color: #d5b979;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.85rem;
  color: inherit;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.my-atlas-public-places button:hover,
.my-atlas-public-places button:focus-visible {
  border-color: #e6ba68;
}

.my-atlas-public-places span {
  grid-column: 1;
  color: #9eb0aa;
  font-size: 0.7rem;
}

.my-atlas-public-places small {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: #e6ba68;
  font-size: 0.66rem;
}

.my-atlas-public-attribution {
  margin: 1.1rem 0 0;
  color: #80938d;
  font-size: 0.65rem;
  line-height: 1.5;
}

.my-atlas-public-brand {
  margin: 1rem 0 0;
  color: #e6ba68;
  font-size: 0.68rem;
  font-weight: 700;
}

.my-atlas-public-attribution a {
  color: #cdb171;
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
    background: #0a1416;
  }
}
</style>
