<!-- eslint-disable vue/no-deprecated-v-on-native-modifier -- Vue 2 RouterLink click tracking uses native listeners. -->
<template>
  <main
    class="atlas-page"
    :class="{
      'is-reading': storyMode,
      'has-detail': currentNode && !storyMode,
    }"
  >
    <AtlasMap
      ref="atlasMap"
      :nodes="visibleNodes"
      :journey-nodes="journeyNodes"
      :selected-node="currentNode"
      :camera="activeCamera"
      :guided-controls-visible="Boolean(guidedJourney)"
      :journey-travel="guidedTravel"
      @ready="handleMapReady"
      @select="selectNodeFromMap"
      @camera-change="rememberCamera"
      @manual-interaction="pauseGuidedJourney('map')"
    />

    <header class="atlas-toolbar">
      <a class="atlas-brand" href="/" aria-label="Roam With Justin home">
        <BrandMark />
        <strong>Travel Atlas</strong>
      </a>
      <AtlasBreadcrumbs
        :crumbs="breadcrumbs"
        @select="selectNodeFromBreadcrumbs"
      />
      <div class="atlas-tools">
        <ThemeSelector align="start" />
        <button
          v-if="storyAvailable && !storyMode"
          class="atlas-story-link"
          type="button"
          @click="openStory('atlas_toolbar')"
        >
          Story
        </button>
        <router-link
          v-if="myAtlasEnabled"
          class="atlas-my-atlas-link"
          to="/my-atlas"
          aria-label="Open My Atlas"
        >
          My Atlas
        </router-link>
        <button
          class="atlas-surprise"
          type="button"
          aria-label="Surprise me with an Atlas stop"
          @click="surpriseMe"
        >
          <span class="atlas-surprise-desktop">Surprise me</span>
          <span class="atlas-surprise-mobile" aria-hidden="true">
            Surprise
          </span>
        </button>
        <button
          class="atlas-saved-trigger"
          type="button"
          aria-label="Open saved Atlas places"
          @click="savedOpen = true"
        >
          <span class="atlas-saved-label">Saved</span>
          <span class="atlas-saved-icon" aria-hidden="true">&#9825;</span>
          <span class="atlas-saved-count">{{ favoriteNodes.length }}</span>
        </button>
      </div>
    </header>

    <aside
      v-if="myAtlasEnabled && myAtlasInviteVisible && !storyMode"
      class="atlas-my-atlas-toast"
      role="status"
    >
      <div>
        <strong>Make your own Atlas.</strong>
        <p>
          Save where you have been and build private plans for what is next.
        </p>
      </div>
      <div class="atlas-my-atlas-toast-actions">
        <router-link to="/my-atlas" @click.native="dismissMyAtlasInvite">
          Open My Atlas
        </router-link>
        <button type="button" @click="dismissMyAtlasInvite">Dismiss</button>
      </div>
    </aside>

    <AtlasJourneyPlayer
      v-if="guidedJourney && !storyMode"
      :journey="guidedJourney"
      :status="guidedStatus"
      :current-index="guidedIndex"
      :transition-label="guidedTransitionLabel"
      @start="startGuidedJourney"
      @previous="goToPreviousGuidedStop"
      @next="goToNextGuidedStop"
      @pause="pauseGuidedJourney('control')"
      @resume="resumeGuidedJourney"
      @finish="finishGuidedJourney"
      @replay="startGuidedJourney"
      @exit="exitGuidedJourney"
      @layout-change="handleGuidedLayoutChange"
    />

    <section
      v-if="!currentNode"
      class="atlas-welcome"
      :class="{ 'is-collapsed': !welcomeExpanded }"
      aria-label="Atlas journey explorer"
    >
      <button
        class="atlas-welcome-toggle"
        type="button"
        aria-controls="atlas-welcome-content"
        :aria-expanded="String(welcomeExpanded)"
        @click="toggleWelcome"
      >
        <span class="atlas-welcome-toggle-copy">
          <strong>
            {{
              welcomeExpanded
                ? "Choose a place to begin"
                : `${storyRootNodes.length} stories to explore`
            }}
          </strong>
        </span>
        <span class="atlas-welcome-toggle-action">
          {{ welcomeExpanded ? "Collapse" : "Open" }}
          <b aria-hidden="true">{{ welcomeExpanded ? "-" : "+" }}</b>
        </span>
      </button>

      <div
        v-show="welcomeExpanded"
        id="atlas-welcome-content"
        class="atlas-welcome-content"
      >
        <div class="atlas-welcome-intro">
          <h1>The journey starts with a place.</h1>
          <p>
            Open a travel story with its mapped route, photographs, and films.
          </p>
        </div>

        <div
          class="atlas-journey-nav"
          role="navigation"
          aria-label="Mapped journeys"
        >
          <button
            v-for="node in storyRootNodes"
            :key="node.id"
            type="button"
            @click="
              selectNode(node.id, { analyticsSurface: 'journey_explorer' })
            "
          >
            <span>Explore</span>
            <strong>{{ node.title }}</strong>
            <small v-if="node.dateLabel">{{ node.dateLabel }}</small>
          </button>
        </div>

        <div class="atlas-welcome-actions">
          <button
            v-if="resumeNode"
            class="secondary"
            type="button"
            @click="
              selectNode(resumeNode.id, {
                analyticsSurface: 'journey_explorer',
              })
            "
          >
            Resume {{ resumeNode.title }}
          </button>
          <router-link class="atlas-journey-library" to="/trips">
            Browse all journeys
          </router-link>
        </div>
      </div>
    </section>

    <AtlasDetailPanel
      v-if="currentNode && !storyMode"
      ref="detailPanel"
      :node="currentNode"
      :children="childNodes"
      :related="relatedNodes"
      :adjacent-stops="adjacentStops"
      :is-favorite="favorites.includes(currentNode.id)"
      :saved-count="favoriteNodes.length"
      :expand-request="mapPinExpandRequest"
      :collapse-request="detailCollapseRequest"
      :guided-presentation="
        guidedStatus === 'at-stop' || guidedStatus === 'complete'
      "
      :guided-controls-expanded="guidedPanelExpanded"
      :guided-controls-clearance="guidedPanelClearance"
      :show-ad="atlasAdVisible"
      :ad-slot-id="atlasAdSlotId"
      @close="goToParent"
      @select="selectNodeFromDetail"
      @action="trackAtlasAction"
      @open-story="openStory('detail_panel')"
      @open-story-section="openStory('stop_story_preview', $event)"
      @toggle-favorite="toggleFavorite"
    />

    <AtlasStoryReader
      v-if="currentNode && storyMode && storyTrip"
      ref="storyReader"
      :trip="storyTrip"
      :initial-scroll="readerScrollPositions[currentNode.id] || 0"
      :initial-section-id="readerSectionId"
      @close="closeStory"
      @scroll-position="rememberReaderScroll"
      @show-stop="showStoryStop"
    />

    <div class="atlas-provider-note">
      {{
        hasCinematicMap
          ? "MapTiler satellite terrain"
          : "MapTiler configuration required"
      }}
    </div>

    <AtlasSavedDrawer
      :open="savedOpen"
      :favorites="favoriteNodes"
      :recent="recentNodes"
      @close="savedOpen = false"
      @select="selectFromSaved"
    />

    <p class="atlas-announcement" aria-live="polite">{{ announcement }}</p>
  </main>
