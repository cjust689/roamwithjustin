<template>
  <section
    class="my-atlas-planner"
    aria-labelledby="my-atlas-planner-title"
    :aria-busy="String(pending)"
  >
    <button
      type="button"
      class="planner-heading"
      aria-controls="my-atlas-planner-content"
      :aria-expanded="String(open)"
      @click="toggleOpen"
    >
      <span>
        <small>Private trip planning beta</small>
        <strong id="my-atlas-planner-title">Plan future travel</strong>
      </span>
      <b>{{ open ? "Hide" : "Plan a trip" }}</b>
    </button>

    <div v-if="open" id="my-atlas-planner-content" class="planner-content">
      <p class="planner-disclosure">
        Future destinations stay private and never appear in your shared Visited
        Atlas. Saved trips require an explicit keep or edit every six months,
        followed by a 30 day deletion grace period.
      </p>
      <p v-if="error" class="planner-error" role="alert">{{ error }}</p>
      <p v-if="pending" class="planner-status" role="status">
        Updating your private planner
      </p>

      <section class="planner-block" aria-labelledby="bucket-list-title">
        <div class="planner-block-heading">
          <div>
            <p id="bucket-list-title">Want to go</p>
            <span>{{ wishes.length }} of 250 saved</span>
          </div>
          <button type="button" :disabled="pending" @click="loadPlanning">
            Refresh
          </button>
        </div>

        <label class="planner-place-search">
          <span>Find a country, city, or spot for this trip</span>
          <input
            v-model="wishQuery"
            type="search"
            autocomplete="off"
            placeholder="Try Uvita, Yellowstone, or Eiffel Tower"
            aria-describedby="planner-place-search-help"
          />
          <small id="planner-place-search-help">
            Search the My Atlas catalog. Coordinates appear before you save a
            destination.
          </small>
        </label>

        <div
          v-if="wishSearchPending"
          class="planner-search-state"
          role="status"
        >
          Searching My Atlas places
        </div>
        <div
          v-else-if="wishSearchError"
          class="planner-search-state is-error"
          role="alert"
        >
          <span>{{ wishSearchError }}</span>
          <button type="button" @click="retryWishSearch">Retry search</button>
        </div>
        <p
          v-else-if="wishQuery.trim().length >= 2 && !wishSearchResults.length"
          class="planner-search-state"
          role="status"
        >
          No matching country, city, or spot in this catalog.
        </p>
        <div v-if="wishSearchResults.length" class="planner-search-results">
          <span>My Atlas search results</span>
          <ul>
            <li v-for="place in wishSearchResults" :key="place.placeId">
              <article>
                <span class="planner-search-result-copy">
                  <strong>{{ place.name }}</strong>
                  <small>{{ locationContext(place) }}</small>
                  <small>{{ coordinateLabel(place) }}</small>
                </span>
                <b>{{ placeTypeLabel(place) }}</b>
                <div class="planner-search-actions">
                  <button
                    type="button"
                    :disabled="pending || wishPlaceIds.has(place.placeId)"
                    @click="saveCatalogWish(place)"
                  >
                    {{ wishPlaceIds.has(place.placeId) ? "Saved" : "Save" }}
                  </button>
                  <button
                    type="button"
                    :disabled="!planStateAvailable"
                    @click="usePlanLocation('start', place)"
                  >
                    Use as start
                  </button>
                  <button
                    type="button"
                    :disabled="!planStateAvailable"
                    @click="usePlanLocation('end', place)"
                  >
                    Use as finish
                  </button>
                </div>
              </article>
            </li>
          </ul>
        </div>

        <div
          v-if="planForm.startDirect || planForm.endDirect"
          class="planner-search-selections"
          role="status"
        >
          <p v-if="planForm.startDirect">
            <span>Selected start</span>
            <strong>{{ planForm.startDirect.name }}</strong>
          </p>
          <p v-if="planForm.endDirect">
            <span>Selected finish</span>
            <strong>{{ planForm.endDirect.name }}</strong>
          </p>
          <small>
            These selections are ready in the saved trip form below. Save at
            least one destination to build the ordered route.
          </small>
        </div>

        <details class="planner-custom">
          <summary>Can't find it? Add your own coordinates</summary>
          <div>
            <label>
              <span>Name</span>
              <input v-model.trim="customName" maxlength="80" type="text" />
            </label>
            <label>
              <span>Longitude</span>
              <input
                v-model="customLongitude"
                type="number"
                min="-180"
                max="180"
                step="0.000001"
              />
            </label>
            <label>
              <span>Latitude</span>
              <input
                v-model="customLatitude"
                type="number"
                min="-85.051129"
                max="85.051129"
                step="0.000001"
              />
            </label>
            <div class="planner-custom-actions">
              <button type="button" :disabled="pending" @click="saveCustomWish">
                Save private location
              </button>
              <button
                type="button"
                :disabled="!planStateAvailable"
                @click="useCustomPlanLocation('start')"
              >
                Use as start
              </button>
              <button
                type="button"
                :disabled="!planStateAvailable"
                @click="useCustomPlanLocation('end')"
              >
                Use as finish
              </button>
            </div>
          </div>
          <p>
            You supply this name and position. Confirm road access before using
            it for directions.
          </p>
        </details>

        <p v-if="!wishes.length" class="planner-empty">
          Search My Atlas or save your own coordinates to begin.
        </p>
        <ul v-else class="planner-wishes">
          <li v-for="wish in wishes" :key="wish.wishId">
            <div>
              <strong>{{ wish.name }}</strong>
              <span>{{ locationContext(wish) }}</span>
              <span>{{ coordinateLabel(wish) }}</span>
              <small>{{ routeReadinessLabel(wish) }}</small>
            </div>
            <label>
              <span>Priority</span>
              <select v-model="wishDrafts[wish.wishId].priority">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <input
                v-model="wishDrafts[wish.wishId].desiredYear"
                type="number"
                :min="currentYear"
                :max="currentYear + 20"
                placeholder="Optional"
              />
            </label>
            <label class="planner-note">
              <span>Private note</span>
              <input
                v-model.trim="wishDrafts[wish.wishId].note"
                type="text"
                maxlength="255"
                placeholder="Optional"
              />
            </label>
            <div class="planner-row-actions">
              <button type="button" :disabled="pending" @click="saveWish(wish)">
                Save details
              </button>
              <button
                type="button"
                :disabled="pending"
                @click="removeWish(wish)"
              >
                Remove
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="planner-block" aria-labelledby="trip-plan-title">
        <div class="planner-block-heading">
          <div>
            <p id="trip-plan-title">Saved trip</p>
            <span>One plan with an ordered destination list</span>
          </div>
        </div>

        <p v-if="planLoadError" class="planner-error" role="alert">
          {{ planLoadError }}
        </p>

        <div
          v-if="
            planStateAvailable &&
            plan &&
            plan.retentionState === 'deletion-pending'
          "
          class="planner-retention"
          role="status"
        >
          <strong>This trip is marked for deletion.</strong>
          <span
            >Keep it by {{ formatDeadline(plan.deleteAfter) }}, or delete it
            now.</span
          >
          <button type="button" :disabled="pending" @click="keepPlan">
            Keep for another six months
          </button>
        </div>

        <div v-if="planStateAvailable" class="planner-plan-editor">
          <label>
            <span>Trip title</span>
            <input v-model.trim="planForm.title" maxlength="80" type="text" />
          </label>
          <label>
            <span>Start from a saved destination</span>
            <select v-model="planForm.startWishId" @change="selectSavedStart">
              <option value="" disabled>Choose a saved destination</option>
              <option
                v-for="wish in wishes"
                :key="wish.wishId"
                :value="wish.wishId"
                :disabled="wish.unavailable"
              >
                {{ wishSelectionLabel(wish) }}
              </option>
            </select>
          </label>
          <div v-if="planForm.startDirect" class="planner-direct-location">
            <span>Direct start</span>
            <strong>{{ planForm.startDirect.name }}</strong>
            <small>{{ locationContext(planForm.startDirect) }}</small>
            <small>{{ coordinateLabel(planForm.startDirect) }}</small>
            <button type="button" @click="clearDirectLocation('start')">
              Use a saved start instead
            </button>
          </div>
          <label>
            <span>Optional travel year</span>
            <input
              v-model="planForm.desiredYear"
              type="number"
              :min="currentYear"
              :max="currentYear + 20"
              placeholder="Optional"
            />
          </label>
          <label>
            <span>Finish</span>
            <select v-model="planForm.endMode">
              <option value="last-stop">Finish at last destination</option>
              <option value="return-to-start">Return to start</option>
              <option value="selected-end">Finish at a selected place</option>
            </select>
          </label>
          <div
            v-if="planForm.endMode === 'selected-end'"
            class="planner-direct-location"
          >
            <template v-if="planForm.endDirect">
              <span>Selected finish</span>
              <strong>{{ planForm.endDirect.name }}</strong>
              <small>{{ locationContext(planForm.endDirect) }}</small>
              <small>{{ coordinateLabel(planForm.endDirect) }}</small>
              <button type="button" @click="clearDirectLocation('end')">
                Choose a different finish
              </button>
            </template>
            <p v-else>
              Choose Use as finish from a My Atlas search result or enter custom
              coordinates above.
            </p>
          </div>
          <label class="planner-note">
            <span>Private plan note</span>
            <input
              v-model.trim="planForm.note"
              maxlength="255"
              type="text"
              placeholder="Optional"
            />
          </label>

          <fieldset>
            <legend>Destinations in chosen order</legend>
            <p v-if="!wishes.length" class="planner-empty">
              Save at least one search result above, then select it here as a
              destination.
            </p>
            <label v-for="wish in wishes" :key="wish.wishId">
              <input
                type="checkbox"
                :checked="planForm.stopWishIds.includes(wish.wishId)"
                :disabled="
                  wish.unavailable ||
                  (!planForm.stopWishIds.includes(wish.wishId) &&
                    planForm.stopWishIds.length >= maxPlanDestinations)
                "
                @change="togglePlanStop(wish.wishId)"
              />
              <span>{{ wishSelectionLabel(wish) }}</span>
            </label>
          </fieldset>
          <ol class="planner-stop-order">
            <li v-for="(wishId, index) in planForm.stopWishIds" :key="wishId">
              <span>{{ wishById(wishId).name }}</span>
              <button
                type="button"
                :disabled="index === 0"
                :aria-label="`Move ${wishById(wishId).name} earlier`"
                @click="moveStop(index, -1)"
              >
                Up
              </button>
              <button
                type="button"
                :disabled="index === planForm.stopWishIds.length - 1"
                :aria-label="`Move ${wishById(wishId).name} later`"
                @click="moveStop(index, 1)"
              >
                Down
              </button>
            </li>
          </ol>
          <div class="planner-row-actions">
            <button type="button" :disabled="pending" @click="savePlan">
              {{ plan ? "Update saved trip" : "Save trip" }}
            </button>
            <button
              v-if="plan"
              type="button"
              :disabled="pending"
              @click="removePlan"
            >
              Delete trip
            </button>
          </div>
        </div>

        <details v-if="plan" class="planner-mark-visited">
          <summary>Mark trip stops visited</summary>
          <p>
            Choose only the destinations you actually visited. Your bucket list
            and saved trip remain unchanged.
          </p>
          <p v-if="profilePublic" class="planner-public-warning">
            Your Atlas is public. Confirmed stops and their optional dates and
            memories will appear on it immediately.
          </p>
          <fieldset>
            <legend>Visited stops</legend>
            <div
              v-for="candidate in visitCandidates"
              :key="candidate.stop.placeId"
              class="planner-visit-stop"
            >
              <label>
                <input
                  v-model="visitDrafts[candidate.stopIndex].selected"
                  type="checkbox"
                  :disabled="pending || candidate.alreadyVisited"
                />
                <span>
                  {{ candidate.stop.name }}
                  <small v-if="candidate.alreadyVisited">
                    Already in your Visited Atlas
                  </small>
                </span>
              </label>
              <div
                v-if="
                  !candidate.alreadyVisited &&
                  visitDrafts[candidate.stopIndex].selected
                "
                class="planner-visit-details"
              >
                <label>
                  <span>Year</span>
                  <input
                    v-model="visitDrafts[candidate.stopIndex].year"
                    type="number"
                    min="1900"
                    :max="currentYear"
                    placeholder="Optional"
                  />
                </label>
                <label>
                  <span>Month</span>
                  <select v-model="visitDrafts[candidate.stopIndex].month">
                    <option value="">Optional</option>
                    <option
                      v-for="(month, monthIndex) in monthNames"
                      :key="month"
                      :value="monthIndex + 1"
                    >
                      {{ month }}
                    </option>
                  </select>
                </label>
                <label class="planner-note">
                  <span>Favorite memory</span>
                  <textarea
                    v-model.trim="visitDrafts[candidate.stopIndex].memory"
                    maxlength="255"
                    rows="3"
                    placeholder="Optional"
                  />
                </label>
              </div>
            </div>
          </fieldset>
          <button
            type="button"
            :disabled="pending || !selectedVisitCount"
            @click="markVisited"
          >
            Review and add {{ selectedVisitCount || "" }}
            {{ selectedVisitCount === 1 ? "stop" : "stops" }}
          </button>
        </details>

        <div v-if="plan" class="planner-handoffs">
          <p>
            Directions preserve your order. My Atlas does not calculate the
            fastest route, traffic, closures, or road access.
          </p>
          <button type="button" @click="prepareDirections">
            {{
              mapsLegs.length
                ? "Refresh Google Maps links"
                : "Prepare Google Maps links"
            }}
          </button>
          <div v-if="mapsLegs.length" class="planner-map-legs">
            <p v-if="mapsLegs.length > 1">
              Google Maps supports fewer stops on mobile, so this trip is split
              into {{ mapsLegs.length }} continuous legs.
            </p>
            <a
              v-for="(leg, index) in mapsLegs"
              :key="leg.url"
              :href="leg.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Open ${
                mapsLegs.length > 1 ? `leg ${index + 1}` : 'directions'
              } from ${leg.origin} to ${
                leg.destination
              } in Google Maps in a new tab`"
            >
              Open
              {{ mapsLegs.length > 1 ? `leg ${index + 1}` : "directions" }}:
              {{ leg.origin }} to {{ leg.destination }}
            </a>
          </div>
          <label>
            <input v-model="includePromptCoordinates" type="checkbox" />
            <span>Include exact coordinates in this AI prompt</span>
          </label>
          <button type="button" @click="previewPrompt">
            Preview AI planning prompt
          </button>
          <textarea
            v-if="promptPreview"
            :value="promptPreview"
            aria-label="AI planning prompt preview"
            rows="10"
            readonly
          />
          <button v-if="promptPreview" type="button" @click="copyPrompt">
            Copy prompt
          </button>
        </div>
      </section>

      <details class="planner-delete-account">
        <summary>Delete My Atlas account</summary>
        <p>
          This permanently removes your Visited Atlas, private wishlist, saved
          trip, handle, and app registration. It does not delete your Google or
          Auth0 identity.
        </p>
        <label>
          <span>Type DELETE MY ATLAS to confirm</span>
          <input v-model="deleteConfirmation" autocomplete="off" type="text" />
        </label>
        <button
          type="button"
          :disabled="pending || deleteConfirmation !== 'DELETE MY ATLAS'"
          @click="deleteAccount"
        >
          Permanently delete account
        </button>
      </details>
      <button
        class="planner-export"
        type="button"
        :disabled="pending"
        @click="exportAccountData"
      >
        Download private account data
      </button>
      <p class="planner-announcement" aria-live="polite">{{ announcement }}</p>
    </div>
  </section>
</template>

<script>
import {
  createMyAtlasWish,
  deleteMyAtlasAccount,
  deleteMyAtlasPlan,
  deleteMyAtlasWish,
  fetchMyAtlasAccountExport,
  fetchMyAtlasPlanning,
  keepMyAtlasPlan,
  markMyAtlasPlanVisited,
  saveMyAtlasPlan,
  updateMyAtlasWish,
} from "../api/client.mjs"
import { getMyAtlasApiAccessToken, logoutFromMyAtlas } from "../auth/auth0"
import {
  formatMyAtlasPlaceSearchError,
  searchMyAtlasPlaces,
} from "../catalog/placeSearchClient.mjs"
import { formatPlaceTypeLabel } from "../catalog/placeTypes.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import placeCatalog from "../data/place-catalog.proof.json"
import {
  MAX_PLAN_DESTINATIONS,
  MyAtlasHandoffError,
  buildAiPlanningPrompt,
  buildGoogleMapsDirectionsUrls,
} from "../planning/handoffs.mjs"
import {
  formatMyAtlasPlanLoadError,
  formatMyAtlasPlannerError,
  formatMyAtlasPlannerRefreshError,
} from "../planning/errors.mjs"

export default {
  name: "MyAtlasPlanner",
  props: {
    apiBaseUrl: { type: String, required: true },
    revision: { type: Number, required: true },
    pins: { type: Array, default: () => [] },
    profilePublic: { type: Boolean, default: false },
  },
  emits: ["revision-change", "pins-created", "account-deleted"],
  data() {
    return {
      open: false,
      pending: false,
      error: "",
      announcement: "",
      plannerRevision: this.revision,
      wishes: [],
      plan: null,
      planStateAvailable: true,
      planLoadError: "",
      wishDrafts: {},
      wishQuery: "",
      wishSearchResults: [],
      wishSearchPending: false,
      wishSearchTimer: null,
      wishSearchRequest: 0,
      wishSearchAbortController: null,
      wishSearchError: "",
      placeSearchEndpoint: getMyAtlasPlaceSearchEndpoint(
        process.env,
        window.location.origin
      ),
      customName: "",
      customLongitude: "",
      customLatitude: "",
      planForm: {
        title: "",
        status: "saved",
        desiredYear: "",
        note: "",
        startWishId: "",
        startDirect: null,
        stopWishIds: [],
        endMode: "last-stop",
        endDirect: null,
      },
      includePromptCoordinates: false,
      promptPreview: "",
      mapsLegs: [],
      visitDrafts: {},
      monthNames: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      deleteConfirmation: "",
    }
  },
  computed: {
    currentYear() {
      return new Date().getUTCFullYear()
    },
    wishPlaceIds() {
      return new Set(this.wishes.map(wish => wish.placeId))
    },
    maxPlanDestinations() {
      return MAX_PLAN_DESTINATIONS
    },
    visitedPlaceIds() {
      return new Set(this.pins.map(pin => pin.placeId))
    },
    visitCandidates() {
      return (this.plan?.stops || []).map((stop, stopIndex) => ({
        stop,
        stopIndex,
        alreadyVisited: this.visitedPlaceIds.has(stop.placeId),
      }))
    },
    selectedVisitCount() {
      return this.visitCandidates.filter(
        candidate =>
          !candidate.alreadyVisited &&
          this.visitDrafts[candidate.stopIndex]?.selected
      ).length
    },
  },
  watch: {
    revision(value) {
      this.plannerRevision = value
    },
    wishQuery(value) {
      this.queueWishSearch(value)
    },
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.clearTimeout(this.wishSearchTimer)
    if (this.wishSearchAbortController) this.wishSearchAbortController.abort()
  },
  methods: {
    async toggleOpen() {
      this.open = !this.open
      if (this.open && !this.wishes.length && !this.plan)
        await this.loadPlanning()
    },
    emitRevision(value) {
      this.plannerRevision = value
      this.$emit("revision-change", value)
    },
    async token() {
      return getMyAtlasApiAccessToken()
    },
    setWishDraft(wish) {
      this.$set(this.wishDrafts, wish.wishId, {
        note: wish.note || "",
        priority: wish.priority || "normal",
        desiredYear: wish.desiredYear || "",
      })
    },
    syncPlanForm() {
      if (!this.plan) {
        this.planForm = {
          title: "",
          status: "saved",
          desiredYear: "",
          note: "",
          startWishId: "",
          startDirect: null,
          stopWishIds: [],
          endMode: "last-stop",
          endDirect: null,
        }
        return
      }
      this.planForm = {
        title: this.plan.title,
        status: this.plan.status,
        desiredYear: this.plan.desiredYear || "",
        note: this.plan.note || "",
        startWishId: this.plan.start.sourceWishId || "",
        startDirect: this.plan.start.sourceWishId
          ? null
          : { ...this.plan.start },
        stopWishIds: this.plan.stops
          .map(stop => stop.sourceWishId)
          .filter(Boolean),
        endMode: this.plan.endMode,
        endDirect:
          this.plan.endMode === "selected-end" && this.plan.end
            ? { ...this.plan.end }
            : null,
      }
    },
    reconcilePlanDraft() {
      const availableWishIds = new Set(this.wishes.map(wish => wish.wishId))
      if (
        this.planForm.startWishId &&
        !availableWishIds.has(this.planForm.startWishId)
      ) {
        this.planForm.startWishId = ""
      }
      this.planForm.stopWishIds = this.planForm.stopWishIds.filter(wishId =>
        availableWishIds.has(wishId)
      )
    },
    syncVisitDrafts() {
      const drafts = {}
      ;(this.plan?.stops || []).forEach((_stop, stopIndex) => {
        drafts[stopIndex] = {
          selected: false,
          year: "",
          month: "",
          memory: "",
        }
      })
      this.visitDrafts = drafts
    },
    async loadPlanning({ preservePlanDraft = false, reportError = true } = {}) {
      this.pending = true
      if (reportError) this.error = ""
      try {
        const state = await fetchMyAtlasPlanning({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: await this.token(),
          allowPartial: true,
        })
        this.wishes = state.wishes
        this.planStateAvailable = !state.planError
        this.planLoadError = state.planError
          ? formatMyAtlasPlanLoadError(state.planError)
          : ""
        this.plan = this.planStateAvailable ? state.plans[0] || null : null
        this.wishDrafts = {}
        this.wishes.forEach(this.setWishDraft)
        this.emitRevision(state.revision)
        if (!preservePlanDraft || this.plan) this.syncPlanForm()
        else this.reconcilePlanDraft()
        this.syncVisitDrafts()
        return { ok: true }
      } catch (error) {
        if (reportError) this.error = this.errorMessage(error)
        return { ok: false, error }
      } finally {
        this.pending = false
      }
    },
    errorMessage(error) {
      return formatMyAtlasPlannerError(error)
    },
    queueWishSearch(value, delay = 350) {
      window.clearTimeout(this.wishSearchTimer)
      if (this.wishSearchAbortController) this.wishSearchAbortController.abort()
      this.wishSearchResults = []
      this.wishSearchError = ""
      const request = ++this.wishSearchRequest
      if (value.trim().length < 2) {
        this.wishSearchPending = false
        return
      }
      this.wishSearchPending = true
      this.wishSearchTimer = window.setTimeout(async () => {
        this.wishSearchAbortController = new AbortController()
        try {
          const results = await searchMyAtlasPlaces({
            query: value,
            catalog: placeCatalog,
            endpoint: this.placeSearchEndpoint,
            limit: 8,
            signal: this.wishSearchAbortController.signal,
          })
          if (request !== this.wishSearchRequest) return
          this.wishSearchResults = results
        } catch (error) {
          if (error.name === "AbortError" || request !== this.wishSearchRequest)
            return
          this.wishSearchError = this.placeSearchErrorMessage(error)
        } finally {
          if (request === this.wishSearchRequest) this.wishSearchPending = false
        }
      }, delay)
    },
    retryWishSearch() {
      this.queueWishSearch(this.wishQuery, 0)
    },
    placeSearchErrorMessage(error) {
      return formatMyAtlasPlaceSearchError(error)
    },
    async mutate(
      action,
      success,
      { preservePlanDraft = false, applyResult = null } = {}
    ) {
      this.pending = true
      this.error = ""
      try {
        const result = await action(await this.token())
        if (result?.revision) this.emitRevision(result.revision)
        if (applyResult) applyResult(result)
        this.announcement = success
        const refresh = await this.loadPlanning({
          preservePlanDraft,
          reportError: false,
        })
        if (!refresh.ok) {
          this.error = formatMyAtlasPlannerRefreshError(refresh.error)
        }
        return { saved: true, refreshed: refresh.ok, result }
      } catch (error) {
        this.error = this.errorMessage(error)
        return { saved: false, refreshed: false, error }
      } finally {
        this.pending = false
      }
    },
    rememberCreatedWish(result) {
      const wish = result?.wish
      if (!wish?.wishId || !wish.placeId) return
      const existingIndex = this.wishes.findIndex(
        entry => entry.wishId === wish.wishId || entry.placeId === wish.placeId
      )
      if (existingIndex >= 0) {
        this.$set(this.wishes, existingIndex, wish)
      } else {
        this.wishes = [...this.wishes, wish]
      }
      this.setWishDraft(wish)
    },
    saveCatalogWish(place) {
      return this.mutate(
        token =>
          createMyAtlasWish({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            value: { placeId: place.placeId, priority: "normal" },
            revision: this.plannerRevision,
          }),
        `${place.name} was added to your private bucket list.`,
        {
          preservePlanDraft: true,
          applyResult: result => this.rememberCreatedWish(result),
        }
      )
    },
    customPlanLocation() {
      const longitude = Number(this.customLongitude)
      const latitude = Number(this.customLatitude)
      if (
        !this.customName ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -85.051129 ||
        latitude > 85.051129
      ) {
        this.error = "Enter a name and valid longitude and latitude."
        return null
      }
      return Object.freeze({
        placeType: "custom",
        name: this.customName,
        coordinates: Object.freeze([longitude, latitude]),
        routeReadiness: "user-coordinate-review",
      })
    },
    saveCustomWish() {
      const place = this.customPlanLocation()
      if (!place) return
      return this.mutate(
        token =>
          createMyAtlasWish({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            value: {
              customPlace: {
                name: place.name,
                coordinates: [...place.coordinates],
              },
              priority: "normal",
            },
            revision: this.plannerRevision,
          }),
        `${this.customName} was added to your private bucket list.`,
        {
          preservePlanDraft: true,
          applyResult: result => this.rememberCreatedWish(result),
        }
      ).then(outcome => {
        if (outcome?.saved) {
          this.customName = ""
          this.customLongitude = ""
          this.customLatitude = ""
        }
      })
    },
    useCustomPlanLocation(role) {
      const place = this.customPlanLocation()
      if (place) this.usePlanLocation(role, place)
    },
    usePlanLocation(role, place) {
      this.error = ""
      const location = {
        ...place,
        coordinates: [...place.coordinates],
      }
      if (role === "start") {
        this.planForm.startWishId = ""
        this.planForm.startDirect = location
        this.announcement = `${place.name} will be used as the trip start.`
      } else {
        this.planForm.endMode = "selected-end"
        this.planForm.endDirect = location
        this.announcement = `${place.name} will be used as the trip finish.`
      }
      if (!this.wishes.length) {
        this.announcement +=
          " Save at least one destination before saving the trip."
      }
      this.mapsLegs = []
    },
    clearDirectLocation(role) {
      if (role === "start") this.planForm.startDirect = null
      else this.planForm.endDirect = null
      this.mapsLegs = []
    },
    selectSavedStart() {
      this.planForm.startDirect = null
      this.mapsLegs = []
    },
    planLocationInput(place) {
      return place.placeType === "custom"
        ? {
            customPlace: {
              name: place.name,
              coordinates: [...place.coordinates],
            },
          }
        : { placeId: place.placeId }
    },
    saveWish(wish) {
      const draft = this.wishDrafts[wish.wishId]
      return this.mutate(
        token =>
          updateMyAtlasWish({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            wishId: wish.wishId,
            patch: {
              note: draft.note,
              priority: draft.priority,
              desiredYear: draft.desiredYear ? Number(draft.desiredYear) : null,
            },
            revision: this.plannerRevision,
          }).then(revision => ({ revision })),
        `${wish.name} was updated.`,
        { preservePlanDraft: true }
      )
    },
    removeWish(wish) {
      if (!window.confirm(`Remove ${wish.name} from your bucket list?`)) return
      return this.mutate(
        token =>
          deleteMyAtlasWish({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            wishId: wish.wishId,
            revision: this.plannerRevision,
          }).then(revision => ({ revision })),
        `${wish.name} was removed. Saved trip snapshots were not changed.`,
        { preservePlanDraft: true }
      )
    },
    wishById(wishId) {
      return (
        this.wishes.find(wish => wish.wishId === wishId) || {
          name: "Unavailable destination",
        }
      )
    },
    togglePlanStop(wishId) {
      const stops = [...this.planForm.stopWishIds]
      const index = stops.indexOf(wishId)
      if (index >= 0) stops.splice(index, 1)
      else if (stops.length < MAX_PLAN_DESTINATIONS) stops.push(wishId)
      this.planForm.stopWishIds = stops
      this.mapsLegs = []
    },
    moveStop(index, offset) {
      const target = index + offset
      if (target < 0 || target >= this.planForm.stopWishIds.length) return
      const stops = [...this.planForm.stopWishIds]
      const [wishId] = stops.splice(index, 1)
      stops.splice(target, 0, wishId)
      this.planForm.stopWishIds = stops
      this.mapsLegs = []
    },
    savePlan() {
      if (
        !this.planForm.title ||
        (!this.planForm.startWishId && !this.planForm.startDirect) ||
        !this.planForm.stopWishIds.length
      ) {
        this.error = "Choose a title, start, and at least one destination."
        return
      }
      if (
        this.planForm.endMode === "selected-end" &&
        !this.planForm.endDirect
      ) {
        this.error = "Choose a finish from search or custom coordinates."
        return
      }
      const value = {
        title: this.planForm.title,
        status: this.planForm.status,
        desiredYear: this.planForm.desiredYear
          ? Number(this.planForm.desiredYear)
          : null,
        note: this.planForm.note,
        start: this.planForm.startWishId
          ? { wishId: this.planForm.startWishId }
          : this.planLocationInput(this.planForm.startDirect),
        stopWishIds: this.planForm.stopWishIds,
        endMode: this.planForm.endMode,
        ...(this.planForm.endMode === "selected-end"
          ? { end: this.planLocationInput(this.planForm.endDirect) }
          : {}),
      }
      return this.mutate(
        token =>
          saveMyAtlasPlan({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            planId: this.plan?.planId || "",
            value,
            revision: this.plannerRevision,
          }),
        "Your private trip was saved."
      )
    },
    keepPlan() {
      return this.mutate(
        token =>
          keepMyAtlasPlan({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            planId: this.plan.planId,
            revision: this.plannerRevision,
          }),
        "Your trip was kept for another six months."
      )
    },
    removePlan() {
      if (
        !window.confirm("Delete this saved trip? Your bucket list will remain.")
      )
        return
      return this.mutate(
        token =>
          deleteMyAtlasPlan({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            planId: this.plan.planId,
            revision: this.plannerRevision,
          }).then(revision => ({ revision })),
        "The saved trip was deleted."
      )
    },
    async markVisited() {
      const selected = this.visitCandidates.filter(
        candidate =>
          !candidate.alreadyVisited &&
          this.visitDrafts[candidate.stopIndex]?.selected
      )
      if (!selected.length) return
      const visits = []
      for (const candidate of selected) {
        const draft = this.visitDrafts[candidate.stopIndex]
        const year = draft.year === "" ? null : Number(draft.year)
        const month = draft.month === "" ? null : Number(draft.month)
        if (
          (year !== null &&
            (!Number.isInteger(year) ||
              year < 1900 ||
              year > this.currentYear)) ||
          (month !== null &&
            (year === null ||
              !Number.isInteger(month) ||
              month < 1 ||
              month > 12))
        ) {
          this.error = `Enter a valid visit year for ${candidate.stop.name} before choosing a month.`
          return
        }
        visits.push({
          stopIndex: candidate.stopIndex,
          visitedDates:
            year === null
              ? []
              : [{ year, ...(month === null ? {} : { month }) }],
          memory: draft.memory,
        })
      }
      const names = selected.map(candidate => candidate.stop.name).join(", ")
      const visibility = this.profilePublic
        ? " These destinations will appear on your public Atlas immediately."
        : ""
      if (
        !window.confirm(
          `Add these visited destinations to My Atlas: ${names}? Your saved trip and bucket list will remain.${visibility}`
        )
      ) {
        return
      }

      this.pending = true
      this.error = ""
      try {
        const result = await markMyAtlasPlanVisited({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: await this.token(),
          planId: this.plan.planId,
          visits,
          revision: this.plannerRevision,
        })
        this.emitRevision(result.revision)
        this.$emit("pins-created", result.pins)
        await this.loadPlanning()
        this.announcement = `${result.pins.length} visited ${
          result.pins.length === 1 ? "destination was" : "destinations were"
        } added. Your saved trip and bucket list were preserved.`
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.pending = false
      }
    },
    prepareDirections() {
      try {
        const customIds = this.plan.stops
          .concat([
            this.plan.start,
            ...(this.plan.endMode === "selected-end" ? [this.plan.end] : []),
          ])
          .filter(
            location => location.routeReadiness === "user-coordinate-review"
          )
          .map(location => location.placeId)
        if (
          customIds.length &&
          !window.confirm(
            "Use the custom coordinates you supplied for this Google Maps handoff?"
          )
        )
          return
        this.mapsLegs = buildGoogleMapsDirectionsUrls(this.plan, {
          confirmedCoordinatePlaceIds: customIds,
        })
        this.announcement =
          this.mapsLegs.length === 1
            ? "Your Google Maps directions link is ready."
            : `${this.mapsLegs.length} Google Maps directions legs are ready.`
      } catch (error) {
        this.error =
          error instanceof MyAtlasHandoffError
            ? error.message
            : "Directions could not be prepared."
      }
    },
    previewPrompt() {
      try {
        this.promptPreview = buildAiPlanningPrompt(this.plan, {
          includeCoordinates: this.includePromptCoordinates,
        })
      } catch (error) {
        this.error = "The planning prompt could not be prepared."
      }
    },
    async copyPrompt() {
      try {
        await navigator.clipboard.writeText(this.promptPreview)
        this.announcement = "The AI planning prompt was copied."
      } catch {
        this.error =
          "The browser could not copy this prompt. Select the text and copy it manually."
      }
    },
    async deleteAccount() {
      if (
        !window.confirm(
          "Permanently delete all My Atlas application data? This cannot be undone."
        )
      )
        return
      this.pending = true
      this.error = ""
      try {
        const storageKey = "rwj:my-atlas:account-deletion-operation:v1"
        let operation = null
        try {
          operation = JSON.parse(window.sessionStorage.getItem(storageKey))
        } catch {
          // An invalid local recovery record is replaced below.
        }
        if (!operation?.idempotencyKey || !operation?.revision) {
          operation = {
            idempotencyKey: window.crypto.randomUUID(),
            revision: this.plannerRevision,
          }
          window.sessionStorage.setItem(storageKey, JSON.stringify(operation))
        }
        await deleteMyAtlasAccount({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: await this.token(),
          revision: operation.revision,
          idempotencyKey: operation.idempotencyKey,
        })
        window.sessionStorage.removeItem(storageKey)
        this.$emit("account-deleted")
        logoutFromMyAtlas()
      } catch (error) {
        this.error = this.errorMessage(error)
        this.pending = false
      }
    },
    async exportAccountData() {
      this.pending = true
      this.error = ""
      try {
        const value = await fetchMyAtlasAccountExport({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: await this.token(),
        })
        const blob = new Blob([JSON.stringify(value, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `my-atlas-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        this.announcement = "Your private My Atlas data export was downloaded."
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.pending = false
      }
    },
    locationContext(place) {
      if (place.unavailable) return "Catalog entry unavailable"
      return (
        [place.admin1Name, place.countryName].filter(Boolean).join(", ") ||
        place.placeType
      )
    },
    coordinateLabel(place) {
      if (
        !Array.isArray(place.coordinates) ||
        place.coordinates.length !== 2 ||
        !place.coordinates.every(Number.isFinite)
      ) {
        return "Coordinates unavailable"
      }
      const [longitude, latitude] = place.coordinates
      return `Latitude ${latitude.toFixed(5)}, longitude ${longitude.toFixed(5)}`
    },
    placeTypeLabel(place) {
      return formatPlaceTypeLabel(place)
    },
    routeReadinessLabel(place) {
      const labels = {
        "route-ready": "Ready for a directions handoff",
        "needs-entrance-selection":
          "Choose a useful entrance before directions",
        "user-coordinate-review": "Confirm your coordinates before directions",
        unavailable: "Remove this entry and add the destination again",
      }
      return labels[place.routeReadiness] || "Review before directions"
    },
    wishSelectionLabel(wish) {
      return wish.unavailable
        ? `${wish.name} (remove and add again)`
        : wish.name
    },
    formatDeadline(value) {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value)
      )
    },
  },
}
</script>

