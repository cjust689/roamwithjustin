<template>
  <main class="my-atlas-proof">
    <MyAtlasMap
      :places="pinnedPlaces"
      :selected-place-id="selectedPlaceId"
      @select="selectPin"
    />

    <section class="my-atlas-panel" aria-labelledby="my-atlas-title">
      <header>
        <a href="/" aria-label="Roam With Justin home">RWJ</a>
        <span>My Atlas</span>
      </header>

      <div class="my-atlas-intro">
        <p>Private beta geographic proof</p>
        <h1 id="my-atlas-title">Mark the places that shaped your travels.</h1>
        <p>
          Search countries and cities, then place them on your map. This local
          proof does not save or publish your selections.
        </p>
      </div>

      <label class="my-atlas-search">
        <span>Find a country or city</span>
        <input
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Try Uvita or Paris"
          aria-describedby="my-atlas-search-help"
        />
        <small id="my-atlas-search-help">
          Enter at least two characters. Results use the GeoNames catalog.
        </small>
      </label>

      <div v-if="searchPending" class="my-atlas-search-state" role="status">
        Searching places
      </div>
      <div
        v-else-if="query.trim().length >= 2 && !searchResults.length"
        class="my-atlas-search-state"
        role="status"
      >
        No matching country or city in this proof catalog.
      </div>
      <ul v-if="searchResults.length" class="my-atlas-results">
        <li v-for="place in searchResults" :key="place.placeId">
          <button type="button" @click="addPlace(place)">
            <span>{{ place.name }}</span>
            <small>{{ placeLabel(place) }}</small>
            <b>{{ place.placeType }}</b>
          </button>
        </li>
      </ul>

      <section class="my-atlas-pins" aria-labelledby="my-atlas-pins-title">
        <div>
          <p>Your destinations</p>
          <strong id="my-atlas-pins-title">{{ pinnedPlaces.length }}</strong>
        </div>
        <p v-if="!pinnedPlaces.length" class="my-atlas-empty">
          Your first destination will appear here and on the map.
        </p>
        <ul v-else>
          <li v-for="place in pinnedPlaces" :key="place.placeId">
            <button type="button" @click="selectPin(place.placeId)">
              <span>{{ place.name }}</span>
              <small>{{ placeLabel(place) }}</small>
            </button>
            <button
              class="remove"
              type="button"
              :aria-label="'Remove ' + place.name"
              @click="removePlace(place)"
            >
              Remove
            </button>
          </li>
        </ul>
      </section>

      <p class="my-atlas-beta-note">
        Private beta data may be reset. Export and account controls arrive only
        after the secure backend release gate.
      </p>
      <p class="my-atlas-attribution">
        Place data
        <a href="https://www.geonames.org/" target="_blank" rel="noopener">
          GeoNames
        </a>
        under CC BY 4.0. Map rendering uses MapLibre and the configured tile
        provider.
      </p>
      <p class="my-atlas-announcement" aria-live="polite">{{ announcement }}</p>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import placeCatalog from "../data/place-catalog.proof.json"
import {
  formatPlaceLabel,
  resolveCatalogPlace,
  searchPlaceCatalog,
} from "../catalog/search.mjs"
import { addDraftPin, removeDraftPin } from "../catalog/pinDraft.mjs"

export default {
  name: "MyAtlasGeographicProof",
  components: {
    MyAtlasMap,
  },
  data() {
    return {
      query: "",
      searchResults: [],
      searchPending: false,
      searchTimer: null,
      pins: [],
      selectedPlaceId: "",
      announcement: "",
    }
  },
  computed: {
    pinnedPlaces() {
      return this.pins
        .map(pin => resolveCatalogPlace(placeCatalog, pin.placeId))
        .filter(place => place && Array.isArray(place.coordinates))
    },
  },
  watch: {
    query(value) {
      window.clearTimeout(this.searchTimer)
      this.searchResults = []
      if (value.trim().length < 2) {
        this.searchPending = false
        return
      }
      this.searchPending = true
      this.searchTimer = window.setTimeout(() => {
        this.searchResults = searchPlaceCatalog(placeCatalog, value, {
          limit: 8,
        })
        this.searchPending = false
      }, 180)
    },
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.clearTimeout(this.searchTimer)
  },
  methods: {
    placeLabel(place) {
      const label = formatPlaceLabel(place)
      if (place.placeType === "country") return place.placeId
      return label.replace(place.name + ", ", "")
    },
    addPlace(place) {
      try {
        this.pins = addDraftPin(this.pins, place.placeId, placeCatalog)
        this.selectedPlaceId = place.placeId
        this.query = ""
        this.announcement = place.name + " was added to your map."
      } catch (error) {
        this.announcement = error.message
      }
    },
    removePlace(place) {
      this.pins = removeDraftPin(this.pins, place.placeId)
      if (this.selectedPlaceId === place.placeId) this.selectedPlaceId = ""
      this.announcement = place.name + " was removed from your map."
    },
    selectPin(placeId) {
      this.selectedPlaceId = placeId
    },
  },
}
</script>