</template>

<script>
import AtlasBreadcrumbs from "../components/AtlasBreadcrumbs.vue"
import AtlasDetailPanel from "../components/AtlasDetailPanel.vue"
import AtlasJourneyPlayer from "../components/AtlasJourneyPlayer.vue"
import AtlasMap from "../components/AtlasMap.vue"
import AtlasSavedDrawer from "../components/AtlasSavedDrawer.vue"
import AtlasStoryReader from "../components/AtlasStoryReader.vue"
import { adSenseConfig } from "@/config/adsense.mjs"
import { isMyAtlasGeographicProofEnabled } from "@/features/my-atlas/config/featureFlags.mjs"
import { hasMapTilerKey } from "../config/mapConfig"
import { getAtlasPinFocusCamera } from "../config/markerLayout.mjs"
import { selectAtlasSurprisePlace } from "../config/surpriseSelection.mjs"
import {
  isAtlasAdEligible,
  reserveAtlasAdRequest,
} from "../config/atlasAdEligibility.mjs"
import {
  atlasRootIds,
  getCompletedAtlasPlaces,
  getAtlasJourneyNodes,
  getAtlasLineage,
  getAtlasNode,
  getAtlasNodes,
  getGuidedJourneyViewModel,
} from "@/content/selectors/atlas"
import { getTripViewModel } from "@/content/selectors/trips"
import { loadAtlasState, saveAtlasState } from "../state/atlasStorage"
import {
  consumeAtlasEntrySurface,
  getDeviceCategory,
  trackAnalyticsEvent,
} from "@/utils/analytics.mjs"

const MY_ATLAS_INVITE_STORAGE_KEY = "rwj:atlas:my-atlas-invite:v1"

const worldCamera = {
  // Offset the world view west so both American and European roots remain
  // visible beside the journey explorer launcher instead of beneath it.
  center: [-65, 29],
  zoom: 1.3,
  pitch: 10,
  bearing: 0,
}

