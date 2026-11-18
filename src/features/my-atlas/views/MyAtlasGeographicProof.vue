<template>
  <main class="my-atlas-proof">
    <MyAtlasMap
      ref="atlasMap"
      :places="displayedPlaces"
      :selected-place-id="selectedPlaceId"
      :show-connections="showConnections"
      :show-memories="showMemories"
      :playback-active="timelinePlaying"
      :placement-active="customPlaceOpen"
      :placement-coordinates="customPlaceCoordinates"
      @select="selectPin"
      @place-custom="setCustomPlaceCoordinates"
    />
    <MyAtlasTutorial
      v-if="tutorialOpen"
      :variant="tutorialVariant"
      @close="closeTutorial"
      @complete="completeTutorial"
    />

    <section class="my-atlas-panel" aria-labelledby="my-atlas-title">
      <header>
        <a href="/" aria-label="Roam With Justin home">RWJ</a>
        <span>My Atlas</span>
      </header>

      <div class="my-atlas-intro">
        <p>My Atlas by RoamWithJustin.com</p>
        <h1 id="my-atlas-title">Mark the places that shaped your travels.</h1>
        <p class="my-atlas-intro-copy">
          Search countries, cities, national parks, and iconic spots, then place
          them on your map.
          <template v-if="accountProfile">
            Your changes are saved to your private beta account.
          </template>
          <template v-else>
            This local proof does not save or publish your selections.
          </template>
        </p>
        <div class="my-atlas-intro-actions">
          <button
            type="button"
            @click="openTutorial(accountProfile ? 'account' : 'preview')"
          >
            {{ accountProfile ? "Quick start guide" : "See how it works" }}
          </button>
        </div>
      </div>

      <section v-if="pinnedPlaces.length" class="my-atlas-overview">
        <div class="my-atlas-stats" aria-label="Atlas statistics">
          <div>
            <strong>{{ visibleStats.places }}</strong>
            <span>Places</span>
          </div>
          <div>
            <strong>{{ visibleStats.countries }}</strong>
            <span>Countries</span>
          </div>
          <div>
            <strong>{{ visibleStats.continents }}</strong>
            <span>Continents</span>
          </div>
          <div>
            <strong>{{ visibleStats.spots || visibleStats.capitals }}</strong>
            <span>{{ visibleStats.spots ? "Spots" : "Capitals" }}</span>
          </div>
        </div>

        <button
          type="button"
          class="my-atlas-mobile-controls-toggle"
          :aria-expanded="String(mobileControlsOpen)"
          aria-controls="my-atlas-map-controls"
          @click="mobileControlsOpen = !mobileControlsOpen"
        >
          <span>Map controls</span>
          <strong>{{ mobileControlsOpen ? "Hide" : "Show" }}</strong>
        </button>
        <div
          id="my-atlas-map-controls"
          class="my-atlas-controls-drawer"
          :class="{ 'is-open': mobileControlsOpen }"
        >
          <div class="my-atlas-view-controls">
            <label>
              <span>Show</span>
              <select v-model="yearFilter" @change="resetTimeline">
                <option value="all">Every destination</option>
                <option v-for="year in years" :key="year" :value="String(year)">
                  {{ year }}
                </option>
                <option v-if="atlasStats.undated" value="undated">
                  Date open
                </option>
              </select>
            </label>
            <button
              type="button"
              :disabled="!years.length"
              @click="toggleTimeline"
            >
              {{ timelineButtonLabel }}
            </button>
            <button type="button" @click="showConnections = !showConnections">
              {{ showConnections ? "Hide paths" : "Show paths" }}
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
          <p v-if="timelineEntry" class="my-atlas-timeline-year">
            <strong>{{ timelineEntry.place.name }}</strong>
            <span>
              {{ timelineEntry.year }} · {{ timelineIndex + 1 }} of
              {{ timelineSequence.length }}
            </span>
          </p>
          <p class="my-atlas-connections-note">
            Playback follows visit years. Hops within a year are a visual
            sequence, not a recorded travel route.
          </p>
        </div>

        <div v-if="selectedPlace" class="my-atlas-selected">
          <button
            type="button"
            aria-label="Previous destination"
            @click="cyclePin(-1)"
          >
            Previous
          </button>
          <div>
            <strong>{{ selectedPlace.name }}</strong>
            <span>{{ placeLabel(selectedPlace) }}</span>
            <small>{{ formatVisitedDates(selectedPlace) }}</small>
          </div>
          <button
            type="button"
            aria-label="Next destination"
            @click="cyclePin(1)"
          >
            Next
          </button>
          <blockquote v-if="selectedPlace.memory">
            {{ selectedPlace.memory }}
          </blockquote>
        </div>
      </section>

      <section
        ref="authSection"
        class="my-atlas-auth"
        aria-labelledby="my-atlas-auth-title"
        tabindex="-1"
      >
        <div>
          <p id="my-atlas-auth-title">Google sign in</p>
          <span v-if="auth.loading">Checking your session</span>
          <template v-else-if="auth.authenticated">
            <strong>{{ authDisplayName }}</strong>
            <span v-if="accountProfile"> Connected </span>
            <span v-else>
              Sign in is connected. Use your one-use invitation below to create
              a private beta account.
            </span>
          </template>
          <span v-else-if="!auth.configured">
            Authentication is not configured for this build.
          </span>
          <span v-else
            >Sign in through Auth0 with your approved Google account.</span
          >
        </div>
        <div
          v-if="auth.configured && !auth.loading"
          class="my-atlas-auth-actions"
        >
          <button
            v-if="!auth.authenticated"
            ref="signInButton"
            type="button"
            @click="signIn"
          >
            Sign in with Google
          </button>
          <template v-else>
            <button type="button" @click="verifyApiAccess">Verify API</button>
            <button
              v-if="accountLoadFailed"
              type="button"
              :disabled="accountPending"
              @click="loadAccount"
            >
              {{ accountPending ? "Loading Atlas" : "Retry saved Atlas" }}
            </button>
            <button type="button" @click="signOut">Sign out</button>
          </template>
        </div>
        <p v-if="auth.error" class="my-atlas-auth-error" role="alert">
          {{ auth.error }}
        </p>
        <p v-if="apiAccessVerified" class="my-atlas-auth-success" role="status">
          The My Atlas API verified your audience scoped access token.
        </p>
        <p v-if="accountError" class="my-atlas-auth-error" role="alert">
          {{ accountError }}
        </p>
      </section>

      <MyAtlasRegistrationForm
        v-if="auth.authenticated && accountMissing"
        ref="registration"
        :site-key="turnstileSiteKey"
        :initial-display-name="authDisplayName"
        :pending="registrationPending"
        :error="registrationError"
        @submit="registerAccount"
      />

      <section class="my-atlas-workflow-section my-atlas-add-place">
        <button
          type="button"
          class="my-atlas-section-toggle"
          :aria-expanded="String(addPlaceOpen)"
          aria-controls="my-atlas-add-place-content"
          :disabled="customPlaceOpen || Boolean(pinEditorPlace)"
          @click="addPlaceOpen = !addPlaceOpen"
        >
          <span>
            <strong id="my-atlas-add-place-title">Add a destination</strong>
            <small>Search My Atlas or place a custom pin</small>
          </span>
          <b>{{ addPlaceOpen ? "Hide" : "Add place" }}</b>
        </button>

        <div
          v-show="addPlaceOpen"
          id="my-atlas-add-place-content"
          class="my-atlas-section-content"
          aria-labelledby="my-atlas-add-place-title"
        >
          <label class="my-atlas-search">
            <span>Find a country, city, or spot</span>
            <input
              ref="searchInput"
              v-model="query"
              type="search"
              autocomplete="off"
              placeholder="Try Uvita, Yellowstone, or Eiffel Tower"
              aria-describedby="my-atlas-search-help"
            />
            <small id="my-atlas-search-help">
              {{ searchHelp }}
            </small>
          </label>

          <section
            v-if="accountProfile"
            class="my-atlas-custom-place"
            :class="{ 'is-open': customPlaceOpen }"
            aria-labelledby="my-atlas-custom-place-title"
          >
            <button
              v-if="!customPlaceOpen"
              type="button"
              class="my-atlas-custom-place-trigger"
              :disabled="accountPending"
              @click="beginCustomPlace"
            >
              Can't find it? Add a custom pin
            </button>
            <template v-else>
              <div class="my-atlas-custom-place-heading">
                <div>
                  <p id="my-atlas-custom-place-title">Custom map pin</p>
                  <span
                    >Name the place, then choose its position on the map.</span
                  >
                </div>
                <button type="button" @click="cancelCustomPlace">Cancel</button>
              </div>
              <label>
                <span>Place name</span>
                <input
                  ref="customNameInput"
                  v-model="customPlaceName"
                  type="text"
                  maxlength="160"
                  autocomplete="off"
                  placeholder="Krka National Park"
                />
                <small>
                  {{ customPlaceCharacterCount }} of
                  {{ customPlaceMaxCharacters }} characters
                </small>
                <small v-if="customPlaceNameError" class="is-error">
                  {{ customPlaceNameError }}
                </small>
              </label>
              <div class="my-atlas-custom-place-position">
                <strong>{{
                  customPlaceCoordinates
                    ? "Position selected"
                    : "Position needed"
                }}</strong>
                <span v-if="customPlaceCoordinates">
                  {{ customPlaceCoordinates[1].toFixed(4) }},
                  {{ customPlaceCoordinates[0].toFixed(4) }}
                </span>
                <span v-else>
                  Click or tap the map. You can then drag the gold pin or adjust
                  it with the arrow keys.
                </span>
                <button
                  v-if="!customPlaceCoordinates"
                  type="button"
                  @click="focusMapForPlacement"
                >
                  Choose on map
                </button>
              </div>
              <p v-if="customPlaceError" class="my-atlas-custom-place-error">
                {{ customPlaceError }}
              </p>
              <p class="my-atlas-custom-place-disclosure">
                This name and map position are your own entry. They become
                visible if you share your Atlas publicly.
              </p>
              <button
                type="button"
                class="my-atlas-custom-place-continue"
                :disabled="!customPlaceReady || accountPending"
                @click="continueCustomPlace"
              >
                Continue to visit details
              </button>
            </template>
          </section>

          <MyAtlasPinEditor
            v-if="pinEditorPlace"
            :key="pinEditorKey"
            :place="pinEditorPlace"
            :place-label="placeLabel(pinEditorPlace)"
            :pin="pinEditorPin"
            :pending="accountPending"
            :error="pinEditorError"
            @cancel="closePinEditor"
            @save="savePinDetails"
          />

          <div v-if="searchPending" class="my-atlas-search-state" role="status">
            Searching places
          </div>
          <div
            v-else-if="searchError"
            class="my-atlas-search-state is-error"
            role="alert"
          >
            <span>{{ searchError }}</span>
            <button type="button" @click="retryPlaceSearch">
              Retry search
            </button>
          </div>
          <div
            v-else-if="query.trim().length >= 2 && !searchResults.length"
            class="my-atlas-search-state"
            role="status"
          >
            No matching country, city, or spot in this catalog.
          </div>
          <ul v-if="searchResults.length" class="my-atlas-results">
            <li v-for="place in searchResults" :key="place.placeId">
              <button
                type="button"
                :disabled="accountPending"
                @click="openNewPin(place)"
              >
                <span>{{ place.name }}</span>
                <small>{{ placeLabel(place) }}</small>
                <b>{{ placeTypeLabel(place) }}</b>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section class="my-atlas-pins my-atlas-workflow-section">
        <button
          type="button"
          class="my-atlas-section-toggle"
          :aria-expanded="String(visitedOpen)"
          aria-controls="my-atlas-pins-content"
          @click="visitedOpen = !visitedOpen"
        >
          <span>
            <strong id="my-atlas-pins-title">Visited destinations</strong>
            <small>{{ filterLabel }}</small>
          </span>
          <b>{{ displayedPlaces.length }}</b>
        </button>
        <div
          v-show="visitedOpen"
          id="my-atlas-pins-content"
          class="my-atlas-section-content"
          aria-labelledby="my-atlas-pins-title"
        >
          <p v-if="!pinnedPlaces.length" class="my-atlas-empty">
            Your first destination will appear here and on the map.
          </p>
          <p v-else-if="!displayedPlaces.length" class="my-atlas-empty">
            No destinations match this view.
          </p>
          <ul v-else>
            <li v-for="place in displayedPlaces" :key="place.placeId">
              <button type="button" @click="selectPin(place.placeId)">
                <span>{{ place.name }}</span>
                <small>{{ placeLabel(place) }}</small>
                <em>{{ formatVisitedDates(place) }}</em>
                <q v-if="place.memory">{{ place.memory }}</q>
              </button>
              <button
                class="edit"
                type="button"
                :disabled="accountPending"
                :aria-label="'Edit visit details for ' + place.name"
                @click="openExistingPin(place)"
              >
                Edit
              </button>
              <button
                class="remove"
                type="button"
                :disabled="accountPending"
                :aria-label="'Remove ' + place.name"
                @click="removePlace(place)"
              >
                Remove
              </button>
            </li>
          </ul>
        </div>
      </section>

      <MyAtlasPlanner
        v-if="accountProfile"
        :api-base-url="apiBaseUrl"
        :pins="pins"
        :profile-public="accountProfile.public"
        :revision="accountProfile.revision"
        @revision-change="updatePlanningRevision"
        @pins-created="handlePlannerPinsCreated"
        @account-deleted="handleAccountDeleted"
      />

      <section
        v-if="accountProfile"
        class="my-atlas-sharing my-atlas-workflow-section"
      >
        <button
          type="button"
          class="my-atlas-section-toggle"
          :aria-expanded="String(sharingOpen)"
          aria-controls="my-atlas-sharing-content"
          @click="sharingOpen = !sharingOpen"
        >
          <span>
            <strong id="my-atlas-sharing-title">Share and export</strong>
            <small>Story image and public link controls</small>
          </span>
          <b>{{ accountProfile.public ? "Public" : "Private" }}</b>
        </button>
        <div
          v-show="sharingOpen"
          id="my-atlas-sharing-content"
          class="my-atlas-section-content my-atlas-sharing-content"
          aria-labelledby="my-atlas-sharing-title"
        >
          <p>
            Publishing makes your marked places, optional visit dates, and
            favorite memories available to anyone with your link. Names and
            positions of your custom pins are included.
          </p>
          <div class="my-atlas-sharing-actions">
            <button
              type="button"
              :disabled="
                accountPending || (!pins.length && !accountProfile.public)
              "
              @click="toggleSharing"
            >
              {{ accountProfile.public ? "Make private" : "Share my Atlas" }}
            </button>
            <button
              type="button"
              :disabled="!pinnedPlaces.length"
              @click="exportStory"
            >
              Export Story image
            </button>
            <button
              v-if="accountProfile.public"
              type="button"
              :disabled="accountPending"
              @click="copyShareLink"
            >
              Copy link
            </button>
          </div>
          <a v-if="accountProfile.public" :href="shareUrl">{{ shareUrl }}</a>
        </div>
      </section>

      <p class="my-atlas-beta-note">
        Private beta data may be reset. Story images are generated locally in
        your browser.
      </p>
      <p class="my-atlas-attribution">
        Place data
        <a href="https://www.geonames.org/" target="_blank" rel="noopener">
          GeoNames
        </a>
        under CC BY 4.0. Custom pins are supplied by each Atlas owner. Map
        rendering uses MapLibre and the configured tile provider.
      </p>
      <p class="my-atlas-brand">My Atlas by RoamWithJustin.com</p>
      <p class="my-atlas-announcement" aria-live="polite">{{ announcement }}</p>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import MyAtlasPinEditor from "../components/MyAtlasPinEditor.vue"