<style scoped>
.my-atlas-planner {
  display: grid;
  margin-top: 0.8rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.025);
}
.planner-content {
  display: grid;
  gap: 0.8rem;
  padding: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}
.planner-heading,
.planner-block-heading,
.planner-row-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.planner-heading {
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
.planner-heading > span,
.planner-block-heading > div {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}
.planner-heading small,
.planner-block-heading p,
.planner-heading strong,
.planner-disclosure,
.planner-status,
.planner-error,
.planner-empty,
.planner-custom p,
.planner-retention span,
.planner-handoffs p,
.planner-delete-account p {
  margin: 0;
}
.planner-heading small,
.planner-block-heading p {
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.62rem;
  font-weight: 800;
}
.planner-heading strong {
  color: #edf7f2;
  font-size: 0.74rem;
}
.planner-heading b {
  flex: 0 0 auto;
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(230, 186, 104, 0.34);
  border-radius: 999px;
  color: #efc975;
  background: rgba(230, 186, 104, 0.07);
  font-size: 0.6rem;
  white-space: nowrap;
}
.planner-heading:hover,
.planner-heading:focus-visible {
  background: rgba(230, 186, 104, 0.055);
  outline: none;
}
.planner-heading:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(230, 186, 104, 0.55);
}
.planner-block button,
.planner-delete-account button {
  min-height: 2.75rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.42);
  border-radius: 0.65rem;
  color: #f4d38f;
  background: rgba(230, 186, 104, 0.08);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}