export default {
  name: "AtlasView",
  components: {
    AtlasBreadcrumbs,
    AtlasDetailPanel,
    AtlasJourneyPlayer,
    AtlasMap,
    AtlasSavedDrawer,
    AtlasStoryReader,
  },
  props: {
    nodeId: {
      type: String,
      default: "",
    },
    storyMode: Boolean,
  },
  data() {
    return {
      favorites: [],
      myAtlasEnabled: isMyAtlasGeographicProofEnabled(process.env),
      myAtlasInviteVisible: false,
      recent: [],
      lastContext: null,
      cameras: {},
      savedOpen: false,
      announcement: "",
      previousTitle: "",
      previousSurpriseNodeId: "",
      stateLoaded: false,
      // Keep the root Atlas map ready for immediate interaction. The compact
      // journey explorer launcher remains available for deliberate browsing.
      welcomeExpanded: false,
      mapPinExpandRequest: 0,
      pendingMapPinNodeId: null,
      detailCollapseRequest: 0,
      guidedStatus: "idle",
      guidedPanelExpanded: false,
      guidedPanelClearance: 0,
      guidedIndex: -1,
      guidedTravel: null,
      guidedTravelSerial: 0,
      guidedArrivalTimer: null,
      guidedArrivalDeadline: 0,
      guidedRemainingMs: 0,
      guidedVisitedStopIds: [],
      atlasAdNodeId: "",
      detailScrollPositions: {},
      readerEntryNodeId: "",
      readerScrollPositions: {},
      storyRobotsElement: null,
    }
  },
  computed: {
    hasCinematicMap() {
      return hasMapTilerKey
    },
    currentNode() {
      return getAtlasNode(this.nodeId)
    },
    guidedJourney() {
      return getGuidedJourneyViewModel(this.currentNode?.journeyId)
    },
    storyTrip() {
      const href = this.currentNode?.actions.find(
        action => action.analyticsType === "story"
      )?.href
      const slug = href?.split("/").filter(Boolean).pop() || ""
      return slug ? getTripViewModel(slug) : null
    },
    storyAvailable() {
      return Boolean(this.storyTrip)
    },
    readerSectionId() {
      const sectionId = this.$route.query.section
      if (typeof sectionId !== "string" || !this.storyTrip) return ""

      const validSectionIds = [
        ...this.storyTrip.days.map(day => day.id),
        ...this.storyTrip.experiences.map(
          experience => `experience-${experience.slug}`
        ),
      ]
      return validSectionIds.includes(sectionId) ? sectionId : ""
    },
    guidedIsActive() {
      return this.guidedStatus !== "idle"
    },
    guidedStop() {
      return this.guidedJourney?.stops?.[this.guidedIndex] || null
    },
    atlasAdVisible() {
      return Boolean(
        this.atlasAdNodeId && this.currentNode?.id === this.atlasAdNodeId
      )
    },
    atlasAdSlotId() {
      return adSenseConfig.atlasSlotId
    },
    guidedTransitionLabel() {
      if (this.guidedStatus !== "traveling" || !this.guidedStop) return ""

      const mode = this.guidedTravel?.mode
      return mode
        ? `Traveling by ${mode} to ${this.guidedStop.title}`
        : `Following the route to ${this.guidedStop.title}`
    },
    childNodes() {
      return getAtlasJourneyNodes(this.currentNode)
    },
    relatedNodes() {
      return getAtlasNodes(this.currentNode?.relatedIds)
    },
    adjacentStops() {
      const stops = this.guidedJourney?.stops || []
      const currentIndex = stops.findIndex(
        stop => stop.id === this.currentNode?.id
      )
      if (currentIndex < 0) return []

      return [
        currentIndex > 0
          ? { direction: "Previous stop", node: stops[currentIndex - 1] }
          : null,
        currentIndex < stops.length - 1
          ? { direction: "Next stop", node: stops[currentIndex + 1] }
          : null,
      ].filter(Boolean)
    },
    journeyNodes() {
      if (!this.currentNode) return []

      const journeyParent = this.currentNode.childIds.length
        ? this.currentNode
        : getAtlasNode(this.currentNode.parentId)

      return getAtlasJourneyNodes(journeyParent)
    },
    visibleNodes() {
      if (!this.currentNode) return getAtlasNodes(atlasRootIds)

      const discoveries = this.journeyNodes.length
        ? this.journeyNodes
        : this.relatedNodes

      return [this.currentNode, ...discoveries].filter(
        (node, index, items) =>
          items.findIndex(candidate => candidate.id === node.id) === index
      )
    },
    breadcrumbs() {
      const crumbs = [{ id: null, title: "World" }]
      if (!this.currentNode) return crumbs

      return [
        ...crumbs,
        ...getAtlasLineage(this.currentNode).map(node => ({
          id: node.id,
          title: node.title,
        })),
      ]
    },
    activeCamera() {
      if (!this.currentNode) return worldCamera
      if (this.guidedIsActive && this.guidedStop?.id === this.currentNode.id) {
        return this.cameras[this.currentNode.id] || this.guidedStop.camera
      }
      return this.cameras[this.currentNode.id] || this.currentNode.camera
    },
    favoriteNodes() {
      return getAtlasNodes(this.favorites)
    },
    recentNodes() {
      return getAtlasNodes(this.recent)
    },
    resumeNode() {
      return getAtlasNode(this.lastContext?.nodeId)
    },
    rootNodes() {
      return getAtlasNodes(atlasRootIds)
    },
    storyRootNodes() {
      return this.rootNodes.filter(node => Boolean(node.storyLead))
    },
  },
  watch: {
    nodeId(nodeId) {
      // Returning to the root restores the map-first landing state, including
      // browser back and the World breadcrumb.
      if (!nodeId) this.welcomeExpanded = false
      if (this.atlasAdNodeId && nodeId !== this.atlasAdNodeId) {
        this.atlasAdNodeId = ""
      }
      if (this.stateLoaded) this.handleRoute(nodeId)
      if (this.pendingMapPinNodeId === nodeId) {
        this.pendingMapPinNodeId = null
        this.requestMapPinExpansion()
      }
      if (this.storyMode) this.handleStoryState()
    },
    storyMode(isReading, wasReading) {
      this.handleStoryState()
      if (!isReading && wasReading) {
        this.$nextTick(this.restoreDetailContext)
      }
    },
    guidedJourney(nextJourney, previousJourney) {
      if (
        this.guidedIsActive &&
        previousJourney?.id &&
        nextJourney?.id !== previousJourney.id
      ) {
        this.exitGuidedJourney(false)
      }
    },
  },
  mounted() {
    this.previousTitle = document.title

    if (this.myAtlasEnabled) {
      try {
        this.myAtlasInviteVisible =
          window.sessionStorage.getItem(MY_ATLAS_INVITE_STORAGE_KEY) !==
          "hidden"
      } catch {
        this.myAtlasInviteVisible = true
      }
    }

    const stored = loadAtlasState()
    this.favorites = stored.favorites
    this.recent = stored.recent
    this.lastContext = stored.lastContext

    if (stored.lastContext) {
      this.$set(
        this.cameras,
        stored.lastContext.nodeId,
        stored.lastContext.camera
      )
    }

    this.stateLoaded = true
    this.handleRoute(this.nodeId)
    this.handleStoryState()
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.clearGuidedArrivalTimer()
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    )
    this.setStoryRobots(false)
    document.title = this.previousTitle
  },
  methods: {
    dismissMyAtlasInvite() {
      this.myAtlasInviteVisible = false
      try {
        window.sessionStorage.setItem(MY_ATLAS_INVITE_STORAGE_KEY, "hidden")
      } catch {
        // The invitation still dismisses for the current view.
      }
    },
    handleMapReady() {
      trackAnalyticsEvent("atlas_loaded", {
        device_category: getDeviceCategory(),
        entry_surface: consumeAtlasEntrySurface(),
      })
    },
    trackNodeOpen(nodeId, surface) {
      const node = getAtlasNode(nodeId)
      if (!node) return

      if (!node.parentId) {
        trackAnalyticsEvent("atlas_journey_opened", {
          public_journey_id: node.journeyId || node.id,
          surface,
        })
        return
      }

      trackAnalyticsEvent("atlas_destination_opened", {
        content_type: "place",
        public_destination_id: node.id,
        surface,
      })
    },
    trackStoryOpen(surface) {
      if (!this.currentNode?.journeyId) return
      trackAnalyticsEvent("atlas_story_opened", {
        public_story_id: this.currentNode.journeyId,
        surface,
      })
    },
    openStory(surface = "detail_panel", sectionId = "") {
      if (!this.currentNode || !this.storyAvailable || this.storyMode) return

      if (this.guidedIsActive) this.exitGuidedJourney(false)
      this.$set(
        this.detailScrollPositions,
        this.currentNode.id,
        this.$refs.detailPanel?.getScrollPosition() || 0
      )
      this.readerEntryNodeId = this.currentNode.id
      if (sectionId) {
        this.$set(this.readerScrollPositions, this.currentNode.id, 0)
      }
      this.trackStoryOpen(surface)
      const query = { ...this.$route.query, story: "1" }
      if (sectionId) query.section = sectionId
      else delete query.section
      this.$router.push({
        name: "TravelAtlas",
        params: { nodeId: this.currentNode.id },
        query,
      })
    },
    closeStory() {
      if (!this.currentNode) return

      this.rememberReaderScroll(
        this.$refs.storyReader?.getScrollPosition() || 0
      )
      if (this.readerEntryNodeId === this.currentNode.id) {
        this.$router.back()
        return
      }

      const query = { ...this.$route.query }
      delete query.story
      delete query.section
      this.$router.replace({
        name: "TravelAtlas",
        params: { nodeId: this.currentNode.id },
        query,
      })
    },
    rememberReaderScroll(position) {
      if (!this.currentNode) return
      this.$set(
        this.readerScrollPositions,
        this.currentNode.id,
        Math.max(0, Number(position) || 0)
      )
    },
    restoreDetailContext() {
      if (!this.currentNode) return
      this.$refs.detailPanel?.restoreScroll(
        this.detailScrollPositions[this.currentNode.id] || 0
      )
      this.$nextTick(() => this.$refs.detailPanel?.focusStoryAction())
    },
    showStoryStop(location) {
      if (!location?.atlasNodeId) return

      this.rememberReaderScroll(
        this.$refs.storyReader?.getScrollPosition() || 0
      )
      if (location.atlasNodeId === this.currentNode?.id) {
        this.trackNodeOpen(location.atlasNodeId, "story_reader")
        this.$router
          .push({
            name: "TravelAtlas",
            params: { nodeId: location.atlasNodeId },
          })
          .then(() => this.requestMapPinExpansion())
        return
      }
      this.pendingMapPinNodeId = location.atlasNodeId
      this.selectNode(location.atlasNodeId, {
        analyticsSurface: "story_reader",
      })
    },
    handleStoryState() {
      if (this.storyMode && (!this.currentNode || !this.storyAvailable)) {
        const query = { ...this.$route.query }
        delete query.story
        delete query.section
        this.$router.replace({
          name: "TravelAtlas",
          params: { nodeId: this.currentNode?.id || this.nodeId || undefined },
          query,
        })
        return
      }

      if (
        this.storyMode &&
        this.$route.query.section &&
        !this.readerSectionId
      ) {
        const query = { ...this.$route.query }
        delete query.section
        this.$router.replace({
          name: "TravelAtlas",
          params: { nodeId: this.currentNode?.id || this.nodeId || undefined },
          query,
        })
        return
      }

      this.setStoryRobots(this.storyMode)
      this.updateDocumentTitle()
    },
    setStoryRobots(isReading) {
      if (!isReading) {
        this.storyRobotsElement?.remove()
        this.storyRobotsElement = null
        return
      }

      if (this.storyRobotsElement) return
      const element = document.createElement("meta")
      element.name = "robots"
      element.content = "noindex,follow"
      element.dataset.atlasStoryReader = "true"
      document.head.appendChild(element)
      this.storyRobotsElement = element
    },
    trackAtlasAction(action) {
      if (action?.analyticsType === "maps") {
        trackAnalyticsEvent("maps_handoff_clicked", {
          content_type: "place",
          surface: "detail_panel",
        })
      } else if (action?.analyticsType === "story") {
        trackAnalyticsEvent("atlas_story_opened", {
          public_story_id:
            action.publicStoryId || this.currentNode?.journeyId || "",
          surface: "detail_panel",
        })
      }
    },
    selectNodeFromBreadcrumbs(nodeId) {
      this.selectNode(nodeId, { analyticsSurface: "breadcrumbs" })
    },
    selectNodeFromDetail(nodeId) {
      this.selectNode(nodeId, { analyticsSurface: "detail_panel" })
    },
    handleGuidedLayoutChange({ expanded = false, clearance = 0 } = {}) {
      this.guidedPanelExpanded = expanded
      this.guidedPanelClearance = clearance
    },
    handleRoute(nodeId) {
      if (nodeId && !getAtlasNode(nodeId)) {
        this.$router.replace({ name: "TravelAtlas" })
        return
      }

      const node = getAtlasNode(nodeId)
      if (!node) {
        this.updateDocumentTitle()
        return
      }

      this.recent = [
        node.id,
        ...this.recent.filter(item => item !== node.id),
      ].slice(0, 10)
      this.lastContext = {
        nodeId: node.id,
        camera: this.cameras[node.id] || node.camera,
      }
      this.persist()
      this.updateDocumentTitle()
    },
    selectNode(nodeId, options = {}) {
      if (this.guidedIsActive && !options.preserveGuided) {
        this.exitGuidedJourney(false)
      }
      this.savedOpen = false
      const target = nodeId
        ? { name: "TravelAtlas", params: { nodeId } }
        : { path: "/atlas" }

      if ((nodeId || "") === (this.nodeId || "")) return
      if (nodeId && options.analyticsSurface) {
        this.trackNodeOpen(nodeId, options.analyticsSurface)
      }
      this.$router.push(target)
    },
    selectNodeFromMap(nodeId) {
      let preserveGuided = false
      if (this.guidedIsActive) {
        this.clearGuidedArrivalTimer()
        this.$refs.atlasMap?.pauseJourneyTravel()
        this.guidedTravel = null

        const guidedIndex = this.guidedJourney?.stops.findIndex(
          stop => stop.id === nodeId
        )
        if (guidedIndex >= 0) {
          this.guidedIndex = guidedIndex
          this.guidedStatus = "at-stop"
          preserveGuided = true
          this.announcement = `${this.guidedJourney.stops[guidedIndex].title}, stop ${guidedIndex + 1} of ${this.guidedJourney.stopCount}`
        } else {
          this.exitGuidedJourney(false)
        }
      }

      const selectedNode = getAtlasNode(nodeId)
      const focusCamera = getAtlasPinFocusCamera(selectedNode)
      if (focusCamera) {
        this.$set(this.cameras, nodeId, focusCamera)
      }

      if ((nodeId || "") === (this.nodeId || "")) {
        this.requestMapPinExpansion()
        return
      }

      this.pendingMapPinNodeId = nodeId
      this.selectNode(nodeId, {
        analyticsSurface: "map_marker",
        preserveGuided,
      })
    },
    requestMapPinExpansion() {
      // AtlasDetailPanel resets when its node changes. Issue the expansion on
      // the following render so that reset happens before the mobile request.
      this.$nextTick(() => {
        this.mapPinExpandRequest += 1
      })
    },
    startGuidedJourney() {
      if (!this.guidedJourney) return

      this.clearGuidedArrivalTimer()
      this.$refs.atlasMap?.cancelJourneyTravel()
      this.guidedStatus = "idle"
      this.guidedIndex = -1
      this.guidedTravel = null
      this.guidedVisitedStopIds = []
      this.atlasAdNodeId = ""
      this.goToGuidedStop(0)
    },
    goToGuidedStop(index) {
      const target = this.guidedJourney?.stops?.[index]
      if (!target) return

      const previousIndex = this.guidedIndex
      const previousStop = this.guidedJourney.stops[previousIndex] || null
      const transitionSource =
        index > previousIndex
          ? previousStop
          : this.guidedJourney.stops[index] || null
      const mode = transitionSource?.transitionToNext?.mode || null
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 80
        : 1800

      this.clearGuidedArrivalTimer()
      this.guidedIndex = index
      this.guidedStatus = "traveling"
      this.guidedRemainingMs = duration
      this.guidedArrivalDeadline = Date.now() + duration
      this.detailCollapseRequest += 1
      this.guidedTravelSerial += 1
      this.guidedTravel = {
        id: this.guidedTravelSerial,
        fromCoordinates: previousStop?.coordinates || null,
        toCoordinates: target.coordinates,
        mode,
        duration,
      }

      this.selectNode(target.id, {
        analyticsSurface: "guided_journey",
        preserveGuided: true,
      })
      this.scheduleGuidedArrival(duration)
      this.announcement = `Traveling to ${target.title}, stop ${index + 1} of ${this.guidedJourney.stopCount}`
    },
    scheduleGuidedArrival(duration) {
      this.guidedArrivalTimer = window.setTimeout(
        this.arriveAtGuidedStop,
        Math.max(1, duration)
      )
    },
    arriveAtGuidedStop() {
      this.clearGuidedArrivalTimer()
      this.guidedTravel = null
      this.guidedRemainingMs = 0
      this.guidedStatus = "at-stop"
      this.requestMapPinExpansion()
      this.recordGuidedStopArrival()

      if (this.guidedStop) {
        this.announcement = `${this.guidedStop.title}, stop ${this.guidedIndex + 1} of ${this.guidedJourney.stopCount}. Journey paused.`
      }
    },
    recordGuidedStopArrival() {
      const stopId = this.guidedStop?.id
      if (!stopId || stopId !== this.currentNode?.id) return

      if (!this.guidedVisitedStopIds.includes(stopId)) {
        this.guidedVisitedStopIds = [...this.guidedVisitedStopIds, stopId]
      }
      this.$nextTick(this.maybeOfferAtlasAd)
    },
    maybeOfferAtlasAd() {
      if (
        !isAtlasAdEligible({
          atlasReady: adSenseConfig.atlasReady,
          journey: this.guidedJourney,
          currentStop: this.guidedStop,
          guidedStatus: this.guidedStatus,
          visitedStopIds: this.guidedVisitedStopIds,
        }) ||
        this.currentNode?.id !== this.guidedStop?.id
      ) {
        return
      }

      let storage = null
      try {
        storage = window.sessionStorage
      } catch (error) {
        return
      }

      if (!reserveAtlasAdRequest(storage, this.guidedJourney.id)) return
      this.atlasAdNodeId = this.currentNode.id
    },
    pauseGuidedJourney(source = "control") {
      if (this.guidedStatus !== "traveling") return

      this.guidedRemainingMs = Math.max(
        100,
        this.guidedArrivalDeadline - Date.now()
      )
      this.clearGuidedArrivalTimer()
      this.$refs.atlasMap?.pauseJourneyTravel()
      this.guidedStatus = "paused-travel"
      this.announcement =
        source === "map"
          ? "Guided journey paused because you took control of the map"
          : "Guided journey paused"
    },
    resumeGuidedJourney() {
      if (this.guidedStatus !== "paused-travel" || !this.guidedStop) return

      const duration = Math.max(100, this.guidedRemainingMs || 800)
      this.guidedStatus = "traveling"
      this.guidedArrivalDeadline = Date.now() + duration
      this.$refs.atlasMap?.resumeJourneyTravel(this.guidedStop.camera, duration)
      this.scheduleGuidedArrival(duration)
      this.announcement = `Guided journey resumed toward ${this.guidedStop.title}`
    },
    goToPreviousGuidedStop() {
      if (this.guidedIndex <= 0) return
      this.goToGuidedStop(this.guidedIndex - 1)
    },
    goToNextGuidedStop() {
      if (!this.guidedJourney) return
      if (this.guidedIndex >= this.guidedJourney.stopCount - 1) {
        this.finishGuidedJourney()
        return
      }
      this.goToGuidedStop(this.guidedIndex + 1)
    },
    finishGuidedJourney() {
      this.clearGuidedArrivalTimer()
      this.$refs.atlasMap?.cancelJourneyTravel()
      this.guidedTravel = null
      this.guidedStatus = "complete"
      this.announcement = `${this.guidedJourney?.title || "Guided journey"} complete`
    },
    exitGuidedJourney(announce = true) {
      const wasActive = this.guidedIsActive
      this.clearGuidedArrivalTimer()
      this.$refs.atlasMap?.cancelJourneyTravel()
      this.guidedStatus = "idle"
      this.guidedIndex = -1
      this.guidedTravel = null
      this.guidedRemainingMs = 0
      this.guidedVisitedStopIds = []
      this.atlasAdNodeId = ""
      if (wasActive) this.detailCollapseRequest += 1
      if (announce) this.announcement = "Guided journey closed"
    },
    clearGuidedArrivalTimer() {
      if (this.guidedArrivalTimer != null) {
        window.clearTimeout(this.guidedArrivalTimer)
        this.guidedArrivalTimer = null
      }
    },
    handleVisibilityChange() {
      if (document.hidden) this.pauseGuidedJourney("visibility")
    },
    selectFromSaved(nodeId) {
      this.selectNode(nodeId, { analyticsSurface: "saved_drawer" })
      this.announcement = `${getAtlasNode(nodeId)?.title || "Place"} opened`
    },
    goToParent() {
      this.selectNode(this.currentNode?.parentId || null)
    },
    toggleFavorite(nodeId) {
      const node = getAtlasNode(nodeId)
      if (!node) return

      if (this.favorites.includes(nodeId)) {
        this.favorites = this.favorites.filter(item => item !== nodeId)
        this.announcement = `${node.title} removed from saved places`
      } else {
        this.favorites = [nodeId, ...this.favorites]
        this.announcement = `${node.title} saved`
      }

      this.persist()
    },
    toggleWelcome() {
      this.welcomeExpanded = !this.welcomeExpanded
      this.announcement = this.welcomeExpanded
        ? "Journey explorer opened"
        : "Journey explorer collapsed. The map is ready to explore."
    },
    surpriseMe() {
      const destination = selectAtlasSurprisePlace({
        nodes: getCompletedAtlasPlaces(),
        currentNodeId: this.currentNode?.id,
        previousNodeId: this.previousSurpriseNodeId,
      })
      if (!destination) return

      this.previousSurpriseNodeId = destination.id
      this.selectNode(destination.id, { analyticsSurface: "surprise" })
      this.announcement = `Surprise destination: ${destination.title}`
    },
    rememberCamera(camera) {
      if (!this.currentNode) return

      this.$set(this.cameras, this.currentNode.id, camera)
      this.lastContext = {
        nodeId: this.currentNode.id,
        camera,
      }
      this.persist()
    },
    persist() {
      saveAtlasState({
        favorites: this.favorites,
        recent: this.recent,
        lastContext: this.lastContext,
      })
    },
    updateDocumentTitle() {
      const location = getAtlasNode(this.nodeId)
      document.title =
        this.storyMode && this.storyTrip
          ? `${this.storyTrip.name} story | Roam With Justin Atlas`
          : location
            ? `${location.title} | Roam With Justin Atlas`
            : "Interactive Travel Atlas | Roam With Justin"
    },
  },
}
</script>