import MyAtlasPlanner from "../components/MyAtlasPlanner.vue"
import MyAtlasRegistrationForm from "../components/MyAtlasRegistrationForm.vue"
import MyAtlasTutorial from "../components/MyAtlasTutorial.vue"
import placeCatalog from "../data/place-catalog.proof.json"
import {
  atlasTimelineSequence,
  atlasStats,
  atlasYears,
  formatVisitedDates,
  placesForYear,
  placesThroughTimelineStep,
} from "../catalog/atlasInsights.mjs"
import { formatPlaceLabel, resolveCatalogPlace } from "../catalog/search.mjs"
import { formatPlaceTypeLabel } from "../catalog/placeTypes.mjs"
import {
  MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS,
  normalizeMyAtlasCustomCoordinates,
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomPlaceName,
} from "../catalog/customPlace.mjs"
import { addDraftPin, removeDraftPin } from "../catalog/pinDraft.mjs"
import {
  formatMyAtlasPlaceSearchError,
  searchMyAtlasPlaces,
} from "../catalog/placeSearchClient.mjs"
import {
  createMyAtlasPin,
  deleteMyAtlasAccount,
  deleteMyAtlasPin,
  fetchMyAtlasState,
  registerMyAtlasAccount,
  updateMyAtlasPin,
  updateMyAtlasSharing,
  verifyMyAtlasApiAccess,
} from "../api/client.mjs"
import { getMyAtlasApiBaseUrl } from "../config/api.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import { getMyAtlasTurnstileSiteKey } from "../config/turnstile.mjs"
import { downloadMyAtlasStory } from "../export/storyExport.mjs"
import {
  getMyAtlasApiAccessToken,
  initializeMyAtlasAuth,
  loginToMyAtlas,
  logoutFromMyAtlas,
  myAtlasAuthState,
} from "../auth/auth0"