<style scoped>
.my-atlas-proof {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: #edf7f2;
  background: #0d1719;
  font-family: "Poppins", sans-serif;
}

.my-atlas-panel {
  box-sizing: border-box;
  position: relative;
  z-index: 3;
  min-width: 0;
  width: min(30rem, calc(100vw - 2rem));
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

.my-atlas-panel > header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 700;
}

.my-atlas-panel > header a {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 50%;
  color: #132023;
  background: #e6ba68;
  letter-spacing: 0;
}

.my-atlas-intro {
  margin: 1.8rem 0 1.35rem;
}

.my-atlas-intro > p:first-child,
.my-atlas-pins > div p {
  margin: 0 0 0.35rem;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 700;
}

.my-atlas-intro h1 {
  max-width: 10em;
  margin: 0;
  font-family: "Russo One", sans-serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 0.98;
  text-wrap: balance;
}

.my-atlas-intro > p:last-child {
  margin: 1rem 0 0;
  color: #b2c2bd;
  font-size: 0.88rem;
  line-height: 1.55;
}

.my-atlas-search {
  display: grid;
  gap: 0.4rem;
}

.my-atlas-search > span {
  font-size: 0.78rem;
  font-weight: 700;
}

.my-atlas-search input {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.9rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
  font: inherit;
}

.my-atlas-search input:focus {
  border-color: #e6ba68;
  box-shadow: 0 0 0 2px rgba(230, 186, 104, 0.2);
  outline: none;
}

.my-atlas-search small,
.my-atlas-search-state {
  color: #8ea29c;
  font-size: 0.7rem;
}

.my-atlas-search-state {
  padding: 0.8rem 0;
}

.my-atlas-results,
.my-atlas-pins ul {
  display: grid;
  gap: 0.45rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.my-atlas-results button,
.my-atlas-pins li {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.05);
}

.my-atlas-results button {
  display: grid;
  grid-template-columns: 1fr auto;
  width: 100%;
  padding: 0.7rem 0.8rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.my-atlas-results button:hover,
.my-atlas-results button:focus-visible {
  border-color: #e6ba68;
}

.my-atlas-results span,
.my-atlas-pins span {
  font-weight: 700;
}

.my-atlas-results small,
.my-atlas-pins small {
  grid-column: 1;
  color: #9eb0aa;
  font-size: 0.7rem;
}

.my-atlas-results b {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.58rem;
}

.my-atlas-pins {
  margin-top: 1.3rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.my-atlas-pins > div {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.my-atlas-pins > div strong {
  color: #e6ba68;
  font-size: 1.65rem;
}

.my-atlas-empty {
  margin: 0.7rem 0 0;
  color: #8ea29c;
  font-size: 0.76rem;
}

.my-atlas-pins li {
  display: flex;
  align-items: center;
  padding: 0.35rem;
}

.my-atlas-pins li > button:first-child {
  display: grid;
  flex: 1;
  padding: 0.35rem 0.45rem;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.my-atlas-pins .remove {
  padding: 0.45rem;
  border: 0;
  color: #d5a19b;
  background: transparent;
  font-size: 0.65rem;
  cursor: pointer;
}

.my-atlas-beta-note,
.my-atlas-attribution {
  margin: 1rem 0 0;
  color: #80938d;
  font-size: 0.65rem;
  line-height: 1.5;
}

.my-atlas-attribution a {
  color: #cdb171;
}

.my-atlas-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 720px) {
  .my-atlas-proof {
    display: grid;
    grid-template-rows: minmax(20rem, 54dvh) auto;
    overflow: visible;
  }

  .my-atlas-proof > :first-child {
    position: relative;
  }

  .my-atlas-panel {
    width: 100%;
    max-width: 100%;
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
