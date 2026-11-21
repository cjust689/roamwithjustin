<template>
  <section
    v-if="open"
    id="my-atlas-trips-content"
    class="atlas-trips"
    aria-label="Your trips"
    :aria-busy="String(pending)"
  >
    <header>
      <h2>
        {{
          scope === "planned"
            ? "Planned trips"
            : scope === "past"
              ? "Past trips"
              : "Your trips"
        }}
      </h2>
      <button type="button" @click="close">Close</button>
    </header>
    <p v-if="error" role="alert">{{ error }}</p>
    <button
      v-if="!loaded || refreshNeeded"
      type="button"
      :disabled="pending"
      @click="load"
    >
      Refresh trips
    </button>
    <p v-if="loaded && !writesEnabled" role="status">
      Trip saving is unavailable on this server. Your destinations are
      unchanged.
    </p>
    <section
      v-if="groupDestinations.length"
      class="trip-form"
      aria-label="Organize selected destinations"
    >
      <h3>Organize destinations</h3>
      <p>
        These are visited destinations, not separate trips. Choose a name to
        create a trip, or add them to an existing trip.
      </p>
      <ol>
        <li v-for="place in groupDestinations" :key="place.pinId">
          {{ place.name }}
        </li>
      </ol>
      <label v-if="upgraded && groupTargets.length"
        >Add to
        <select v-model="groupTargetId">
          <option value="">A new trip</option>
          <option
            v-for="trip in groupTargets"
            :key="trip.tripId"
            :value="trip.tripId"
          >
            {{ trip.title }}
          </option>
        </select>
      </label>
      <label v-if="!groupTargetId"
        >Trip name<input v-model="groupTitle" maxlength="80" autocomplete="off"
      /></label>
      <p>
        Destinations are added in the order shown. Their memories and visit
        dates stay attached. Other destinations remain ungrouped.
      </p>
      <p>
        Grouping keeps the destinations' current Visited Atlas sharing choice.
      </p>
      <template v-if="!upgraded && preview">
        <p>
          {{ preview.counts.ungroupedDestinations }} ungrouped destinations and
          {{ preview.counts.sourcePlans }} existing planned trips. Existing
          plans and your Atlas image are preserved.
        </p>
        <label v-if="writesEnabled" class="trip-check"
          ><input v-model="retentionAcknowledged" type="checkbox" />I understand
          that organized trips remain until I delete them.</label
        >
      </template>
      <button
        v-if="writesEnabled"
        type="button"
        :disabled="!canSaveDestinationGroup"
        :aria-busy="String(groupSavePending)"
        @click="saveDestinationGroup"
      >
        {{ groupTargetId ? "Add destinations to trip" : "Create trip" }}
      </button>
    </section>
    <template v-if="loaded && !upgraded && !groupDestinations.length">
      <p>
        Your visited destinations stay ungrouped until you choose to add them to
        a named trip. A trip can have one or more stops.
      </p>
      <button type="button" :disabled="pending" @click="previewUpgrade">
        Review destinations and plans
      </button>
      <div v-if="preview">
        <p>
          {{ preview.counts.ungroupedDestinations }} ungrouped destinations and
          {{ preview.counts.sourcePlans }} existing planned trips.
        </p>
        <ul>
          <li
            v-for="destination in preview.destinations"
            :key="destination.pinId"
          >
            {{ destination.name }}
          </li>
        </ul>
        <ul>
          <li v-for="group in preview.groups" :key="group.tripId">
            {{ group.title }} · {{ group.stops.length }}
            {{ group.stops.length === 1 ? "stop" : "stops" }}
          </li>
        </ul>
        <p v-if="!preview.ready">
          Some destinations need review before organizing.
        </p>
        <template v-if="writesEnabled">
          <label class="trip-check"
            ><input v-model="retentionAcknowledged" type="checkbox" />I
            understand that organized trips remain until I delete them.</label
          >
          <button
            type="button"
            :disabled="pending || !preview.ready || !retentionAcknowledged"
            @click="enableTripOrganizing"
          >
            Enable trip organizing
          </button>
        </template>
      </div>
    </template>
    <template v-if="loaded && upgraded">
      <MyAtlasVisitManager
        v-if="scope !== 'planned' && ungroupedVisits.length"
        :visits="ungroupedVisits"
        :trips="trips"
        :pending="busy"
        :saved-sequence="savedSequence"
        @transfer="mutate('transfer', $event)"
        @edit-visit="
          mutate('editVisit', $event.patch, undefined, $event.stopId)
        "
      />
      <div class="trip-controls">
        <label v-if="scope === 'all'"
          >Show<select v-model="filter">
            <option value="all">All trips ({{ trips.length }})</option>
            <option value="planned">Planned ({{ count("planned") }})</option>
            <option value="past">Past ({{ count("past") }})</option>
          </select></label
        >
        <button type="button" :disabled="busy" @click="startNew">
          Add trip
        </button>
      </div>
      <p v-if="!trips.length">
        Add a Planned or Past trip, even if it has just one destination.
      </p>
      <ul class="trip-list">
        <li v-for="trip in filteredTrips" :key="trip.tripId">
          <button
            type="button"
            :aria-pressed="String(selectedId === trip.tripId)"
            @click="select(trip)"
          >
            <strong>{{ trip.title }}</strong
            ><small
              >{{ trip.lifecycle === "past" ? "Past" : "Planned" }} ·
              {{ trip.stops.length }}
              {{ trip.stops.length === 1 ? "stop" : "stops" }}</small
            >
          </button>
          <label v-if="trip.lifecycle === 'past'" class="trip-check"
            ><input
              v-model="combineIds"
              type="checkbox"
              :value="trip.tripId"
              :disabled="busy"
            />Group</label
          >
        </li>
      </ul>
      <div v-if="combineIds.length > 1" class="trip-form">
        <label
          >Combined trip name<input v-model="combineTitle" maxlength="80"
        /></label>
        <p>
          The trips will be combined in the order you selected them. Stop
          memories stay attached.
        </p>
        <button
          type="button"
          :disabled="busy || !combineTitle.trim()"
          :aria-busy="String(pendingAction === 'combine')"
          @click="
            mutate('combine', { tripIds: combineIds, title: combineTitle })
          "
        >
          Combine into trip
        </button>
      </div>
      <div v-if="creating" class="trip-form">
        <label>Trip name<input v-model="draftTitle" maxlength="80" /></label>
        <label
          >Trip status<select v-model="draftLifecycle">
            <option value="planned">Planned</option>
            <option value="past">Past</option>
          </select></label
        >
        <ol>
          <li v-for="(stop, index) in draftStops" :key="index">
            {{ stop.name }}
            <button type="button" @click="draftStops.splice(index, 1)">
              Remove
            </button>
          </li>
        </ol>
        <button
          type="button"
          :disabled="busy || !draftTitle.trim() || !draftStops.length"
          :aria-busy="String(pendingAction === 'create')"
          @click="
            mutate('create', {
              title: draftTitle,
              lifecycle: draftLifecycle,
              stops: draftStops.map(stop => stop.selection),
            })
          "
        >
          Save trip
        </button>
      </div>
      <article v-if="selected && !creating" class="trip-form">
        <h3>{{ selected.title }}</h3>
        <p v-if="!selected.stops.length">
          This trip has no visits. Its overview and travel details are kept. Add
          visits or delete the trip explicitly.
        </p>
        <details>
          <summary>Public Atlas visibility</summary>
          <label class="trip-check"
            ><input
              v-model="publicAtlasDraft"
              type="checkbox"
              :disabled="busy"
            />Include this trip's destinations in my public Atlas{{
              selected.lifecycle === "planned" ? " when marked Past" : ""
            }}.</label
          >
          <p>
            Your Atlas must also be public. Private notes, experiences, flights
            and rentals stay private. Snapshot trip links are shared separately.
          </p>
          <button
            type="button"
            :disabled="
              busy || publicAtlasDraft === selected.sharing.publicAtlas
            "
            @click="
              mutate(
                'sharing',
                { publicAtlas: publicAtlasDraft },
                selected.tripId
              )
            "
          >
            Save trip visibility
          </button>
        </details>
        <details v-if="selected.stops.length">
          <summary>Move or ungroup visits</summary>
          <MyAtlasVisitManager
            :key="selected.tripId"
            :source-trip="selected"
            :trips="trips"
            :pending="busy"
            @transfer="mutate('transfer', $event)"
          />
        </details>
        <details>
          <summary>Edit trip name and overview</summary>
          <label>Trip name<input v-model="titleDraft" maxlength="80" /></label
          ><label
            >Overview<textarea
              v-model="descriptionDraft"
              maxlength="500"
            /></label
          ><button
            type="button"
            :disabled="busy || !titleDraft.trim()"
            :aria-busy="String(pendingAction === 'metadata')"
            @click="
              mutate(
                'metadata',
                { title: titleDraft, description: descriptionDraft },
                selected.tripId
              )
            "
          >
            Save trip details
          </button>
        </details>
        <button
          type="button"
          :disabled="!selected.stops.length"
          @click="shareTrip"
        >
          Copy read only trip link
        </button>
        <p>
          Shared links include this trip's name, status and ordered
          destinations. Private memories, experiences and logistics stay
          private.
        </p>
        <p>
          {{ selected.lifecycle === "past" ? "Past trip" : "Planned trip" }}.
          Memories are preserved when you change its status.
        </p>
        <div class="trip-controls">
          <button
            type="button"
            :disabled="busy"
            @click="
              mutate(
                'lifecycle',
                {
                  lifecycle: selected.lifecycle === 'past' ? 'planned' : 'past',
                },
                selected.tripId
              )
            "
          >
            {{
              selected.lifecycle === "past"
                ? "Move to Planned"
                : "Mark as Traveled"
            }}</button
          ><button type="button" :disabled="busy" @click="adding = !adding">
            Add stop
          </button>
        </div>
        <ol class="trip-stops">
          <li v-for="(stop, index) in selected.stops" :key="stop.stopId">
            <strong>{{ stop.place.name }}</strong>
            <small v-if="stop.visitedDates.length">{{
              stop.visitedDates
                .map(date =>
                  date.month ? `${date.month}/${date.year}` : String(date.year)
                )
                .join(", ")
            }}</small>
            <div class="trip-controls">
              <button
                type="button"
                :disabled="busy || index === 0"
                :aria-label="`Move ${stop.place.name} earlier`"
                @click="moveStop(index, -1)"
              >
                ↑</button
              ><button
                type="button"
                :disabled="busy || index === selected.stops.length - 1"
                :aria-label="`Move ${stop.place.name} later`"
                @click="moveStop(index, 1)"
              >
                ↓</button
              ><button type="button" :disabled="busy" @click="editStop(stop)">
                Memories{{
                  stop.experiences.length ? ` (${stop.experiences.length})` : ""
                }}</button
              ><button
                type="button"
                :disabled="busy || selected.stops.length === 1"
                @click="removeStop(stop)"
              >
                Remove stop
              </button>
            </div>
            <div v-if="editingStopId === stop.stopId" class="trip-form">
              <label
                >Favorite memory<textarea
                  v-model="memoryDraft"
                  maxlength="500"
                />
              </label>
              <button
                type="button"
                :disabled="busy"
                @click="
                  mutate(
                    'editStop',
                    {
                      memory: memoryDraft,
                      plannedDates: {
                        arrival: dates.plannedArrival || null,
                        departure: dates.plannedDeparture || null,
                      },
                      actualDates: {
                        arrival: dates.actualArrival || null,
                        departure: dates.actualDeparture || null,
                      },
                    },
                    selected.tripId,
                    stop.stopId
                  )
                "
              >
                Save visit details
              </button>
              <div class="trip-date-fields">
                <label
                  >Planned arrival<input
                    v-model="dates.plannedArrival"
                    type="date"
                /></label>
                <label
                  >Planned departure<input
                    v-model="dates.plannedDeparture"
                    type="date"
                /></label>
                <label
                  >Actual arrival<input
                    v-model="dates.actualArrival"
                    type="date"
                /></label>
                <label
                  >Actual departure<input
                    v-model="dates.actualDeparture"
                    type="date"
                /></label>
              </div>
              <MyAtlasExperiences
                :experiences="stop.experiences"
                :pending="busy"
                :saved-sequence="savedSequence"
                @change="
                  mutate(
                    'editStop',
                    { experienceChange: $event },
                    selected.tripId,
                    stop.stopId
                  )
                "
              />
            </div>
          </li>
        </ol>
        <details>
          <summary>Travel tools</summary>
          <p>
            Save your flight and rental details to keep them with this trip.
            These are planning details, not bookings, and stay private.
          </p>
          <div class="trip-controls">
            <button type="button" @click="travelTool = 'flights'">
              Flights</button
            ><button type="button" @click="travelTool = 'rental'">
              Rental cars
            </button>
          </div>
          <MyAtlasTravelSearch
            v-if="travelTool"
            v-model="selectedTravelDraft"
            :tool="travelTool"
            :context-changed="travelContextChanged"
            :persistable="true"
            :dirty="travelDetailsDirty"
          />
          <button
            type="button"
            :disabled="busy || !travelDetailsDirty"
            :aria-busy="String(pendingAction === 'logistics')"
            @click="saveTravelDetails"
          >
            Save travel details
          </button>
          <div v-if="selected.stops.length > 1" class="trip-form">
            <label
              >Directions mode<select v-model="directionsMode">
                <option value="driving">Driving</option>
                <option value="walking">Walking</option>
                <option value="bicycling">Cycling</option>
                <option value="transit">Transit</option>
              </select></label
            ><label class="trip-check"
              ><input v-model="routeReviewed" type="checkbox" />I reviewed road
              access for custom coordinates.</label
            ><button type="button" @click="prepareDirections">
              Prepare directions</button
            ><a
              v-for="(action, index) in directions"
              v-show="action.url"
              :key="index"
              :href="action.url"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
              >{{ action.label || `Open route ${index + 1}` }}</a
            ><button type="button" @click="copyPrompt">
              Copy planning prompt
            </button>
          </div>
        </details>
        <button type="button" :disabled="busy" @click="deleteTrip">
          Delete trip
        </button>
      </article>
      <div v-if="creating || adding" class="trip-form">
        <label
          >Find a destination<input
            ref="search"
            v-model="query"
            autocomplete="off"
            @input="queueSearch"
        /></label>
        <p v-if="searchPending" role="status">Searching places</p>
        <p v-if="searchError" role="alert">{{ searchError }}</p>
        <ul>
          <li v-for="place in results" :key="place.placeId">
            <button
              type="button"
              :disabled="busy"
              @click="choose({ placeId: place.placeId }, place.name)"
            >
              {{ place.name }} <small>{{ place.countryName || "" }}</small>
            </button>
          </li>
        </ul>
        <MyAtlasLocationPicker
          :name="customName"
          :latitude="latitude"
          :longitude="longitude"
          :pending="busy"
          :resolve-link="resolveLink"
          @update:name="customName = $event"
          @update:latitude="latitude = $event"
          @update:longitude="longitude = $event"
          @coordinates-change="syncPlacement"
          @choose-map="beginPlacement"
          @search="$refs.search.focus()"
        />
        <button
          type="button"
          :disabled="busy || !customPlace"
          @click="choose({ customPlace }, customPlace.name)"
        >
          Add custom stop
        </button>
        <button type="button" @click="stopPlacement">Stop placing pin</button>
      </div>
      <button
        v-if="rollbackAvailable"
        type="button"
        :disabled="busy"
        @click="rollback"
      >
        Undo trip upgrade
      </button>
    </template>
  </section>