const ACCOUNT_TUTORIAL_STORAGE_PREFIX = "rwj:my-atlas:account-tutorial:v1:"

export default {
  name: "MyAtlasGeographicProof",
  components: {
    MyAtlasMap,
    MyAtlasPinEditor,
    MyAtlasPlanner,
    MyAtlasRegistrationForm,
    MyAtlasTutorial,
  },
  data() {
    return {
      query: "",
      searchResults: [],
      searchPending: false,
      searchTimer: null,
      searchRequest: 0,
      searchAbortController: null,
      searchError: "",
      placeSearchEndpoint: getMyAtlasPlaceSearchEndpoint(
        process.env,
        window.location.origin
      ),
      apiBaseUrl: getMyAtlasApiBaseUrl(process.env, window.location.origin),
      loadedPlaces: {},
      pins: [],
      selectedPlaceId: "",
      pinEditorPlace: null,
      pinEditorPin: null,
      pinEditorError: "",
      customPlaceOpen: false,
      customPlaceName: "",
      customPlaceCoordinates: null,
      customPlaceError: "",
      pendingCustomPlace: null,
      yearFilter: "all",
      timelineIndex: -1,
      timelinePlaying: false,
      timelineTimer: null,
      showConnections: true,
      showMemories: false,
      mobileControlsOpen: false,
      addPlaceOpen: true,
      visitedOpen: false,
      sharingOpen: false,
      workflowSectionsInitialized: false,
      announcement: "",
      auth: myAtlasAuthState,
      apiAccessVerified: false,
      accountProfile: null,
      accountMissing: false,
      accountPending: false,
      accountError: "",
      accountLoadFailed: false,
      registrationPending: false,
      registrationError: "",
      turnstileSiteKey: getMyAtlasTurnstileSiteKey(process.env),
      tutorialOpen: false,
      tutorialVariant: "preview",
    }
  },
  computed: {
    authDisplayName() {
      return this.auth.user?.name || this.auth.user?.email || "Signed in"
    },
    customPlaceCharacterCount() {
      return Array.from(this.customPlaceName).length
    },
    customPlaceMaxCharacters() {
      return MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS
    },
    customPlaceNameError() {
      if (!this.customPlaceName) return ""
      return normalizeMyAtlasCustomPlaceName(this.customPlaceName)
        ? ""
        : `Use plain text up to ${MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS} characters.`
    },
    customPlaceReady() {
      return Boolean(
        normalizeMyAtlasCustomPlace({
          name: this.customPlaceName,
          coordinates: this.customPlaceCoordinates,
        })
      )
    },
    runtimeCatalog() {
      const baseIds = new Set(placeCatalog.records.map(place => place.placeId))
      return {
        ...placeCatalog,
        records: [
          ...placeCatalog.records,
          ...Object.values(this.loadedPlaces).filter(
            place => !baseIds.has(place.placeId)
          ),
        ],
      }
    },
    pinnedPlaces() {
      return this.pins
        .map(pin => {
          const place = resolveCatalogPlace(this.runtimeCatalog, pin.placeId)
          if (!place) return null
          const country = place.countryCode
            ? resolveCatalogPlace(
                this.runtimeCatalog,
                `iso-country:${place.countryCode}`
              )
            : null
          return {
            ...place,
            ...pin,
            continent: place.continent || country?.continent,
            featureCode: place.featureCode || place.source?.featureCode,
          }
        })
        .filter(place => place && Array.isArray(place.coordinates))
    },
    atlasStats() {
      return atlasStats(this.pinnedPlaces)
    },
    displayedPlaces() {
      if (this.timelineIndex >= 0) {
        return placesThroughTimelineStep(
          this.timelineSequence,
          this.timelineIndex
        )
      }
      return placesForYear(this.pinnedPlaces, this.yearFilter)
    },
    filterLabel() {
      if (this.timelineEntry) {
        return `Timeline through ${this.timelineEntry.place.name}, ${this.timelineEntry.year}`
      }
      if (this.yearFilter === "all") return "All destinations"
      if (this.yearFilter === "undated") return "Destinations with open dates"
      return `Destinations from ${this.yearFilter}`
    },
    pinEditorKey() {
      return `${this.pinEditorPlace?.placeId || "none"}:${this.pinEditorPin?.pinId || "new"}`
    },
    searchHelp() {
      return this.placeSearchEndpoint
        ? "Enter at least two characters."
        : "Enter at least two characters."
    },
    shareUrl() {
      return this.accountProfile
        ? `${window.location.origin}/my-atlas/${this.accountProfile.handle}`
        : ""
    },
    selectedPlace() {
      return (
        this.displayedPlaces.find(
          place => place.placeId === this.selectedPlaceId
        ) || this.displayedPlaces[0]
      )
    },
    visibleStats() {
      return atlasStats(this.displayedPlaces)
    },
    visibleMemoryCount() {
      return this.displayedPlaces.filter(place => Boolean(place.memory)).length
    },
    years() {
      return atlasYears(this.pinnedPlaces)
    },
    timelineSequence() {
      return atlasTimelineSequence(this.pinnedPlaces)
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
  watch: {
    query(value) {
      this.queuePlaceSearch(value)
    },
  },
  async created() {
    await initializeMyAtlasAuth()
    if (this.auth.authenticated) await this.loadAccount()
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeyboardNavigation)
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.clearTimeout(this.searchTimer)
    window.clearTimeout(this.timelineTimer)
    window.removeEventListener("keydown", this.handleKeyboardNavigation)
    if (this.searchAbortController) this.searchAbortController.abort()
  },
  methods: {
    updatePlanningRevision(revision) {
      if (!this.accountProfile || !Number.isSafeInteger(revision)) return
      this.accountProfile = { ...this.accountProfile, revision }
    },
    handlePlannerPinsCreated(pins) {
      if (!Array.isArray(pins) || !this.accountProfile) return
      pins.forEach(pin => {
        if (!this.pins.some(candidate => candidate.pinId === pin.pinId)) {
          this.pins = [
            ...this.pins,
            {
              pinId: pin.pinId,
              placeId: pin.placeId,
              visitedDates: pin.visitedDates,
              visitedYears: pin.visitedYears,
              memory: pin.memory,
            },
          ]
        }
        this.$set(this.loadedPlaces, pin.placeId, {
          placeId: pin.placeId,
          placeType: pin.placeType,
          name: pin.name,
          countryCode: pin.countryCode,
          admin1Name: pin.admin1Name,
          countryName: pin.countryName,
          continent: pin.continent,
          featureCode: pin.featureCode,
          spotCategory: pin.spotCategory,
          spotKind: pin.spotKind,
          coordinates: pin.coordinates,
          deprecated: false,
        })
      })
      this.accountProfile = {
        ...this.accountProfile,
        pinCount: this.pins.length,
      }
      this.visitedOpen = true
    },
    handleAccountDeleted() {
      this.accountProfile = null
      this.accountMissing = true
      this.pins = []
      this.selectedPlaceId = ""
      this.addPlaceOpen = true
      this.visitedOpen = false
      this.sharingOpen = false
      this.workflowSectionsInitialized = false
      this.announcement = "Your My Atlas application data was deleted."
    },
    queuePlaceSearch(value, delay = 350) {
      window.clearTimeout(this.searchTimer)
      if (this.searchAbortController) this.searchAbortController.abort()
      this.searchResults = []
      this.searchError = ""
      const request = ++this.searchRequest
      if (value.trim().length < 2) {
        this.searchPending = false
        return
      }
      this.searchPending = true
      this.searchTimer = window.setTimeout(async () => {
        this.searchAbortController = new AbortController()
        try {
          const results = await searchMyAtlasPlaces({
            query: value,
            catalog: placeCatalog,
            endpoint: this.placeSearchEndpoint,
            limit: 8,
            signal: this.searchAbortController.signal,
          })
          if (request !== this.searchRequest) return
          results.forEach(place => {
            this.$set(this.loadedPlaces, place.placeId, place)
          })
          this.searchResults = results
        } catch (error) {
          if (error.name === "AbortError" || request !== this.searchRequest)
            return
          this.searchError = this.placeSearchErrorMessage(error)
        } finally {
          if (request === this.searchRequest) this.searchPending = false
        }
      }, delay)
    },
    retryPlaceSearch() {
      this.queuePlaceSearch(this.query, 0)
    },
    placeSearchErrorMessage(error) {
      return formatMyAtlasPlaceSearchError(error)
    },
    signIn() {
      loginToMyAtlas()
    },
    signOut() {
      logoutFromMyAtlas()
    },
    async verifyApiAccess() {
      this.auth.error = ""
      this.apiAccessVerified = false
      try {
        const token = await getMyAtlasApiAccessToken()
        await verifyMyAtlasApiAccess({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
        })
        this.apiAccessVerified = true
      } catch (error) {
        this.auth.error = "The My Atlas API could not verify this session."
      }
    },
    async loadAccount() {
      if (!this.apiBaseUrl) return
      this.accountPending = true
      this.accountError = ""
      this.accountLoadFailed = false
      try {
        const token = await getMyAtlasApiAccessToken()
        const deletionKey = "rwj:my-atlas:account-deletion-operation:v1"
        let pendingDeletion = null
        try {
          pendingDeletion = JSON.parse(
            window.sessionStorage.getItem(deletionKey)
          )
        } catch {
          window.sessionStorage.removeItem(deletionKey)
        }
        if (
          pendingDeletion?.idempotencyKey &&
          Number.isSafeInteger(pendingDeletion.revision)
        ) {
          await deleteMyAtlasAccount({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            revision: pendingDeletion.revision,
            idempotencyKey: pendingDeletion.idempotencyKey,
          })
          window.sessionStorage.removeItem(deletionKey)
          this.handleAccountDeleted()
          logoutFromMyAtlas()
          return
        }
        const state = await fetchMyAtlasState({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
        })
        this.accountProfile = state.profile
        this.accountMissing = false
        this.pins = state.pins.map(pin => ({
          pinId: pin.pinId,
          placeId: pin.placeId,
          visitedDates: pin.visitedDates,
          visitedYears: pin.visitedYears,
          memory: pin.memory,
        }))
        if (!this.workflowSectionsInitialized) {
          this.addPlaceOpen = this.pins.length === 0
          this.visitedOpen = false
          this.sharingOpen = false
          this.workflowSectionsInitialized = true
        }
        state.pins.forEach(pin => {
          this.$set(this.loadedPlaces, pin.placeId, {
            placeId: pin.placeId,
            placeType: pin.placeType,
            name: pin.name,
            countryCode: pin.countryCode,
            admin1Name: pin.admin1Name,
            countryName: pin.countryName,
            continent: pin.continent,
            featureCode: pin.featureCode,
            spotCategory: pin.spotCategory,
            spotKind: pin.spotKind,
            coordinates: pin.coordinates,
            deprecated: false,
          })
        })
        this.$nextTick(() => this.showAccountTutorialIfNeeded())
      } catch (error) {
        if (error.status === 404) {
          this.accountMissing = true
        } else {
          this.accountLoadFailed = true
          this.accountError = this.accountLoadErrorMessage(error)
        }
      } finally {
        this.accountPending = false
      }
    },
    accountLoadErrorMessage(error) {
      const reference = error?.requestId
        ? ` Reference: ${error.requestId}.`
        : ""
      if (
        error?.status === 401 ||
        error?.error === "login_required" ||
        error?.code === "unauthorized"
      ) {
        return `Your Google sign in is present, but the API session needs to be renewed. Sign out, then sign in again.${reference}`
      }
      if (error?.status === 429 || error?.code === "rate_limited") {
        return `Your saved Atlas is busy. Wait about a minute, then retry.${reference}`
      }
      if (
        error?.status === 503 ||
        [
          "account_service_unavailable",
          "catalog_unavailable",
          "identity_provider_unavailable",
          "rate_limit_unavailable",
        ].includes(error?.code)
      ) {
        return `Your saved Atlas is temporarily unavailable. Retry in a moment.${reference}`
      }
      if (error?.code === "unavailable") {
        return `Your saved Atlas could not be reached. Check your connection and retry.${reference}`
      }
      return `Your saved Atlas could not be loaded. Retry without reloading the page.${reference}`
    },
    async registerAccount(registration) {
      this.registrationPending = true
      this.registrationError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        this.accountProfile = await registerMyAtlasAccount({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
          registration,
        })
        this.accountMissing = false
        this.pins = []
        this.selectedPlaceId = ""
        this.addPlaceOpen = true
        this.visitedOpen = false
        this.sharingOpen = false
        this.workflowSectionsInitialized = true
        this.announcement =
          "Your private Atlas account was created. Add your first destination."
        this.$nextTick(() => this.openTutorial("account"))
      } catch (error) {
        const messages = {
          invalid_registration:
            "Check the invitation code, handle, and required acceptance fields.",
          registration_verification_failed:
            "Human verification expired. Complete it again and retry.",
          registration_unavailable:
            "This invitation could not be used. Confirm that it is active and unused.",
        }
        this.registrationError =
          messages[error.code] ||
          "Your beta account could not be created. Please retry."
        this.$refs.registration?.resetTurnstile()
      } finally {
        this.registrationPending = false
      }
    },
    placeLabel(place) {
      if (place.placeType === "custom") return "Custom map pin"
      const label = formatPlaceLabel(place)
      if (place.placeType === "country") return place.countryName || place.name
      return label.replace(place.name + ", ", "")
    },
    closePinEditor() {
      this.pinEditorPlace = null
      this.pinEditorPin = null
      this.pinEditorError = ""
      this.pendingCustomPlace = null
    },
    openNewPin(place) {
      this.cancelCustomPlace()
      if (this.pins.some(pin => pin.placeId === place.placeId)) {
        this.accountError = "This destination is already in your Atlas."
        return
      }
      this.pinEditorPlace = place
      this.pinEditorPin = null
      this.pinEditorError = ""
    },
    beginCustomPlace() {
      if (!this.accountProfile) return
      this.closePinEditor()
      this.customPlaceOpen = true
      this.customPlaceCoordinates = null
      this.customPlaceError = ""
      const queryName = normalizeMyAtlasCustomPlaceName(this.query)
      this.customPlaceName = queryName || this.query.trim().slice(0, 160)
      this.announcement =
        "Custom pin placement is active. Choose a position on the map."
      this.$nextTick(() => this.$refs.customNameInput?.focus())
    },
    setCustomPlaceCoordinates(value) {
      if (!this.customPlaceOpen) return
      const coordinates = normalizeMyAtlasCustomCoordinates(value)
      if (!coordinates) {
        this.customPlaceError = "Choose a valid position on the map."
        return
      }
      this.customPlaceCoordinates = [...coordinates]
      this.customPlaceError = ""
      this.announcement = "Custom pin position selected."
    },
    focusMapForPlacement() {
      this.$refs.atlasMap?.$el?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    },
    cancelCustomPlace() {
      this.customPlaceOpen = false
      this.customPlaceName = ""
      this.customPlaceCoordinates = null
      this.customPlaceError = ""
      this.pendingCustomPlace = null
    },
    continueCustomPlace() {
      const customPlace = normalizeMyAtlasCustomPlace({
        name: this.customPlaceName,
        coordinates: this.customPlaceCoordinates,
      })
      if (!customPlace) {
        this.customPlaceError =
          "Enter a valid name and choose a position on the map."
        return
      }
      this.pendingCustomPlace = customPlace
      this.pinEditorPlace = {
        placeId: "custom:draft",
        placeType: "custom",
        name: customPlace.name,
        coordinates: [...customPlace.coordinates],
      }
      this.pinEditorPin = null
      this.pinEditorError = ""
      this.customPlaceOpen = false
      this.customPlaceError = ""
    },
    openExistingPin(place) {
      this.addPlaceOpen = true
      this.pinEditorPlace = place
      this.pinEditorPin = this.pins.find(pin => pin.placeId === place.placeId)
      this.pinEditorError = ""
    },
    async savePinDetails({ visitedDates, memory }) {
      if (this.pinEditorPin) {
        await this.updatePlaceDetails(this.pinEditorPin, visitedDates, memory)
      } else {
        await this.addPlace(this.pinEditorPlace, visitedDates, memory)
      }
    },
    async addPlace(place, visitedDates = [], memory = "") {
      if (this.accountProfile) {
        if (place.placeType === "custom" && !this.pendingCustomPlace) {
          this.pinEditorError =
            "This custom pin expired. Return to search and place it again."
          return
        }
        this.accountPending = true
        this.accountError = ""
        try {
          const token = await getMyAtlasApiAccessToken()
          const result = await createMyAtlasPin({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            ...(place.placeType === "custom" && this.pendingCustomPlace
              ? { customPlace: this.pendingCustomPlace }
              : { placeId: place.placeId }),
            visitedDates,
            memory,
            revision: this.accountProfile.revision,
          })
          this.pins = [...this.pins, result.pin]
          this.accountProfile = {
            ...this.accountProfile,
            revision: result.revision,
            pinCount: this.accountProfile.pinCount + 1,
          }
          this.$set(this.loadedPlaces, result.pin.placeId, {
            placeId: result.pin.placeId,
            placeType: result.pin.placeType,
            name: result.pin.name,
            countryCode: result.pin.countryCode,
            admin1Name: result.pin.admin1Name,
            countryName: result.pin.countryName,
            continent: result.pin.continent,
            featureCode: result.pin.featureCode,
            spotCategory: result.pin.spotCategory,
            spotKind: result.pin.spotKind,
            coordinates: result.pin.coordinates,
            deprecated: false,
          })
          this.selectedPlaceId = result.pin.placeId
          this.query = ""
          this.closePinEditor()
          this.addPlaceOpen = false
          this.visitedOpen = true
          this.announcement = result.pin.name + " was added to your map."
        } catch (error) {
          this.pinEditorError =
            error.code === "revision_conflict"
              ? "Your Atlas changed in another request. Reload and retry."
              : "This destination could not be added."
        } finally {
          this.accountPending = false
        }
        return
      }
      try {
        this.pins = addDraftPin(this.pins, place.placeId, this.runtimeCatalog)
        this.pins = this.pins.map(pin =>
          pin.placeId === place.placeId ? { ...pin, visitedDates, memory } : pin
        )
        this.selectedPlaceId = place.placeId
        this.query = ""
        this.closePinEditor()
        this.addPlaceOpen = false
        this.visitedOpen = true
        this.announcement = place.name + " was added to your map."
      } catch (error) {
        this.announcement = error.message
      }
    },
    async updatePlaceDetails(pin, visitedDates, memory) {
      if (!this.accountProfile) return
      this.accountPending = true
      this.pinEditorError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        const result = await updateMyAtlasPin({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
          pinId: pin.pinId,
          visitedDates,
          memory,
          revision: this.accountProfile.revision,
        })
        this.pins = this.pins.map(candidate =>
          candidate.pinId === pin.pinId
            ? { ...candidate, ...result.pin }
            : candidate
        )
        this.accountProfile = {
          ...this.accountProfile,
          revision: result.revision,
        }
        this.closePinEditor()
        this.announcement = "Destination details were updated."
      } catch (error) {
        this.pinEditorError = "These destination details could not be saved."
      } finally {
        this.accountPending = false
      }
    },
    async removePlace(place) {
      if (this.accountProfile) {
        const pin = this.pins.find(item => item.placeId === place.placeId)
        if (!pin) return
        this.accountPending = true
        this.accountError = ""
        try {
          const token = await getMyAtlasApiAccessToken()
          const revision = await deleteMyAtlasPin({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            pinId: pin.pinId,
            revision: this.accountProfile.revision,
          })
          this.pins = this.pins.filter(item => item.pinId !== pin.pinId)
          this.accountProfile = {
            ...this.accountProfile,
            revision,
            pinCount: Math.max(0, this.accountProfile.pinCount - 1),
            public: this.pins.length > 0 && this.accountProfile.public,
          }
          if (this.selectedPlaceId === place.placeId) {
            this.selectedPlaceId = ""
          }
          if (this.pinEditorPin?.pinId === pin.pinId) this.closePinEditor()
          if (place.placeType === "custom") {
            this.$delete(this.loadedPlaces, place.placeId)
          }
          this.announcement = place.name + " was removed from your map."
        } catch (error) {
          this.accountError = "This place could not be removed from your Atlas."
        } finally {
          this.accountPending = false
        }
        return
      }
      this.pins = removeDraftPin(this.pins, place.placeId)
      if (this.selectedPlaceId === place.placeId) this.selectedPlaceId = ""
      this.announcement = place.name + " was removed from your map."
    },
    selectPin(placeId) {
      if (this.timelinePlaying) this.pauseTimeline()
      this.selectedPlaceId = placeId
      const place = this.displayedPlaces.find(item => item.placeId === placeId)
      this.announcement = place?.memory
        ? `${place.name}. Favorite memory is visible on the map.`
        : `${place?.name || "Destination"} selected.`
    },
    cyclePin(direction) {
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
    handleKeyboardNavigation(event) {
      if (this.tutorialOpen) return
      const tag = event.target?.tagName?.toLowerCase()
      if (["input", "select", "textarea", "button"].includes(tag)) return
      if (event.key === "ArrowLeft") this.cyclePin(-1)
      if (event.key === "ArrowRight") this.cyclePin(1)
    },
    openTutorial(variant = "preview") {
      this.tutorialVariant = variant === "account" ? "account" : "preview"
      this.tutorialOpen = true
    },
    closeTutorial() {
      if (this.tutorialVariant === "account") {
        this.markAccountTutorialSeen()
      }
      this.tutorialOpen = false
    },
    completeTutorial() {
      const variant = this.tutorialVariant
      this.closeTutorial()
      if (variant === "account") this.addPlaceOpen = true
      this.$nextTick(() => {
        if (variant === "account") {
          this.$refs.searchInput?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
          this.$refs.searchInput?.focus()
          return
        }
        const registration = this.$refs.registration?.$el
        const target = registration || this.$refs.authSection
        target?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (!this.auth.authenticated) this.$refs.signInButton?.focus()
      })
    },
    accountTutorialStorageKey() {
      return this.accountProfile?.handle
        ? `${ACCOUNT_TUTORIAL_STORAGE_PREFIX}${this.accountProfile.handle}`
        : ""
    },
    accountTutorialSeen() {
      const key = this.accountTutorialStorageKey()
      if (!key) return false
      try {
        return window.localStorage.getItem(key) === "seen"
      } catch (error) {
        return false
      }
    },
    markAccountTutorialSeen() {
      const key = this.accountTutorialStorageKey()
      if (!key) return
      try {
        window.localStorage.setItem(key, "seen")
      } catch (error) {
        // Storage can be unavailable in strict privacy modes.
      }
    },
    showAccountTutorialIfNeeded() {
      if (
        !this.accountProfile ||
        this.accountProfile.revision !== 1 ||
        Number(this.accountProfile.pinCount || 0) !== 0 ||
        this.pins.length ||
        this.accountTutorialSeen()
      ) {
        return
      }
      this.openTutorial("account")
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
      this.announcement = `${entry.place.name}, ${entry.year}`
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
    exportStory() {
      downloadMyAtlasStory({
        displayName: this.accountProfile?.displayName || this.authDisplayName,
        filterLabel: this.filterLabel,
        handle: this.accountProfile?.handle || "",
        places: this.displayedPlaces,
        stats: this.visibleStats,
      })
      this.announcement = "Your Instagram Story image was created."
    },
    formatVisitedDates,
    placeTypeLabel: formatPlaceTypeLabel,
    async toggleSharing() {
      this.accountPending = true
      this.accountError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        this.accountProfile = await updateMyAtlasSharing({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
          public: !this.accountProfile.public,
          revision: this.accountProfile.revision,
        })
        this.announcement = this.accountProfile.public
          ? "Your Atlas is now available through your share link."
          : "Your Atlas is private."
      } catch (error) {
        this.accountError = "Your sharing setting could not be changed."
      } finally {
        this.accountPending = false
      }
    },
    async copyShareLink() {
      try {
        await navigator.clipboard.writeText(this.shareUrl)
        this.announcement = "Your Atlas link was copied."
      } catch (error) {
        this.announcement = "Copy the visible Atlas link to share it."
      }
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

.my-atlas-intro > p:first-child {
  margin: 0 0 0.35rem;
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 700;
}

.my-atlas-overview {
  display: grid;
  gap: 0.8rem;
  margin: 0 0 1.25rem;
  padding: 0.9rem;
  border: 1px solid rgba(230, 186, 104, 0.2);
  border-radius: 1rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(230, 186, 104, 0.12),
      transparent 42%
    ),
    rgba(255, 255, 255, 0.035);
}

.my-atlas-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.my-atlas-stats > div {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  padding: 0.55rem 0.35rem;
  border-radius: 0.7rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.055);
}

.my-atlas-stats strong {
  color: #f0c978;
  font-size: 1.15rem;
}

.my-atlas-stats span {
  overflow: hidden;
  color: #91a49e;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.5rem;
}

.my-atlas-view-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.45rem;
}