<style scoped>
.atlas-page {
  position: fixed;
  z-index: 1000;
  inset: 0;
  overflow: hidden;
  background: var(--color-page, #0b1114);
  color: var(--color-text, #fff);
  font-family: "Poppins", system-ui, sans-serif;
}

.atlas-toolbar {
  position: absolute;
  z-index: 20;
  top: 1rem;
  right: 1rem;
  left: 1rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.1rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 18px;
  padding: 0.55rem 0.65rem;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.78);
  box-shadow: 0 14px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(16px);
}

.atlas-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--color-text, #fff);
  text-decoration: none;
}

.atlas-brand > .brand-mark {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.atlas-brand strong {
  font-size: 0.86rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.atlas-tools {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
}

.atlas-tools button,
.atlas-tools a {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  gap: 0.35rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.16);
  border-radius: 999px;
  padding: 0.68rem 0.9rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.06);
  color: var(--color-text, #fff);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}

.atlas-tools button:hover,
.atlas-tools button:focus-visible,
.atlas-tools a:hover,
.atlas-tools a:focus-visible {
  border-color: var(--color-accent, #f6bd60);
}

.atlas-tools .atlas-story-link {
  border-color: rgba(var(--color-accent-rgb, 246, 189, 96), 0.48);
  color: var(--color-accent-soft, #f8d79f);
}

.atlas-surprise-mobile {
  display: none;
}

.atlas-saved-icon {
  display: none;
}

.atlas-tools .atlas-saved-count {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.25rem;
  border-radius: 50%;
  background: var(--color-accent, #f6bd60);
  color: var(--color-accent-contrast, #111);
  font-size: 0.65rem;
}

.atlas-welcome {
  position: absolute;
  z-index: 8;
  top: 6.15rem;
  left: clamp(1rem, 3vw, 2rem);
  width: min(500px, calc(100vw - 2rem));
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.16);
  border-radius: 22px;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.88);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);
}

.atlas-welcome.is-collapsed {
  width: min(300px, calc(100vw - 2rem));
}

.atlas-welcome-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  padding: 0.9rem 1rem;
  background: transparent;
  color: var(--color-text, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.atlas-welcome-toggle:hover,
.atlas-welcome-toggle:focus-visible {
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055);
}

.atlas-welcome-toggle:focus-visible {
  outline: 2px solid var(--color-focus, #f6bd60);
  outline-offset: -3px;
}

.atlas-welcome-toggle-copy {
  display: grid;
  min-width: 0;
  gap: 0.15rem;
}

.atlas-welcome-toggle-copy strong {
  overflow: hidden;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.atlas-welcome-toggle-action {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.66));
  font-size: 0.7rem;
  font-weight: 700;
}

.atlas-welcome-toggle-action b {
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.5);
  border-radius: 50%;
  color: var(--color-accent-soft, #f6bd60);
  font-size: 1rem;
  line-height: 1;
}

.atlas-welcome-content {
  min-width: 0;
  max-height: calc(100vh - 10.5rem);
  max-height: calc(100dvh - 10.5rem);
  overflow-y: auto;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  overscroll-behavior: contain;
  scrollbar-color: rgba(var(--color-accent-rgb, 246, 189, 96), 0.55) transparent;
  scrollbar-width: thin;
}

.atlas-welcome-intro {
  min-width: 0;
  padding: 1rem 1rem 0.85rem;
}

.atlas-welcome-intro h1 {
  max-width: 100%;
  margin: 0 0 0.7rem;
  font-family: Georgia, serif;
  font-size: clamp(2.25rem, 4.4vw, 3.6rem);
  font-weight: 500;
  line-height: 0.98;
  overflow-wrap: break-word;
}

.atlas-welcome-intro p {
  margin: 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.78));
  font-size: 0.9rem;
  line-height: 1.55;
}

.atlas-journey-nav {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.55rem;
  padding: 0 1rem 1rem;
}

.atlas-journey-nav button {
  display: grid;
  min-width: 0;
  min-height: 4.5rem;
  align-content: center;
  gap: 0.12rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.42);
  border-radius: 15px;
  padding: 0.7rem 0.8rem;
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.1);
  color: var(--color-text, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.atlas-journey-nav button:hover,
.atlas-journey-nav button:focus-visible {
  border-color: var(--color-accent, #f6bd60);
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.18);
  outline: 0;
}

.atlas-journey-nav button > span {
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.atlas-journey-nav button > strong {
  overflow: hidden;
  font-size: 0.82rem;
  line-height: 1.3;
  text-overflow: ellipsis;
}

.atlas-journey-nav button > small {
  margin-top: 0.18rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.66));
  font-size: 0.65rem;
  line-height: 1.35;
}