.planner-export {
  justify-self: start;
  min-height: 2.75rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.36);
  border-radius: 0.65rem;
  color: #e7cf9b;
  background: transparent;
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}
.planner-disclosure,
.planner-status,
.planner-empty,
.planner-custom p,
.planner-handoffs p,
.planner-delete-account p {
  color: #93a69f;
  font-size: 0.66rem;
  line-height: 1.5;
}
.planner-error {
  color: #e6a8a1;
  font-size: 0.68rem;
}
.planner-block {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid rgba(230, 186, 104, 0.22);
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.035);
}
.planner-block-heading span {
  color: #8fa29c;
  font-size: 0.6rem;
}
.planner-place-search small {
  color: #8fa29c;
  font-size: 0.58rem;
  line-height: 1.45;
}
.planner-search-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin: 0;
  color: #9aada7;
  font-size: 0.64rem;
}
.planner-search-state.is-error {
  color: #e6a8a1;
}
.planner-search-results {
  display: grid;
  gap: 0.45rem;
}
.planner-search-results > span {
  color: #aabbb5;
  font-size: 0.64rem;
}
.planner-search-results ul {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.planner-search-results article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.025);
}
.planner-search-result-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}
.planner-search-results strong {
  color: #edf7f2;
  font-size: 0.7rem;
}
.planner-search-results small {
  color: #91a49e;
  font-size: 0.56rem;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.planner-search-results b {
  color: #d4b875;
  font-size: 0.56rem;
  white-space: nowrap;
}
.planner-search-selections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.75rem;
  padding: 0.7rem;
  border: 1px solid rgba(230, 190, 105, 0.35);
  border-radius: 0.7rem;
  background: rgba(230, 190, 105, 0.06);
}
.planner-search-selections p {
  display: grid;
  gap: 0.15rem;
  margin: 0;
}
.planner-search-selections span,
.planner-search-selections > small {
  color: #98a3a1;
  font-size: 0.68rem;
}
.planner-search-selections strong {
  color: #f2cc7d;
  font-size: 0.82rem;
}
.planner-search-selections > small {
  grid-column: 1 / -1;
  line-height: 1.45;
}
.planner-plan-editor {
  display: grid;
  gap: 0.8rem;
}
.planner-search-actions,
.planner-custom-actions {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.planner-search-actions button,
.planner-custom-actions button {
  min-height: 2.35rem;
}
.planner-custom > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.planner-custom > div label:first-child,
.planner-custom-actions {
  grid-column: 1 / -1;
}
.planner-custom summary {
  color: #e6ba68;
  font-size: 0.68rem;
  cursor: pointer;
}
.planner-block label,
.planner-delete-account label {
  display: grid;
  gap: 0.22rem;
  color: #cbd8d4;
  font-size: 0.62rem;
}
.planner-block input,
.planner-block select,
.planner-block textarea,
.planner-delete-account input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.58rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.6rem;
  color: #edf7f2;
  background: #111f22;
  font: inherit;
}
.planner-wishes {
  display: grid;
  gap: 0.55rem;
  max-height: min(52rem, 65vh);
  margin: 0;
  padding: 0 0.2rem 0 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: rgba(230, 186, 104, 0.4) transparent;
  list-style: none;
}
.planner-wishes li {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.65rem;
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.04);
}
.planner-wishes li > div:first-child,
.planner-note,
.planner-row-actions {
  grid-column: 1 / -1;
}
.planner-wishes li > div:first-child {
  display: grid;
}
.planner-wishes strong {
  color: #edf7f2;
  font-size: 0.72rem;
}
.planner-wishes span,
.planner-wishes small {
  color: #91a49e;
  font-size: 0.58rem;
}
.planner-wishes small {
  color: #d4b875;
}
.planner-row-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}
.planner-row-actions button:last-child {
  color: #d9a09a;
}
.planner-retention {
  display: grid;
  gap: 0.4rem;
  padding: 0.65rem;
  border: 1px solid rgba(220, 149, 112, 0.4);
  border-radius: 0.7rem;
  background: rgba(130, 65, 45, 0.14);
}
.planner-retention strong {
  color: #f0c193;
  font-size: 0.72rem;
}
.planner-retention span {
  color: #c9b0a1;
  font-size: 0.62rem;
}
.planner-direct-location {
  display: grid;
  gap: 0.18rem;
  padding: 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.3);
  border-radius: 0.7rem;
  background: rgba(230, 186, 104, 0.055);
}
.planner-direct-location > span {
  color: #e6ba68;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.56rem;
  font-weight: 800;
}
.planner-direct-location strong {
  color: #edf7f2;
  font-size: 0.72rem;
}
.planner-direct-location small,
.planner-direct-location p {
  margin: 0;
  color: #91a49e;
  font-size: 0.58rem;
  line-height: 1.45;
}
.planner-direct-location button {
  justify-self: start;
  margin-top: 0.3rem;
}
.planner-block fieldset {
  display: grid;
  gap: 0.35rem;
  max-height: min(36rem, 52vh);
  margin: 0;
  padding: 0.65rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.7rem;
}
.planner-block legend {
  color: #e6ba68;
  font-size: 0.64rem;
}
.planner-block fieldset label,
.planner-handoffs label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.planner-block fieldset input,
.planner-handoffs input {
  width: auto;
}
.planner-stop-order {
  display: grid;
  gap: 0.35rem;
  max-height: min(32rem, 48vh);
  margin: 0;
  padding-left: 1.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.planner-stop-order li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.35rem;
  color: #dce8e4;
  font-size: 0.66rem;
}
.planner-stop-order li > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.planner-handoffs {
  display: grid;
  gap: 0.55rem;
  padding-top: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.planner-mark-visited {
  margin-top: 1rem;
  padding: 0.9rem;
  border: 1px solid rgba(230, 190, 105, 0.42);
  border-radius: 0.8rem;
  background: rgba(230, 190, 105, 0.05);
}

.planner-mark-visited summary {
  color: #f2cc7d;
  font-weight: 700;
  cursor: pointer;
}

.planner-mark-visited > p,
.planner-public-warning {
  margin: 0.7rem 0;
  color: #aeb9b7;
  font-size: 0.82rem;
  line-height: 1.45;
}

.planner-public-warning {
  color: #f2cc7d;
}

.planner-visit-stop {
  padding: 0.7rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.planner-visit-stop:first-of-type {
  border-top: 0;
}

.planner-visit-stop > label {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.55rem;
}

.planner-visit-stop > label input {
  width: auto;
  margin-top: 0.2rem;
}

.planner-visit-stop small {
  display: block;
  margin-top: 0.2rem;
  color: #8e9997;
}

.planner-visit-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.65rem;
  margin: 0.7rem 0 0 1.45rem;
}

.planner-visit-details .planner-note {
  grid-column: 1 / -1;
}
.planner-handoffs textarea {
  resize: vertical;
  font-size: 0.62rem;
  line-height: 1.45;
}
.planner-map-legs {
  display: grid;
  gap: 0.45rem;
}
.planner-map-legs a {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 2.75rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(230, 186, 104, 0.32);
  border-radius: 0.6rem;
  color: #f4d38f;
  font-size: 0.64rem;
  line-height: 1.4;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.planner-map-legs a:focus-visible,
.planner-map-legs a:hover {
  border-color: rgba(230, 186, 104, 0.72);
  background: rgba(230, 186, 104, 0.08);
}
.planner-delete-account {
  padding: 0.7rem;
  border: 1px solid rgba(213, 135, 126, 0.25);
  border-radius: 0.8rem;
}
.planner-delete-account summary {
  color: #d9a09a;
  font-size: 0.68rem;
  cursor: pointer;
}
.planner-delete-account label {
  margin: 0.7rem 0;
}
.planner-delete-account button {
  color: #f3c1bb;
  border-color: rgba(213, 135, 126, 0.45);
}
.planner-block button:disabled,
.planner-delete-account button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.planner-block button:focus-visible,
.planner-delete-account button:focus-visible,
.planner-export:focus-visible,
.planner-custom summary:focus-visible,
.planner-delete-account summary:focus-visible {
  outline: 2px solid #f4d38f;
  outline-offset: 3px;
}
.planner-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 480px) {
  .planner-wishes li,
  .planner-custom > div {
    grid-template-columns: 1fr;
  }
  .planner-custom > div label:first-child,
  .planner-custom-actions {
    grid-column: 1;
  }
}
</style>