</template>

<script>
import MyAtlasExperiences from "./MyAtlasExperiences.vue"
import MyAtlasLocationPicker from "./MyAtlasLocationPicker.vue"
import MyAtlasTravelSearch from "./MyAtlasTravelSearch.vue"
import MyAtlasVisitManager from "./MyAtlasVisitManager.vue"
import {
  normalizeTripTravelDraft,
  savedTripTravelDraft,
} from "../../../../shared/my-atlas-trip-logistics.mjs"
import { emptyTravelSearchDraft } from "../planning/travelSearch.mjs"
import {
  buildGoogleMapsRouteHandoffs,
  buildAiPlanningPrompt,
} from "../planning/handoffs.mjs"
import { getMyAtlasApiAccessToken } from "../auth/auth0"
import { requestMyAtlasTrips } from "../planning/tripClient.mjs"
import {
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
} from "../catalog/customPlace.mjs"
import { buildCanonicalTripMapRoute } from "../../../../shared/my-atlas-trips.mjs"
import { searchMyAtlasPlaces } from "../catalog/placeSearchClient.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import { buildSharedTripUrl } from "../planning/sharedTrip.mjs"

export default {
  name: "MyAtlasTrips",
  components: {
    MyAtlasExperiences,
    MyAtlasLocationPicker,
    MyAtlasTravelSearch,
    MyAtlasVisitManager,
  },
  props: {
    apiBaseUrl: { type: String, required: true },
    revision: { type: Number, required: true },
    resolveLink: { type: Function, default: null },
    profilePublic: { type: Boolean, default: false },
    scope: { type: String, default: "all" },
  },
  emits: [
    "changed",
    "action-feedback",
    "route-change",
    "location-placement-change",
    "open-change",
    "collection-change",
  ],
  data: () => ({
    open: false,
    loaded: false,
    pending: false,
    pendingAction: "",
    refreshNeeded: false,
    error: "",
    trips: [],
    upgraded: false,
    writesEnabled: false,
    rollbackAvailable: false,
    preview: null,
    confirmation: "",
    retentionAcknowledged: false,
    filter: "all",
    selectedId: "",
    creating: false,
    adding: false,
    draftTitle: "",
    draftLifecycle: "planned",
    draftStops: [],
    combineIds: [],
    combineTitle: "",
    groupDestinations: [],
    groupTitle: "",
    groupTargetId: "",
    destinations: [],
    ungroupedVisits: [],
    publicAtlasDraft: false,
    destinationGroupResolved: false,
    editingStopId: "",
    memoryDraft: "",
    titleDraft: "",
    descriptionDraft: "",
    travelTool: "",
    travelDrafts: {},
    travelContexts: {},
    directionsMode: "driving",
    routeReviewed: false,
    directions: [],
    dates: {
      plannedArrival: "",
      plannedDeparture: "",
      actualArrival: "",
      actualDeparture: "",
    },
    savedSequence: 0,
    attempt: null,
    currentRevision: 0,
    query: "",
    results: [],
    searchError: "",
    searchPending: false,
    searchTimer: null,
    searchSequence: 0,
    customName: "",
    latitude: "",
    longitude: "",
    placementActive: false,
  }),
  computed: {
    groupSavePending() {
      return (
        this.pending &&
        ["upgrade", "groupDestinations"].includes(this.pendingAction)
      )
    },
    groupTargets() {
      return this.trips.filter(
        trip =>
          trip.lifecycle === "past" &&
          trip.workflow === "saved" &&
          trip.sharing.publicAtlas === this.profilePublic
      )
    },
    canSaveDestinationGroup() {
      return (
        !this.busy &&
        this.groupDestinations.length > 0 &&
        this.groupDestinations.every(place =>
          /^pin_[a-f0-9]{24}$/.test(place.pinId || "")
        ) &&
        Boolean(this.groupTargetId || this.groupTitle.trim()) &&
        (this.upgraded || (this.preview?.ready && this.retentionAcknowledged))
      )
    },
    selectedTravelDraft: {
      get() {
        return (
          this.travelDrafts[this.selectedId] ||
          savedTripTravelDraft(this.selected) ||
          emptyTravelSearchDraft()
        )
      },
      set(value) {
        this.$set(this.travelDrafts, this.selectedId, value)
        this.$set(
          this.travelContexts,
          this.selectedId,
          this.selected.stops.map(stop => stop.stopId).join(",")
        )
      },
    },
    travelDetailsDirty() {
      const saved = savedTripTravelDraft(this.selected)
      return (
        !saved ||
        JSON.stringify(this.selectedTravelDraft) !== JSON.stringify(saved)
      )
    },
    travelContextChanged() {
      return Boolean(
        this.travelContexts[this.selectedId] &&
          this.travelContexts[this.selectedId] !==
            this.selected?.stops.map(stop => stop.stopId).join(",")
      )
    },
    selected() {
      return this.trips.find(trip => trip.tripId === this.selectedId) || null
    },
    filteredTrips() {
      return this.trips.filter(
        trip => this.filter === "all" || trip.lifecycle === this.filter
      )
    },
    busy() {
      return this.pending || this.refreshNeeded || !this.writesEnabled
    },
    customPlace() {
      const values = [this.longitude, this.latitude]
      return normalizeMyAtlasCustomPlace({
        name: this.customName,
        coordinates: values.every(value => String(value).trim() !== "")
          ? values.map(Number)
          : null,
      })
    },
  },
  watch: {
    scope: {
      immediate: true,
      handler(value) {
        this.filter = ["planned", "past"].includes(value) ? value : "all"
        if (
          this.selected &&
          this.filter !== "all" &&
          this.selected.lifecycle !== this.filter
        ) {
          this.selectedId = ""
          this.$emit("route-change", { active: false, route: [] })
        }
      },
    },
  },
  // Vue 2 owns this lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    clearTimeout(this.searchTimer)
    this.searchSequence++
    this.stopPlacement()
  },
  methods: {
    async prepareDestinationGroup(places) {
      this.destinationGroupResolved = false
      this.groupDestinations = places.map(place => ({
        pinId: place.pinId,
        placeId: place.placeId,
        name: place.name,
      }))
      this.combineIds = []
      this.combineTitle = ""
      this.groupTitle = ""
      this.groupTargetId = ""
      if (!this.loaded) return
      if (this.upgraded) this.applyDestinationGroup()
      else await this.previewUpgrade()
    },
    applyDestinationGroup() {
      if (!this.groupDestinations.length) return
      this.filter = "past"
      this.selectedId = ""
      this.creating = false
      this.adding = false
      this.$emit("route-change", { active: false, route: [] })
    },
    async enableTripOrganizing() {
      if (!this.preview?.ready || !this.retentionAcknowledged || this.busy)
        return
      await this.mutate("upgrade", {
        fingerprint: this.preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: true,
      })
    },
    async saveDestinationGroup() {
      if (!this.canSaveDestinationGroup) return
      if (!this.upgraded) await this.enableTripOrganizing()
      if (!this.upgraded || this.refreshNeeded) return
      await this.mutate("groupDestinations", {
        pinIds: this.groupDestinations.map(place => place.pinId),
        ...(this.groupTargetId
          ? { tripId: this.groupTargetId }
          : { title: this.groupTitle.trim() }),
      })
    },
    token() {
      return getMyAtlasApiAccessToken()
    },
    count(status) {
      return this.trips.filter(trip => trip.lifecycle === status).length
    },
    async shareTrip() {
      try {
        await navigator.clipboard.writeText(buildSharedTripUrl(this.selected))
        this.announce("Read only trip link copied.")
      } catch {
        this.announce("The trip link could not be copied.", "error")
      }
    },
    announce(message, tone = "success") {
      this.$emit("action-feedback", { message, tone })
    },
    async reveal() {
      this.open = true
      this.$emit("open-change", true)
      if (!this.loaded) await this.load()
    },
    close() {
      this.open = false
      this.$emit("open-change", false)
      this.stopPlacement()
      this.groupDestinations = []
      this.destinationGroupResolved = false
      this.$emit("route-change", { active: false, route: [] })
    },
    async call(options) {
      return requestMyAtlasTrips({
        apiBaseUrl: this.apiBaseUrl,
        accessToken: await this.token(),
        ...options,
      })
    },
    async load() {
      this.pending = true
      try {
        const state = await this.call({ action: "list" })
        this.destinations = state.destinations || []
        this.ungroupedVisits = state.ungroupedVisits || []
        this.trips = state.trips
        this.upgraded = state.upgraded
        this.writesEnabled = state.writesEnabled === true
        this.rollbackAvailable = state.rollbackAvailable
        this.currentRevision = state.profile.revision
        this.loaded = true
        this.refreshNeeded = false
        this.error = ""
        this.$emit("changed", state)
        this.$emit("collection-change", state)
        this.applyDestinationGroup()
        if (this.selected) this.select(this.selected, true)
        else this.$emit("route-change", { active: false, route: [] })
      } catch (error) {
        this.error =
          error.status === 404
            ? "This server does not yet support trips. Your existing Atlas is unchanged."
            : error.status === 401
              ? "Sign in again to load your trips. Your existing Atlas is unchanged."
              : "Trips could not be loaded. Refresh to retry. Your existing Atlas is unchanged."
      } finally {
        this.pending = false
      }
    },
    async previewUpgrade() {
      this.pending = true
      try {
        this.preview = await this.call({ action: "preview" })
        this.currentRevision = this.preview.revision
        this.error = ""
      } catch {
        this.error =
          "The trip upgrade preview could not be loaded. Your Atlas is unchanged."
      } finally {
        this.pending = false
      }
    },
    select(trip, keepEditor = false) {
      if (
        ["planned", "past"].includes(this.scope) &&
        trip.lifecycle !== this.scope
      ) {
        this.selectedId = ""
        this.$emit("route-change", { active: false, route: [] })
        return
      }
      this.selectedId = trip.tripId
      this.creating = false
      this.adding = false
      if (!keepEditor) {
        this.editingStopId = ""
        this.titleDraft = trip.title
        this.publicAtlasDraft = trip.sharing.publicAtlas
        this.descriptionDraft = trip.description
        this.travelTool = ""
      }
      if (
        this.editingStopId &&
        !trip.stops.some(stop => stop.stopId === this.editingStopId)
      )
        this.editingStopId = ""
      this.directions = []
      this.routeReviewed = false
      this.stopPlacement()
      this.$emit("route-change", {
        active: true,
        route: buildCanonicalTripMapRoute(trip),
        lifecycle: trip.lifecycle,
      })
    },
    startNew() {
      this.creating = true
      this.adding = false
      this.selectedId = ""
      this.draftTitle = ""
      this.draftLifecycle = this.scope === "past" ? "past" : "planned"
      this.draftStops = []
      this.$emit("route-change", { active: false, route: [] })
    },
    async mutate(action, body, tripId, stopId) {
      if (this.pending || this.refreshNeeded || !this.writesEnabled) return
      const fingerprint = JSON.stringify({ action, body, tripId, stopId })
      if (this.attempt?.fingerprint !== fingerprint)
        this.attempt = {
          fingerprint,
          revision: this.currentRevision || this.revision,
          key: crypto.randomUUID(),
        }
      this.pending = true
      this.error = ""
      this.announce("Saving trip changes.", "busy")
      this.pendingAction = action
      try {
        const result = await this.call({
          action,
          body,
          tripId,
          stopId,
          revision: this.attempt.revision,
          idempotencyKey: this.attempt.key,
        })
        this.currentRevision = result.profile.revision
        this.attempt = null
        this.savedSequence++
        this.creating = false
        this.adding = false
        this.stopPlacement()
        this.combineIds = []
        this.combineTitle = ""
        if (result.trip) {
          this.trips = this.trips.filter(
            trip =>
              trip.tripId !== result.trip.tripId &&
              !(action === "combine" && body.tripIds.includes(trip.tripId))
          )
          this.trips.push(result.trip)
          this.selectedId = result.trip.tripId
        }
        if (action === "delete") {
          this.trips = this.trips.filter(trip => trip.tripId !== tripId)
          this.selectedId = ""
        }
        this.upgraded = result.upgraded
        if (action === "logistics") this.$delete(this.travelDrafts, tripId)
        if (action === "groupDestinations") {
          this.groupDestinations = []
          this.groupTitle = ""
          this.groupTargetId = ""
        }
        if (action === "rollback") {
          this.preview = null
          this.confirmation = ""
          this.retentionAcknowledged = false
        }
        this.$emit("changed", { ...result, action })
        this.announce(
          action === "lifecycle"
            ? `Trip moved to ${body.lifecycle === "past" ? "Past" : "Planning"}.`
            : "Trip changes saved."
        )
        try {
          const state = await this.call({ action: "list" })
          this.destinations = state.destinations || []
          this.ungroupedVisits = state.ungroupedVisits || []
          this.trips = state.trips
          this.rollbackAvailable = state.rollbackAvailable
          this.currentRevision = state.profile.revision
          this.writesEnabled = state.writesEnabled === true
          this.$emit("collection-change", state)
          if (action === "upgrade") this.applyDestinationGroup()
          if (["combine", "groupDestinations"].includes(action)) {
            this.groupDestinations = []
            this.groupTitle = ""
            this.groupTargetId = ""
          }
          if (this.selected)
            this.select(
              this.selected,
              !["create", "combine", "groupDestinations", "transfer"].includes(
                action
              )
            )
          else this.$emit("route-change", { active: false, route: [] })
        } catch {
          this.refreshNeeded = true
          this.announce(
            "Your change was saved. Refresh trips before making another change.",
            "warning"
          )
        }
      } catch (error) {
        if (
          error.code === "revision_conflict" ||
          error.code === "upgrade_source_changed"
        ) {
          this.attempt = null
          this.refreshNeeded = true
          this.error =
            "Your Atlas changed. Refresh trips, review your draft and retry."
        } else
          this.error =
            error.code === "trip_writes_disabled"
              ? "The trip upgrade is disabled on this server."
              : "The change could not be confirmed. Your draft is still here. Retry or refresh trips."
        this.announce(this.error, "error")
      } finally {
        this.pending = false
        this.pendingAction = ""
      }
    },
    editStop(stop) {
      this.editingStopId = stop.stopId
      this.memoryDraft =
        stop.memories.find(memory => memory.kind === "note")?.text || ""
      this.dates = {
        plannedArrival: stop.plannedDates.arrival || "",
        plannedDeparture: stop.plannedDates.departure || "",
        actualArrival: stop.actualDates.arrival || "",
        actualDeparture: stop.actualDates.departure || "",
      }
    },
    openTrip(id) {
      const trip = this.trips.find(item => item.tripId === id)
      if (trip) this.select(trip)
    },
    async saveTravelDetails() {
      try {
        await this.mutate(
          "logistics",
          { draft: normalizeTripTravelDraft(this.selectedTravelDraft) },
          this.selected.tripId
        )
      } catch {
        this.announce(
          "Check your travel details and date order before saving.",
          "error"
        )
      }
    },
    toolPlan() {
      return {
        start: this.selected.stops[0].place,
        stops: this.selected.stops.slice(1).map(stop => stop.place),
        endMode: "last-stop",
        end: null,
      }
    },
    prepareDirections() {
      try {
        this.directions = buildGoogleMapsRouteHandoffs(this.toolPlan(), {
          defaultMode: this.directionsMode,
          confirmedCoordinatePlaceIds: this.routeReviewed
            ? this.selected.stops
                .filter(stop => stop.place.placeType === "custom")
                .map(stop => stop.place.placeId)
            : [],
        }).actions
        this.error = ""
      } catch (error) {
        this.error = error.message
      }
    },
    async copyPrompt() {
      try {
        await navigator.clipboard.writeText(
          buildAiPlanningPrompt(this.toolPlan())
        )
        this.announce("Planning prompt copied.")
      } catch {
        this.announce("The planning prompt could not be copied.", "error")
      }
    },
    moveStop(index, direction) {
      const stopIds = this.selected.stops.map(stop => stop.stopId)
      ;[stopIds[index], stopIds[index + direction]] = [
        stopIds[index + direction],
        stopIds[index],
      ]
      this.mutate("reorder", { stopIds }, this.selected.tripId)
    },
    removeStop(stop) {
      const content =
        stop.memories.length ||
        stop.experiences.length ||
        stop.visitedDates.length ||
        stop.planNote
      if (
        content &&
        !window.confirm(
          `Remove ${stop.place.name} and its saved memories and experiences?`
        )
      )
        return
      this.mutate(
        "removeStop",
        { discardContent: Boolean(content) },
        this.selected.tripId,
        stop.stopId
      )
    },
    deleteTrip() {
      if (
        window.confirm(
          `Delete ${this.selected.title} and its stops and memories?`
        )
      )
        this.mutate(
          "delete",
          { confirmation: "DELETE TRIP" },
          this.selected.tripId
        )
    },
    rollback() {
      if (
        window.confirm(
          "Undo trip organization and restore your original Atlas records?"
        )
      )
        this.mutate("rollback", {})
    },
    choose(selection, name) {
      if (this.creating) {
        if (this.draftStops.length >= 50) return
        this.draftStops.push({ selection, name })
        this.announce(
          `${name} added to this trip draft. Save the trip to keep it.`,
          "draft"
        )
        this.stopPlacement()
      } else if (this.selected)
        this.mutate("addStop", selection, this.selected.tripId)
    },
    queueSearch() {
      clearTimeout(this.searchTimer)
      const sequence = ++this.searchSequence
      this.results = []
      this.searchError = ""
      this.searchPending = false
      if (this.query.trim().length < 4) return
      this.searchPending = true
      this.searchTimer = setTimeout(async () => {
        try {
          const result = await searchMyAtlasPlaces({
            query: this.query,
            endpoint: getMyAtlasPlaceSearchEndpoint(
              process.env,
              window.location.origin
            ),
          })
          if (sequence === this.searchSequence)
            this.results = result.places || result
        } catch {
          if (sequence === this.searchSequence)
            this.searchError =
              "Search is unavailable. You can still add a custom stop."
        } finally {
          if (sequence === this.searchSequence) this.searchPending = false
        }
      }, 300)
    },
    syncPlacement() {
      const values = [this.longitude, this.latitude]
      this.$emit("location-placement-change", {
        active: this.placementActive,
        coordinates: values.every(value => String(value).trim() !== "")
          ? normalizeMyAtlasCustomCoordinates(values.map(Number))
          : null,
      })
    },
    beginPlacement() {
      this.placementActive = true
      if (!this.customName) this.customName = this.query
      this.syncPlacement()
    },
    stopPlacement() {
      this.placementActive = false
      this.$emit("location-placement-change", {
        active: false,
        coordinates: null,
      })
    },
    setCoordinates(value) {
      const coordinates = normalizeMyAtlasCustomCoordinates(value)
      if (!coordinates || !this.placementActive) return
      this.longitude = String(coordinates[0])
      this.latitude = String(coordinates[1])
      this.syncPlacement()
    },
  },
}
</script>