.atlas-welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.09);
  padding: 0.8rem 1rem 1rem;
}

.atlas-welcome-actions button,
.atlas-welcome .atlas-journey-library {
  display: inline-flex;
  min-height: 2.65rem;
  align-items: center;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.22);
  border-radius: 999px;
  padding: 0.62rem 0.85rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055);
  color: var(--color-text, #fff);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.atlas-welcome-actions button:hover,
.atlas-welcome-actions button:focus-visible,
.atlas-welcome .atlas-journey-library:hover,
.atlas-welcome .atlas-journey-library:focus-visible {
  border-color: var(--color-accent, #f6bd60);
}

.atlas-provider-note {
  position: absolute;
  z-index: 7;
  right: 1.25rem;
  bottom: 1.1rem;
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  background: rgba(var(--color-page-rgb, 5, 8, 10), 0.68);
  color: var(--color-text-muted, rgba(255, 255, 255, 0.56));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.atlas-my-atlas-toast {
  position: absolute;
  z-index: 22;
  right: 1.25rem;
  bottom: 3.75rem;
  display: grid;
  width: min(22rem, calc(100vw - 2rem));
  gap: 0.75rem;
  box-sizing: border-box;
  padding: 0.9rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.48);
  border-radius: 16px;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.94);
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(16px);
  animation: atlas-toast-in 220ms ease-out both;
}

.atlas-page.has-detail .atlas-my-atlas-toast {
  right: auto;
  left: 1.25rem;
}

.atlas-my-atlas-toast > div:first-child {
  display: grid;
  gap: 0.25rem;
}

.atlas-my-atlas-toast strong {
  color: var(--color-accent-soft, #f8d79f);
  font-size: 0.9rem;
}

.atlas-my-atlas-toast p {
  margin: 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.75));
  font-size: 0.74rem;
  line-height: 1.5;
}