.my-atlas-controls-drawer {
  display: grid;
  gap: 0.6rem;
}

.my-atlas-mobile-controls-toggle {
  display: none;
}

.my-atlas-view-controls label {
  display: grid;
  flex: 1 1 10rem;
  gap: 0.2rem;
  color: #93a69f;
  font-size: 0.62rem;
}

.my-atlas-view-controls select,
.my-atlas-view-controls button,
.my-atlas-selected button {
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(230, 186, 104, 0.4);
  border-radius: 0.65rem;
  color: #f7e6bf;
  background: rgba(230, 186, 104, 0.07);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-view-controls select {
  display: block;
  color: #edf7f2;
  background: #111f22;
}

.my-atlas-timeline-year {
  display: grid;
  gap: 0.12rem;
  margin: 0;
  color: #f0c978;
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 1.25rem;
}

.my-atlas-timeline-year span {
  color: #94a79f;
  font-family: "Poppins", sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-connections-note {
  margin: 0;
  color: #7f938c;
  font-size: 0.6rem;
}

.my-atlas-selected {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.my-atlas-selected > div {
  display: grid;
  min-width: 0;
  text-align: center;
}

.my-atlas-selected strong {
  overflow: hidden;
  color: #f4fbf7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-atlas-selected span,
.my-atlas-selected small {
  overflow: hidden;
  color: #91a49e;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
}

.my-atlas-selected small {
  color: #d9bd80;
}

.my-atlas-selected blockquote {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-left: 2px solid rgba(230, 186, 104, 0.55);
  color: #dce9e4;
  background: rgba(230, 186, 104, 0.06);
  font-size: 0.68rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-intro h1 {
  max-width: 10em;
  margin: 0;
  font-family: "Poppins", system-ui, sans-serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 0.98;
  text-wrap: balance;
}

.my-atlas-intro-copy {
  margin: 1rem 0 0;
  color: #b2c2bd;
  font-size: 0.88rem;
  line-height: 1.55;
}

.my-atlas-intro-actions {
  display: flex;
  margin-top: 1rem;
}

.my-atlas-intro-actions button {
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(230, 186, 104, 0.5);
  border-radius: 999px;
  color: #f7e6bf;
  background: rgba(230, 186, 104, 0.08);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-intro-actions button:hover,
.my-atlas-intro-actions button:focus-visible {
  border-color: #e6ba68;
  background: rgba(230, 186, 104, 0.14);
  outline: none;
}

.my-atlas-search {
  display: grid;
  gap: 0.4rem;
}

.my-atlas-auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  margin: 0 0 1.25rem;
  padding: 0.72rem 0.8rem;
  border: 1px solid rgba(230, 186, 104, 0.24);
  border-radius: 1rem;
  background: rgba(230, 186, 104, 0.06);
}

.my-atlas-auth:focus {
  outline: 2px solid rgba(230, 186, 104, 0.45);
  outline-offset: 0.18rem;
}

.my-atlas-auth > div:first-child {
  display: grid;
  gap: 0.25rem;
}

.my-atlas-auth p,
.my-atlas-auth span {
  margin: 0;
  color: #9eb0aa;
  font-size: 0.7rem;
  line-height: 1.45;
}

.my-atlas-auth #my-atlas-auth-title,
.my-atlas-auth strong {
  color: #edf7f2;
  font-size: 0.78rem;
}

.my-atlas-auth-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.my-atlas-auth-actions button {
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(230, 186, 104, 0.45);
  border-radius: 0.7rem;
  color: #132023;
  background: #e6ba68;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-auth-actions button:last-child:not(:first-child) {
  color: #edf7f2;
  background: transparent;
}

.my-atlas-auth .my-atlas-auth-error {
  grid-column: 1 / -1;
  color: #e6a8a1;
}

.my-atlas-auth .my-atlas-auth-success {
  grid-column: 1 / -1;
  color: #9bd3b0;
}

.my-atlas-workflow-section {
  margin-top: 0.8rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.025);
}

.my-atlas-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  box-sizing: border-box;
  width: 100%;
  min-height: 3.75rem;
  padding: 0.72rem 0.8rem;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.my-atlas-section-toggle > span {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.my-atlas-section-toggle strong {
  color: #edf7f2;
  font-size: 0.74rem;
}

.my-atlas-section-toggle small {
  overflow: hidden;
  color: #8fa29c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.58rem;
}

.my-atlas-section-toggle b {
  flex: 0 0 auto;
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(230, 186, 104, 0.34);
  border-radius: 999px;
  color: #efc975;
  background: rgba(230, 186, 104, 0.07);
  font-size: 0.6rem;
  white-space: nowrap;
}

.my-atlas-section-toggle:hover,
.my-atlas-section-toggle:focus-visible {
  background: rgba(230, 186, 104, 0.055);
  outline: none;
}

.my-atlas-section-toggle:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(230, 186, 104, 0.55);
}

.my-atlas-section-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.my-atlas-section-content {
  display: grid;
  gap: 0.75rem;
  padding: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
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

.my-atlas-custom-place {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.7rem;
}

.my-atlas-custom-place.is-open {
  padding: 0.9rem;
  border: 1px solid rgba(230, 186, 104, 0.34);
  border-radius: 0.95rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(230, 186, 104, 0.12),
      transparent 45%
    ),
    rgba(255, 255, 255, 0.035);
}

.my-atlas-custom-place-trigger,
.my-atlas-custom-place-continue,
.my-atlas-custom-place-heading button {
  border: 1px solid rgba(230, 186, 104, 0.45);
  border-radius: 0.72rem;
  color: #f5d999;
  background: rgba(230, 186, 104, 0.07);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-custom-place-trigger {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-style: dashed;
  text-align: left;
}

.my-atlas-custom-place-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.my-atlas-custom-place-heading > div {
  display: grid;
  gap: 0.15rem;
}

.my-atlas-custom-place-heading p,
.my-atlas-custom-place-heading span,
.my-atlas-custom-place-disclosure,
.my-atlas-custom-place-error {
  margin: 0;
}

.my-atlas-custom-place-heading p {
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.65rem;
  font-weight: 800;
}

.my-atlas-custom-place-heading span,
.my-atlas-custom-place-disclosure {
  color: #94a7a0;
  font-size: 0.64rem;
  line-height: 1.45;
}

.my-atlas-custom-place-heading button {
  padding: 0.42rem 0.55rem;
  color: #d9b96f;
  background: transparent;
}

.my-atlas-custom-place > label {
  display: grid;
  gap: 0.3rem;
  color: #edf7f2;
  font-size: 0.7rem;
  font-weight: 700;
}

.my-atlas-custom-place > label input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.72rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.72rem;
  color: #fff;
  background: rgba(5, 14, 16, 0.68);
  font: inherit;
  font-weight: 400;
}

.my-atlas-custom-place > label input:focus {
  border-color: #e6ba68;
  outline: 2px solid rgba(230, 186, 104, 0.18);
}

.my-atlas-custom-place > label small {
  justify-self: end;
  color: #7f938c;
  font-size: 0.58rem;
  font-weight: 400;
}

.my-atlas-custom-place > label small.is-error {
  color: #e6a8a1;
}

.my-atlas-custom-place-position {
  display: grid;
  gap: 0.15rem;
  padding: 0.65rem 0.7rem;
  border-left: 3px solid #e6ba68;
  border-radius: 0.25rem 0.65rem 0.65rem 0.25rem;
  background: rgba(230, 186, 104, 0.07);
}

.my-atlas-custom-place-position strong {
  color: #f3d28b;
  font-size: 0.66rem;
}

.my-atlas-custom-place-position span {
  color: #a7b9b3;
  font-size: 0.62rem;
  line-height: 1.45;
}

.my-atlas-custom-place-position button {
  justify-self: start;
  margin-top: 0.35rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid rgba(230, 186, 104, 0.48);
  border-radius: 0.6rem;
  color: #f3d28b;
  background: rgba(230, 186, 104, 0.08);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-custom-place-error {
  color: #e6a8a1;
  font-size: 0.65rem;
}

.my-atlas-custom-place-continue {
  justify-self: start;
  padding: 0.62rem 0.78rem;
  color: #132023;
  background: #e6ba68;
}

.my-atlas-custom-place button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.my-atlas-search small,
.my-atlas-search-state {
  color: #8ea29c;
  font-size: 0.7rem;
}

.my-atlas-search-state {
  padding: 0.8rem 0;
}

.my-atlas-search-state.is-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  color: #e6a8a1;
}

.my-atlas-search-state.is-error button {
  padding: 0.4rem 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.5);
  border-radius: 999px;
  color: #f4cf83;
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-results,
.my-atlas-pins ul {
  display: grid;
  gap: 0.45rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.my-atlas-pins ul {
  max-height: min(52rem, 65vh);
  padding-right: 0.2rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: rgba(230, 186, 104, 0.4) transparent;
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

.my-atlas-results button:disabled,
.my-atlas-pins button:disabled,
.my-atlas-sharing button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.my-atlas-results span,
.my-atlas-pins li span {
  font-weight: 700;
}

.my-atlas-results small,
.my-atlas-pins li small {
  grid-column: 1;
  color: #9eb0aa;
  font-size: 0.7rem;
}

.my-atlas-pins em {
  grid-column: 1;
  margin-top: 0.15rem;
  color: #d3b879;
  font-size: 0.62rem;
  font-style: normal;
}

.my-atlas-pins q {
  grid-column: 1;
  max-width: 36ch;
  margin-top: 0.2rem;
  overflow: hidden;
  color: #b9c9c4;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  quotes: none;
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
  margin-top: 0.8rem;
}

.my-atlas-empty {
  margin: 0.7rem 0 0;
  color: #8ea29c;
  font-size: 0.76rem;
}

.my-atlas-sharing {
  margin-top: 0.8rem;
}

.my-atlas-sharing p,
.my-atlas-sharing a {
  margin: 0;
  color: #9eb0aa;
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-sharing a {
  color: #e6ba68;
}

.my-atlas-sharing-content {
  gap: 0.75rem;
}

.my-atlas-sharing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.my-atlas-sharing-actions button {
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(230, 186, 104, 0.45);
  border-radius: 0.7rem;
  color: #132023;
  background: #e6ba68;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
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

.my-atlas-pins .edit {
  padding: 0.45rem;
  border: 0;
  color: #e6ba68;
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

.my-atlas-brand {
  margin: 1rem 0 0;
  color: #e6ba68;
  font-size: 0.68rem;
  font-weight: 700;
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
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: visible;
  }

  .my-atlas-proof > :first-child {
    position: relative;
  }

  .my-atlas-panel {
    min-width: 0;
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

  .my-atlas-intro {
    margin: 1.2rem 0 1rem;
  }

  .my-atlas-overview {
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .my-atlas-mobile-controls-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.7rem 0.75rem;
    border: 1px solid rgba(230, 186, 104, 0.32);
    border-radius: 0.75rem;
    color: #edf7f2;
    background: rgba(230, 186, 104, 0.07);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .my-atlas-mobile-controls-toggle strong {
    color: #e6ba68;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.56rem;
  }

  .my-atlas-controls-drawer {
    display: none;
    padding: 0.1rem 0.1rem 0;
  }

  .my-atlas-controls-drawer.is-open {
    display: grid;
  }

  .my-atlas-view-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .my-atlas-view-controls label {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .my-atlas-view-controls select {
    width: 100%;
  }

  .my-atlas-view-controls button {
    width: 100%;
  }

  .my-atlas-selected {
    position: sticky;
    bottom: 0.5rem;
    z-index: 2;
    padding: 0.7rem;
    border: 1px solid rgba(230, 186, 104, 0.24);
    border-radius: 0.9rem;
    background: rgba(8, 20, 22, 0.96);
    box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.35);
  }
}

@media (max-width: 480px) {
  .my-atlas-auth {
    grid-template-columns: 1fr;
  }

  .my-atlas-auth-actions {
    justify-content: flex-start;
  }
}
</style>