<style scoped>
.atlas-trips,
.trip-form {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.atlas-trips {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  border-radius: 16px;
}
.atlas-trips header,
.trip-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.atlas-trips header {
  justify-content: space-between;
}
.atlas-trips h2,
.atlas-trips h3,
.atlas-trips p {
  margin: 0;
}
.atlas-trips h2 {
  font-size: 1.25rem;
}
.atlas-trips h3 {
  font-size: 1.1rem;
}
.atlas-trips p,
.atlas-trips li,
.atlas-trips label {
  font-size: 0.78rem;
  line-height: 1.6;
}
.atlas-trips label {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.atlas-trips button {
  padding: 9px 11px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 9px;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
}
.atlas-trips button:disabled {
  opacity: 0.5;
  cursor: default;
}
.atlas-trips input,
.atlas-trips textarea,
.atlas-trips select {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 8px;
  color: inherit;
  background: var(--color-surface, #112124);
  font: inherit;
}
.atlas-trips .trip-check {
  display: flex;
  align-items: center;
  gap: 8px;
}
.atlas-trips .trip-check input {
  position: static;
  opacity: 1;
  pointer-events: auto;
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  appearance: auto;
  padding: 0;
  margin: 0;
  accent-color: var(--color-accent, #e6ba68);
}
.trip-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.trip-list li {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trip-list li > button {
  display: grid;
  gap: 4px;
  flex: 1;
  text-align: left;
}
.trip-list [aria-pressed="true"] {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.1);
}
.trip-stops {
  display: grid;
  gap: 16px;
  padding-left: 22px;
}
.trip-stops > li > small {
  margin-left: 0.5em;
}
.trip-form {
  padding: 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.18);
  border-radius: 12px;
}
.trip-controls button {
  min-height: 34px;
}
.trip-controls > label {
  flex: 1 1 150px;
}
.trip-date-fields {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
