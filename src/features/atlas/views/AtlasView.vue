<template>
  <main class="atlas-page">
    <AtlasMap
      ref="atlasMap"
      :nodes="visibleNodes"
      :journey-nodes="journeyNodes"
      :selected-node="currentNode"
      :camera="activeCamera"
      :guided-controls-visible="Boolean(guidedJourney)"
      :journey-travel="guidedTravel"
      @select="selectNodeFromMap"
      @camera-change="rememberCamera"
      @manual-interaction="pauseGuidedJourney('map')"
    />

    <header class="atlas-toolbar">
      <a class="atlas-brand" href="/" aria-label="Roam With Justin home">
        <span>RWJ</span>
        <strong>Travel Atlas</strong>
      </a>
      <AtlasBreadcrumbs :crumbs="breadcrumbs" @select="selectNode" />
      <div class="atlas-tools">
        <button type="button" @click="surpriseMe">Surprise me</button>
        <button type="button" @click="savedOpen = true">
          Saved <span>{{ favoriteNodes.length }}</span>
        </button>
      </div>
    </header>

    <AtlasJourneyPlayer
      v-if="guidedJourney"
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
    />

    <section v-if="!currentNode" class="atlas-welcome">
      <span>Explore through a photographer's eyes</span>
      <h1>The journey starts with a place.</h1>
      <p>
        Move through destinations, stories, and photographic locations. This
        atlas follows the existing Utah and Puerto Rico road trips.
      </p>
      <div>
        <button type="button" @click="selectNode('utah')">Explore Utah</button>
        <button
          class="secondary"
          type="button"
          @click="selectNode('puerto-rico')"
        >
          Explore Puerto Rico
        </button>
        <button
          v-if="resumeNode"
          class="secondary"
          type="button"
          @click="selectNode(resumeNode.id)"
        >
          Resume {{ resumeNode.title }}
        </button>
      </div>
    </section>

    <AtlasDetailPanel
      v-if="currentNode"
      :node="currentNode"
      :children="childNodes"
      :related="relatedNodes"
      :is-favorite="favorites.includes(currentNode.id)"
      :expand-request="mapPinExpandRequest"
      :collapse-request="detailCollapseRequest"
      :guided-presentation="
        guidedStatus === 'at-stop' || guidedStatus === 'complete'
      "
      @close="goToParent"
      @select="selectNode"
      @toggle-favorite="toggleFavorite"
    />

    <div class="atlas-provider-note">
      {{ hasCinematicMap ? "Satellite terrain" : "Preview basemap" }}
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
import { hasMapTilerKey } from "../config/mapConfig"
import {
  atlasRootIds,
  getAtlasJourneyNodes,
  getAtlasLeaves,
  getAtlasLineage,
  getAtlasNode,
  getAtlasNodes,
  getGuidedJourneyViewModel,
} from "@/content/selectors/atlas"
import { loadAtlasState, saveAtlasState } from "../state/atlasStorage"

