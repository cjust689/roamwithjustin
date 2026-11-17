<template>
  <main class="my-atlas-proof">
    <MyAtlasMap
      :places="displayedPlaces"
      :selected-place-id="selectedPlaceId"
      :show-connections="showConnections"
      :playback-active="timelinePlaying"
      @select="selectPin"
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
          Search countries and cities, then place them on your map.
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
            <strong>{{ visibleStats.capitals }}</strong>
            <span>Capitals</span>
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
            <span v-if="accountProfile">
              Your private beta account is connected.
            </span>
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
            <button type="button" @click="verifyApiAccess">
              Verify API access
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

      <label class="my-atlas-search">
        <span>Find a country or city</span>
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Try Uvita or Paris"
          aria-describedby="my-atlas-search-help"
        />
        <small id="my-atlas-search-help">
          {{ searchHelp }}
        </small>
      </label>

      <MyAtlasPinEditor
        v-if="pinEditorPlace"
        :key="pinEditorKey"
        :place="pinEditorPlace"
        :place-label="placeLabel(pinEditorPlace)"
        :pin="pinEditorPin"
        :pending="accountPending"
        :error="pinEditorError"
        @cancel="closePinEditor"
        @save="savePinDates"
      />

      <div v-if="searchPending" class="my-atlas-search-state" role="status">
        Searching places
      </div>
      <div
        v-else-if="searchError"
        class="my-atlas-search-state is-error"
        role="alert"
      >
        {{ searchError }}
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
          <button
            type="button"
            :disabled="accountPending"
            @click="openNewPin(place)"
          >
            <span>{{ place.name }}</span>
            <small>{{ placeLabel(place) }}</small>
            <b>{{ place.placeType }}</b>
          </button>
        </li>
      </ul>

      <section class="my-atlas-pins" aria-labelledby="my-atlas-pins-title">
        <div>
          <p>Your destinations</p>
          <strong id="my-atlas-pins-title">{{ displayedPlaces.length }}</strong>
        </div>
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
            </button>
            <button
              class="edit"
              type="button"
              :disabled="accountPending"
              :aria-label="'Edit visit dates for ' + place.name"
              @click="openExistingPin(place)"
            >
              Dates
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
      </section>

      <section
        v-if="accountProfile"
        class="my-atlas-sharing"
        aria-labelledby="my-atlas-sharing-title"
      >
        <div>
          <p id="my-atlas-sharing-title">Share your Atlas</p>
          <strong>{{ accountProfile.public ? "Public" : "Private" }}</strong>
        </div>
        <p>
          Publishing makes your marked places and optional visit dates available
          to anyone with your link.
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
        under CC BY 4.0. Map rendering uses MapLibre and the configured tile
        provider.
      </p>
      <p class="my-atlas-brand">My Atlas by RoamWithJustin.com</p>
      <p class="my-atlas-announcement" aria-live="polite">{{ announcement }}</p>
    </section>
  </main>
</template>