.atlas-my-atlas-toast-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.atlas-my-atlas-toast-actions a,
.atlas-my-atlas-toast-actions button {
  display: inline-flex;
  min-height: 2.65rem;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0.6rem 0.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.42);
  border-radius: 999px;
  color: var(--color-accent-contrast, #15191b);
  background: var(--color-accent, #f6bd60);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.atlas-my-atlas-toast-actions button {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.76));
  background: transparent;
}

.atlas-my-atlas-toast-actions a:focus-visible,
.atlas-my-atlas-toast-actions button:focus-visible {
  outline: 2px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

@keyframes atlas-toast-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.atlas-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .atlas-toolbar {
    top: 0.65rem;
    right: 0.65rem;
    left: 0.65rem;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.45rem;
    min-height: 4rem;
    padding: 0.55rem 0.6rem;
  }

  .atlas-brand > .brand-mark {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 0.82rem;
  }

  .atlas-brand strong {
    display: none;
  }

  .atlas-tools {
    gap: 0.3rem;
  }

  .atlas-tools button,
  .atlas-tools a {
    min-height: 2.65rem;
    padding: 0.55rem 0.65rem;
    font-size: 0.78rem;
  }

  .atlas-surprise-desktop {
    display: none;
  }

  .atlas-surprise-mobile {
    display: inline;
  }

  .atlas-tools .atlas-saved-count {
    min-width: 1.35rem;
    height: 1.35rem;
    font-size: 0.7rem;
  }

  .atlas-page.has-detail .atlas-saved-trigger {
    display: none;
  }

  .atlas-welcome {
    top: 5.55rem;
    right: 0.65rem;
    bottom: auto;
    left: 0.65rem;
    width: auto;
    max-width: none;
    border-radius: 18px;
  }

  .atlas-welcome.is-collapsed {
    right: auto;
    width: min(18rem, calc(100vw - 1.3rem));
  }

  .atlas-welcome-toggle {
    min-height: 3.6rem;
    padding: 0.72rem 0.8rem;
  }

  .atlas-welcome-toggle-action {
    font-size: 0.66rem;
  }

  .atlas-welcome-toggle-action b {
    width: 1.9rem;
    height: 1.9rem;
  }

  .atlas-welcome-content {
    max-height: calc(100vh - 10rem);
    max-height: calc(100dvh - 10rem);
  }

  .atlas-welcome-intro {
    padding: 0.85rem 0.85rem 0.7rem;
  }

  .atlas-welcome-intro h1 {
    font-size: clamp(2rem, 9vw, 2.8rem);
  }

  .atlas-welcome-intro p {
    font-size: 0.86rem;
  }

  .atlas-journey-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    padding: 0 0.85rem 0.85rem;
  }

  .atlas-journey-nav button {
    min-height: 4.8rem;
    padding: 0.62rem 0.7rem;
  }

  .atlas-journey-nav button > small {
    font-size: 0.68rem;
  }

  .atlas-welcome-actions {
    padding: 0.72rem 0.85rem 0.85rem;
  }

  .atlas-welcome-actions button,
  .atlas-welcome .atlas-journey-library {
    min-height: 2.75rem;
    font-size: 0.76rem;
  }

  .atlas-provider-note {
    display: none;
  }

  .atlas-my-atlas-toast,
  .atlas-page.has-detail .atlas-my-atlas-toast {
    right: 0.65rem;
    bottom: max(0.65rem, env(safe-area-inset-bottom));
    left: 0.65rem;
    width: auto;
  }

  .atlas-page.has-detail .atlas-my-atlas-toast {
    bottom: calc(6.5rem + env(safe-area-inset-bottom));
  }
}

@media (max-width: 540px) {
  .atlas-toolbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .atlas-tools {
    grid-column: 1 / -1;
    justify-content: flex-end;
    border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.09);
    padding-top: 0.45rem;
  }

  .atlas-welcome {
    top: 8.45rem;
  }

  .atlas-welcome-content {
    max-height: calc(100vh - 12.9rem);
    max-height: calc(100dvh - 12.9rem);
  }
}

@media (max-width: 390px) {
  .atlas-toolbar {
    right: 0.45rem;
    left: 0.45rem;
    gap: 0.3rem;
    padding-inline: 0.48rem;
  }

  .atlas-brand > .brand-mark {
    width: 2.5rem;
    height: 2.5rem;
  }

  .atlas-tools button,
  .atlas-tools a {
    padding-inline: 0.52rem;
    font-size: 0.72rem;
  }

  .atlas-saved-label {
    display: none;
  }

  .atlas-saved-icon {
    display: inline;
    font-size: 1.1rem;
  }

  .atlas-welcome {
    top: 8.25rem;
    right: 0.45rem;
    left: 0.45rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-page * {
    scroll-behavior: auto !important;
  }

  .atlas-my-atlas-toast {
    animation: none;
  }
}
</style>