const worldCamera = {
  center: [-91.5, 30.5],
  zoom: 2.55,
  pitch: 22,
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
  },
  props: {
    nodeId: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      favorites: [],
      recent: [],
      lastContext: null,
      cameras: {},
      savedOpen: false,
      announcement: "",
      previousTitle: "",
      stateLoaded: false,
      mapPinExpandRequest: 0,
      pendingMapPinNodeId: null,
      detailCollapseRequest: 0,
      guidedStatus: "idle",
      guidedIndex: -1,
      guidedTravel: null,
      guidedTravelSerial: 0,
      guidedArrivalTimer: null,
      guidedArrivalDeadline: 0,
      guidedRemainingMs: 0,
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
    guidedIsActive() {
      return this.guidedStatus !== "idle"
    },
    guidedStop() {
      return this.guidedJourney?.stops?.[this.guidedIndex] || null
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
        return this.guidedStop.camera
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
  },
  watch: {
    nodeId(nodeId) {
      if (this.stateLoaded) this.handleRoute(nodeId)
      if (this.pendingMapPinNodeId === nodeId) {
        this.pendingMapPinNodeId = null
        this.requestMapPinExpansion()
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
    document.title = this.previousTitle
  },
  methods: {
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

      if ((nodeId || "") === (this.nodeId || "")) {
        this.requestMapPinExpansion()
        return
      }

      this.pendingMapPinNodeId = nodeId
      this.selectNode(nodeId, { preserveGuided })
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

      this.selectNode(target.id, { preserveGuided: true })
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

      if (this.guidedStop) {
        this.announcement = `${this.guidedStop.title}, stop ${this.guidedIndex + 1} of ${this.guidedJourney.stopCount}. Journey paused.`
      }
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
      this.selectNode(nodeId)
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
    surpriseMe() {
      const leaves = getAtlasLeaves()
      const currentIndex = leaves.findIndex(
        node => node.id === this.currentNode?.id
      )
      const nextIndex = (currentIndex + 1) % leaves.length
      this.selectNode(leaves[nextIndex].id)
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
      document.title = location
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
  background: #0b1114;
  color: #fff;
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
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 0.55rem 0.65rem;
  background: rgba(7, 11, 14, 0.78);
  box-shadow: 0 14px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(16px);
}

.atlas-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #fff;
  text-decoration: none;
}

.atlas-brand > span {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  background: #f6bd60;
  color: #15191b;
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
  gap: 0.45rem;
}

.atlas-tools button,
.atlas-welcome button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 0.68rem 0.9rem;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.atlas-tools button:hover,
.atlas-tools button:focus-visible {
  border-color: #f6bd60;
}

.atlas-tools button span {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.25rem;
  border-radius: 50%;
  background: #f6bd60;
  color: #111;
  font-size: 0.65rem;
}

.atlas-welcome {
  position: absolute;
  z-index: 8;
  top: 50%;
  left: clamp(1.25rem, 7vw, 7rem);
  width: min(580px, calc(100vw - 2.5rem));
  transform: translateY(-48%);
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.55);
}

.atlas-welcome > span,
.atlas-provider-note {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.atlas-welcome h1 {
  max-width: 560px;
  margin: 0.45rem 0 1rem;
  font-family: Georgia, serif;
  font-size: clamp(3.2rem, 7.6vw, 7rem);
  font-weight: 500;
  line-height: 0.91;
}

.atlas-welcome p {
  max-width: 520px;
  color: rgba(255, 255, 255, 0.78);
  font-size: clamp(0.94rem, 1.5vw, 1.12rem);
  line-height: 1.65;
}

.atlas-welcome > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.5rem;
}

.atlas-welcome button {
  border-color: #f6bd60;
  padding: 0.85rem 1.2rem;
  background: #f6bd60;
  color: #14181a;
}

.atlas-welcome button.secondary {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(7, 11, 14, 0.62);
  color: #fff;
}

.atlas-provider-note {
  position: absolute;
  z-index: 7;
  right: 1.25rem;
  bottom: 1.1rem;
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  background: rgba(5, 8, 10, 0.68);
  color: rgba(255, 255, 255, 0.56);
  letter-spacing: 0.09em;
  backdrop-filter: blur(8px);
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
    grid-template-columns: auto 1fr auto;
    gap: 0.55rem;
    min-height: 4rem;
    padding: 0.6rem 0.7rem;
  }

  .atlas-brand > span {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 0.82rem;
  }

  .atlas-brand strong,
  .atlas-tools button:first-child {
    display: none;
  }

  .atlas-tools button {
    min-height: 2.75rem;
    padding: 0.6rem 0.78rem;
    font-size: 0.88rem;
  }

  .atlas-tools button span {
    min-width: 1.45rem;
    height: 1.45rem;
    font-size: 0.75rem;
  }

  .atlas-welcome {
    top: auto;
    right: 1rem;
    bottom: 2rem;
    left: 1rem;
    width: auto;
    transform: none;
  }

  .atlas-welcome h1 {
    font-size: clamp(3rem, 15vw, 4.7rem);
  }

  .atlas-welcome p {
    font-size: 1.02rem;
  }

  .atlas-welcome button {
    min-height: 3rem;
    font-size: 0.92rem;
  }

  .atlas-provider-note {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-page * {
    scroll-behavior: auto !important;
  }
}
</style>