<script>
import MyAtlasMap from "../components/MyAtlasMap.vue"
import MyAtlasPinEditor from "../components/MyAtlasPinEditor.vue"
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
import { addDraftPin, removeDraftPin } from "../catalog/pinDraft.mjs"
import { searchMyAtlasPlaces } from "../catalog/placeSearchClient.mjs"
import {
  createMyAtlasPin,
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
      yearFilter: "all",
      timelineIndex: -1,
      timelinePlaying: false,
      timelineTimer: null,
      showConnections: true,
      mobileControlsOpen: false,
      announcement: "",
      auth: myAtlasAuthState,
      apiAccessVerified: false,
      accountProfile: null,
      accountMissing: false,
      accountPending: false,
      accountError: "",
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
      window.clearTimeout(this.searchTimer)
      if (this.searchAbortController) this.searchAbortController.abort()
      this.searchResults = []
      this.searchError = ""
      if (value.trim().length < 2) {
        this.searchPending = false
        return
      }
      this.searchPending = true
      const request = ++this.searchRequest
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
          this.searchError = "Place search is temporarily unavailable."
        } finally {
          if (request === this.searchRequest) this.searchPending = false
        }
      }, 180)
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
      try {
        const token = await getMyAtlasApiAccessToken()
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
        }))
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
            coordinates: pin.coordinates,
            deprecated: false,
          })
        })
        this.$nextTick(() => this.showAccountTutorialIfNeeded())
      } catch (error) {
        if (error.status === 404) {
          this.accountMissing = true
        } else {
          this.accountError = "Your saved Atlas could not be loaded."
        }
      } finally {
        this.accountPending = false
      }
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
      const label = formatPlaceLabel(place)
      if (place.placeType === "country") return place.countryName || place.name
      return label.replace(place.name + ", ", "")
    },
    closePinEditor() {
      this.pinEditorPlace = null
      this.pinEditorPin = null
      this.pinEditorError = ""
    },
    openNewPin(place) {
      if (this.pins.some(pin => pin.placeId === place.placeId)) {
        this.accountError = "This destination is already in your Atlas."
        return
      }
      this.pinEditorPlace = place
      this.pinEditorPin = null
      this.pinEditorError = ""
    },
    openExistingPin(place) {
      this.pinEditorPlace = place
      this.pinEditorPin = this.pins.find(pin => pin.placeId === place.placeId)
      this.pinEditorError = ""
    },
    async savePinDates(visitedDates) {
      if (this.pinEditorPin) {
        await this.updatePlaceDates(this.pinEditorPin, visitedDates)
      } else {
        await this.addPlace(this.pinEditorPlace, visitedDates)
      }
    },
    async addPlace(place, visitedDates = []) {
      if (this.accountProfile) {
        this.accountPending = true
        this.accountError = ""
        try {
          const token = await getMyAtlasApiAccessToken()
          const result = await createMyAtlasPin({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            placeId: place.placeId,
            visitedDates,
            revision: this.accountProfile.revision,
          })
          this.pins = [...this.pins, result.pin]
          this.accountProfile = {
            ...this.accountProfile,
            revision: result.revision,
            pinCount: this.accountProfile.pinCount + 1,
          }
          this.$set(this.loadedPlaces, place.placeId, place)
          this.selectedPlaceId = place.placeId
          this.query = ""
          this.closePinEditor()
          this.announcement = place.name + " was added to your map."
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
          pin.placeId === place.placeId ? { ...pin, visitedDates } : pin
        )
        this.selectedPlaceId = place.placeId
        this.query = ""
        this.closePinEditor()
        this.announcement = place.name + " was added to your map."
      } catch (error) {
        this.announcement = error.message
      }
    },
    async updatePlaceDates(pin, visitedDates) {
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
        this.announcement = "Visit dates were updated."
      } catch (error) {
        this.pinEditorError = "These visit dates could not be saved."
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

.my-atlas-intro > p:first-child,
.my-atlas-pins > div p {
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
  font-family: "Russo One", sans-serif;
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

.my-atlas-intro h1 {
  max-width: 10em;
  margin: 0;
  font-family: "Russo One", sans-serif;
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
  gap: 0.7rem;
  margin: 0 0 1.25rem;
  padding: 0.9rem;
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
  color: #e6a8a1;
}

.my-atlas-auth .my-atlas-auth-success {
  color: #9bd3b0;
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

.my-atlas-search-state.is-error {
  color: #e6a8a1;
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

.my-atlas-results button:disabled,
.my-atlas-pins button:disabled,
.my-atlas-sharing button:disabled {
  cursor: wait;
  opacity: 0.55;
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

.my-atlas-pins em {
  grid-column: 1;
  margin-top: 0.15rem;
  color: #d3b879;
  font-size: 0.62rem;
  font-style: normal;
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

.my-atlas-sharing {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.3rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.my-atlas-sharing > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.my-atlas-sharing p,
.my-atlas-sharing a {
  margin: 0;
  color: #9eb0aa;
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-sharing > div:first-child p,
.my-atlas-sharing > div:first-child strong,
.my-atlas-sharing a {
  color: #e6ba68;
}

.my-atlas-sharing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.my-atlas-sharing button {
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
</style>
