<!-- eslint-disable vue/require-explicit-emits, vue/no-deprecated-v-on-native-modifier -- Vue 2 uses implicit component events and native RouterLink listeners. -->
<template>
  <div class="atlas-detail-root">
    <aside
      class="atlas-detail"
      :class="{
        'is-expanded': mobileExpanded,
        'is-guided': guidedPresentation,
        'has-expanded-guide': guidedControlsExpanded,
      }"
      :style="guidedClearanceStyle"
      :aria-label="`${node.title} details`"
    >
      <div
        class="atlas-detail-dock"
        role="navigation"
        aria-label="Place controls"
      >
        <button
          class="atlas-dock-action"
          type="button"
          aria-label="Return to the previous geographic level"
          @click="$emit('close')"
        >
          <span class="atlas-dock-icon" aria-hidden="true">&larr;</span>
          Back
        </button>
        <button
          class="atlas-dock-place"
          type="button"
          :aria-expanded="String(mobileExpanded)"
          aria-controls="atlas-detail-content"
          @click="toggleMobileDrawer"
        >
          <img v-if="node.image" :src="node.image" alt="" />
          <span v-else class="atlas-dock-placeholder" aria-hidden="true"></span>
          <span>
            <strong>{{ node.title }}</strong>
          </span>
          <span class="atlas-dock-toggle" aria-hidden="true">
            <svg
              class="atlas-dock-chevron"
              :class="{ 'is-open': mobileExpanded }"
              viewBox="0 0 16 16"
            >
              <path d="M3.5 5.5 8 10l4.5-4.5" />
            </svg>
            <small>{{ mobileExpanded ? "Close" : "Details" }}</small>
          </span>
        </button>
        <button
          class="atlas-dock-action"
          :class="{ active: isFavorite }"
          type="button"
          :aria-pressed="String(isFavorite)"
          :aria-label="isFavorite ? 'Remove from saved places' : 'Save place'"
          @click="$emit('toggle-favorite', node.id)"
        >
          <span class="atlas-dock-icon" aria-hidden="true">{{
            isFavorite ? "&#9733;" : "&#9734;"
          }}</span>
          {{ isFavorite ? "Saved" : "Save" }}
          <span class="atlas-dock-count" aria-hidden="true">
            {{ savedCount }}
          </span>
        </button>
      </div>

      <div
        id="atlas-detail-content"
        ref="detailScroll"
        class="atlas-detail-scroll"
        @scroll.passive="handleDetailScroll"
      >
        <div class="atlas-detail-hero">
          <button
            v-if="guidedHeroMedia.src"
            class="atlas-detail-hero-image"
            type="button"
            :aria-label="guidedHeroLabel"
            @click="openGallery(guidedHeroMedia)"
          >
            <img
              v-if="guidedHeroImage"
              :src="guidedHeroImage"
              :alt="guidedHeroMedia.alt"
              @load="updateScrollCue"
            />
            <span :class="{ 'is-placeholder': !guidedHeroImage }">
              {{ guidedHeroLabel }}
            </span>
          </button>
          <div
            v-else
            class="atlas-detail-hero-image is-empty"
            aria-hidden="true"
          ></div>
          <div class="atlas-detail-shade"></div>
          <button
            class="atlas-detail-close"
            type="button"
            aria-label="Return to the previous geographic level"
            @click="$emit('close')"
          >
            &larr;
          </button>
          <button
            class="atlas-favorite"
            :class="{ active: isFavorite }"
            type="button"
            :aria-pressed="String(isFavorite)"
            @click="$emit('toggle-favorite', node.id)"
          >
            <span aria-hidden="true">{{
              isFavorite ? "&#9733;" : "&#9734;"
            }}</span>
            {{ isFavorite ? "Saved" : "Save" }}
          </button>
          <div class="atlas-detail-title">
            <span v-if="node.dateLabel" class="atlas-detail-date">
              {{ node.dateLabel }}
            </span>
            <h1>{{ node.title }}</h1>
          </div>
        </div>

        <div class="atlas-detail-content">
          <p v-if="!node.storyLead" class="atlas-summary">
            {{ node.summary }}
          </p>
          <section
            v-if="hasDestinationIndex"
            id="atlas-destination-index"
            ref="journeyStops"
            class="atlas-discoveries atlas-destination-index"
            :aria-labelledby="`atlas-destination-index-title-${node.id}`"
          >
            <div class="atlas-section-heading">
              <h2 :id="`atlas-destination-index-title-${node.id}`">
                Inside {{ node.title }}
              </h2>
              <strong>{{ destinationIndexItems.length }} entries</strong>
            </div>
            <button
              v-for="item in destinationIndexItems"
              :key="`${item.kind}-${item.id}`"
              type="button"
              @click="openDestinationItem(item)"
            >
              <img v-if="item.image" :src="item.image" alt="" loading="lazy" />
              <span
                v-else
                class="atlas-discovery-placeholder"
                :class="{ 'is-video': item.hasVideo }"
                aria-hidden="true"
              >
                <b v-if="item.hasVideo">&#9654;</b>
              </span>
              <span>
                <small>{{ item.kindLabel }}</small>
                {{ item.title }}
                <em v-if="item.contextLabel">{{ item.contextLabel }}</em>
              </span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </section>
          <section
            v-if="storySections.length && !hasDestinationIndex"
            class="atlas-stop-story"
            :aria-labelledby="`atlas-stop-story-title-${node.id}`"
          >
            <button
              v-if="storySections[0].image || node.image"
              class="atlas-stop-story-media"
              type="button"
              @click="openStorySection(storySections[0].id)"
            >
              <img
                :src="storySections[0].image || node.image"
                :alt="
                  storySections[0].imageAlt ||
                  `${node.title} journey photograph`
                "
                loading="lazy"
                @load="updateScrollCue"
              />
            </button>
            <div class="atlas-stop-story-copy">
              <h2 :id="`atlas-stop-story-title-${node.id}`">
                {{ storySections[0].title }}
              </h2>
              <p v-if="storySections[0].summary">
                {{ storySections[0].summary }}
              </p>
              <button
                ref="stopStoryAction"
                class="atlas-stop-story-action"
                type="button"
                @click="openStorySection(storySections[0].id)"
              >
                {{ storySections[0].actionLabel }}
              </button>
            </div>
            <div v-if="storySections.length > 1" class="atlas-stop-story-more">
              <span>More from this place</span>
              <button
                v-for="section in storySections.slice(1)"
                :key="section.id"
                type="button"
                @click="openStorySection(section.id)"
              >
                <strong>{{ section.title }}</strong>
                <small>{{ section.actionLabel }}</small>
              </button>
            </div>
          </section>
          <section
            v-if="node.storyLead"
            class="atlas-story-lead"
            :class="{ 'has-media': node.storyLead.image }"
            :aria-labelledby="`atlas-story-title-${node.id}`"
          >
            <button
              v-if="node.storyLead.image"
              class="atlas-story-lead-media"
              type="button"
              @click="openStory"
            >
              <img
                :src="node.storyLead.image"
                :alt="node.storyLead.imageAlt"
                loading="lazy"
                @load="updateScrollCue"
              />
            </button>
            <div class="atlas-story-lead-copy">
              <span v-if="node.dateLabel" class="atlas-story-lead-date">
                {{ node.dateLabel }}
              </span>
              <h2 :id="`atlas-story-title-${node.id}`">
                {{ node.storyLead.title }}
              </h2>
              <p v-if="node.storyLead.excerpt">
                {{ node.storyLead.excerpt }}
              </p>
              <p
                v-if="node.storyLead.progressNote"
                class="atlas-story-progress-note"
              >
                {{ node.storyLead.progressNote }}
              </p>
              <div class="atlas-story-lead-actions">
                <button
                  ref="storyAction"
                  class="is-primary"
                  type="button"
                  @click="openStory"
                >
                  Explore the story
                </button>
                <button
                  v-if="children.length"
                  type="button"
                  @click="scrollToJourneyStops"
                >
                  View {{ children.length }} stops
                </button>
              </div>
            </div>
          </section>

          <div v-if="node.personalNote" class="atlas-note">
            <p>{{ node.personalNote }}</p>
          </div>

          <section
            v-if="children.length && !hasDestinationIndex"
            id="atlas-journey-stops"
            ref="journeyStops"
            class="atlas-discoveries"
            aria-labelledby="atlas-journey-stops-title"
          >
            <div class="atlas-section-heading">
              <h2 id="atlas-journey-stops-title">Journey stops</h2>
              <strong>{{ children.length }} places</strong>
            </div>
            <button
              v-for="(child, childIndex) in children"
              :key="child.id"
              type="button"
              @click="$emit('select', child.id)"
            >
              <img
                v-if="child.image"
                :src="child.image"
                alt=""
                loading="lazy"
              />
              <span
                v-else
                class="atlas-discovery-placeholder"
                aria-hidden="true"
              ></span>
              <span
                ><small>Stop {{ childIndex + 1 }}</small
                >{{ child.title }}</span
              >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </section>

          <section v-if="adjacentStops.length" class="atlas-adjacent">
            <div class="atlas-section-heading">
              <span>Journey sequence</span>
            </div>
            <div>
              <button
                v-for="item in adjacentStops"
                :key="item.node.id"
                type="button"
                @click="$emit('select', item.node.id)"
              >
                <small>{{ item.direction }}</small>
                <strong>{{ item.node.title }}</strong>
              </button>
            </div>
          </section>

          <section v-if="related.length" class="atlas-related">
            <div class="atlas-section-heading">
              <span>Continue exploring</span>
            </div>
            <div>
              <button
                v-for="item in related"
                :key="item.id"
                type="button"
                @click="$emit('select', item.id)"
              >
                <svg
                  class="atlas-related-marker"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21s6-5.35 6-11a6 6 0 1 0-12 0c0 5.65 6 11 6 11Z"
                  />
                  <circle cx="12" cy="10" r="2.25" />
                </svg>
                <strong>{{ item.title }}</strong>
              </button>
            </div>
          </section>

          <section v-if="galleryMedia.length > 1" class="atlas-mini-gallery">
            <div class="atlas-section-heading">
              <span>{{
                hasVideo ? "Photography & video" : "Photography"
              }}</span>
              <strong>{{ galleryMedia.length }} items</strong>
            </div>
            <div>
              <button
                v-for="(media, mediaIndex) in galleryMedia"
                :key="media.key"
                :class="{ 'is-video': media.kind === 'video' }"
                type="button"
                :aria-label="
                  media.kind === 'video'
                    ? `Play ${node.title} video ${mediaIndex + 1} of ${galleryMedia.length}`
                    : `Open ${node.title} photograph ${mediaIndex + 1} of ${galleryMedia.length}`
                "
                @click="openGallery(media)"
              >
                <img
                  v-if="media.kind === 'image'"
                  :src="media.src"
                  :alt="media.alt"
                  loading="lazy"
                  @load="updateScrollCue"
                />
                <span v-else class="atlas-video-tile" aria-hidden="true">
                  <b>&#9654;</b>
                  <span>Play video</span>
                </span>
                <span class="atlas-media-badge">
                  <span v-if="media.kind === 'video'" aria-hidden="true"
                    >&#9654;</span
                  >
                  {{ mediaIndex + 1 }}
                </span>
              </button>
            </div>
          </section>

          <AdSlot
            v-if="showAd"
            :slot-id="adSlotId"
            placement="atlas-guided-journey-inline-1"
            variant="atlas"
          />

          <section
            v-if="usefulActions.length"
            class="atlas-actions"
            aria-labelledby="atlas-useful-links-title"
          >
            <div class="atlas-section-heading">
              <h2 id="atlas-useful-links-title">Useful links</h2>
            </div>
            <div>
              <a
                v-for="action in usefulActions"
                :key="action.href"
                :href="action.href"
                target="_blank"
                rel="noopener noreferrer"
                @click="$emit('action', action)"
              >
                {{ action.label }}
              </a>
            </div>
          </section>
        </div>
      </div>

      <div
        v-if="showScrollCue"
        class="atlas-scroll-fade"
        aria-hidden="true"
      ></div>
    </aside>

    <div
      v-if="lightboxOpen"
      class="atlas-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`${node.title} media viewer`"
      @click.self="closeGallery"
    >
      <button
        ref="lightboxClose"
        class="atlas-lightbox-close"
        type="button"
        aria-label="Close media viewer"
        @click="closeGallery"
      >
        &times;
      </button>
      <button
        v-if="galleryMedia.length > 1"
        class="atlas-lightbox-previous"
        type="button"
        aria-label="Previous media item"
        @click="showPreviousImage"
      >
        &larr;
      </button>
      <figure>
        <video
          v-if="activeMedia.kind === 'video'"
          :key="activeMedia.src"
          ref="activeVideo"
          controls
          playsinline
          preload="metadata"
          :poster="activeMedia.poster"
          :aria-label="activeMedia.alt"
        >
          <source :src="activeMedia.src" :type="activeMedia.mimeType" />
          Your browser does not support HTML video.
        </video>
        <img v-else :src="activeMedia.src" :alt="activeMedia.alt" />
        <figcaption>
          <strong>{{ node.title }}</strong>
          <span>
            {{ lightboxIndex + 1 }} of {{ galleryMedia.length }} media &middot;
            {{ activeMedia.kind === "video" ? "Video" : "Photo" }}
          </span>
        </figcaption>
      </figure>
      <button
        v-if="galleryMedia.length > 1"
        class="atlas-lightbox-next"
        type="button"
        aria-label="Next media item"
        @click="showNextImage"
      >
        &rarr;
      </button>
    </div>
  </div>
</template>

<script>
import AdSlot from "@/components/AdSlot.vue"

export default {
  name: "AtlasDetailPanel",
  components: { AdSlot },
  props: {
    node: {
      type: Object,
      required: true,
    },
    children: {
      type: Array,
      default: () => [],
    },
    related: {
      type: Array,
      default: () => [],
    },
    adjacentStops: {
      type: Array,
      default: () => [],
    },
    isFavorite: Boolean,
    savedCount: {
      type: Number,
      default: 0,
    },
    expandRequest: {
      type: Number,
      default: 0,
    },
    collapseRequest: {
      type: Number,
      default: 0,
    },
    guidedPresentation: Boolean,
    guidedControlsExpanded: Boolean,
    guidedControlsClearance: {
      type: Number,
      default: 0,
    },
    showAd: Boolean,
    adSlotId: {
      type: String,
      default: "",
    },
  },
  emits: [
    "action",
    "close",
    "open-story",
    "open-story-section",
    "select",
    "toggle-favorite",
  ],
  data() {
    return {
      mobileExpanded: false,
      lightboxOpen: false,
      lightboxIndex: 0,
      previouslyFocusedElement: null,
      guidedHeroIndex: 0,
      guidedHeroTimer: null,
      showScrollCue: false,
      detailResizeObserver: null,
    }
  },
  computed: {
    guidedClearanceStyle() {
      if (!this.guidedControlsExpanded || !this.guidedControlsClearance) {
        return null
      }
      return {
        "--atlas-guided-clearance": `${this.guidedControlsClearance}px`,
      }
    },
    galleryMedia() {
      const media = [this.node.image, ...this.node.media]
        .map(this.normalizeMedia)
        .filter(item => item.src)

      return media.filter(
        (item, index, items) =>
          items.findIndex(
            candidate =>
              candidate.kind === item.kind && candidate.src === item.src
          ) === index
      )
    },
    activeMedia() {
      return (
        this.galleryMedia[this.lightboxIndex] ||
        this.normalizeMedia(this.node.image)
      )
    },
    hasVideo() {
      return this.galleryMedia.some(item => item.kind === "video")
    },
    usefulActions() {
      return this.node.actions.filter(action => action.type === "external")
    },
    experienceStories() {
      return (this.node.storyExperiences || []).filter(
        experience => experience.card
      )
    },
    hasDestinationIndex() {
      return !this.node.storyLead && this.children.length > 0
    },
    destinationIndexItems() {
      if (!this.hasDestinationIndex) return []

      return [
        ...this.children.map(child => ({
          id: child.id,
          kind: "place",
          kindLabel: "Place",
          title: child.title,
          contextLabel: "",
          image: child.image || "",
          hasVideo: false,
        })),
        ...this.experienceStories.map(experience => ({
          id: experience.id,
          kind: "experience",
          kindLabel: "Experience",
          title: experience.card.title,
          contextLabel: experience.card.contextLabel || "",
          image: experience.card.image?.src || "",
          hasVideo: experience.moments.some(moment =>
            moment.media.some(media => media.kind === "video")
          ),
        })),
      ]
    },
    storySections() {
      return [
        ...(this.node.storyChapters || []).map(chapter => ({
          id: chapter.id,
          title: chapter.label,
          summary: chapter.summary,
          image: "",
          imageAlt: "",
          actionLabel: "Read this chapter",
        })),
        ...(this.node.storyExperiences || []).map(experience => ({
          id: experience.id,
          title: experience.card?.title || experience.title,
          summary: experience.card?.summary || experience.summary,
          image: experience.card?.image?.src || "",
          imageAlt: experience.card?.image?.alt || "",
          actionLabel: "Read this experience",
        })),
      ]
    },
    guidedHeroMedia() {
      if (!this.guidedPresentation) {
        return this.galleryMedia[0] || this.normalizeMedia(this.node.image)
      }
      return (
        this.galleryMedia[this.guidedHeroIndex % this.galleryMedia.length] ||
        this.normalizeMedia(this.node.image)
      )
    },
    guidedHeroImage() {
      return this.guidedHeroMedia.kind === "video"
        ? ""
        : this.guidedHeroMedia.src
    },
    guidedHeroLabel() {
      if (!this.guidedHeroMedia.src) return ""
      if (!this.guidedPresentation) {
        return this.guidedHeroMedia.kind === "video"
          ? "Play video"
          : "View full photo"
      }
      const mediaType =
        this.guidedHeroMedia.kind === "video" ? "Play video" : "View photo"
      return `${mediaType} ${this.guidedHeroIndex + 1} of ${this.galleryMedia.length}`
    },
  },
  watch: {
    node() {
      this.mobileExpanded = false
      this.guidedHeroIndex = 0
      this.closeGallery(false)
      this.scrollDetailsToTop()
    },
    expandRequest() {
      // Match the same condition that turns this panel into a bottom drawer.
      // Desktop/sidebar navigation should remain compact and unchanged.
      if (window.matchMedia("(orientation: portrait)").matches) {
        this.mobileExpanded = true
      }
      this.scrollDetailsToTop()
      this.startGuidedHeroCycle()
    },
    collapseRequest() {
      this.mobileExpanded = false
      this.stopGuidedHeroCycle()
      this.closeGallery(false)
    },
    guidedPresentation(isPresenting) {
      this.guidedHeroIndex = 0
      if (isPresenting) this.startGuidedHeroCycle()
      else this.stopGuidedHeroCycle()
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleGalleryKeydown)
    window.addEventListener("resize", this.updateScrollCue)
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    this.$nextTick(this.observeDetailSize)
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.stopGuidedHeroCycle()
    this.detailResizeObserver?.disconnect()
    window.removeEventListener("keydown", this.handleGalleryKeydown)
    window.removeEventListener("resize", this.updateScrollCue)
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    )
  },
  methods: {
    openStory() {
      this.$emit("open-story")
    },
    openStorySection(sectionId) {
      this.$emit("open-story-section", sectionId)
    },
    getScrollPosition() {
      return this.$refs.detailScroll?.scrollTop || 0
    },
    restoreScroll(position = 0) {
      this.mobileExpanded = true
      this.$nextTick(() => {
        if (this.$refs.detailScroll) {
          this.$refs.detailScroll.scrollTop = Math.max(0, position)
        }
        this.updateScrollCue()
      })
    },
    focusStoryAction() {
      const storyAction = this.$refs.storyAction || this.$refs.stopStoryAction
      storyAction?.focus()
    },
    toggleMobileDrawer() {
      this.mobileExpanded = !this.mobileExpanded
      if (this.mobileExpanded) {
        this.startGuidedHeroCycle()
        this.$nextTick(this.updateScrollCue)
      } else {
        this.stopGuidedHeroCycle()
      }
    },
    startGuidedHeroCycle() {
      this.stopGuidedHeroCycle()
      if (
        !this.guidedPresentation ||
        this.galleryMedia.length < 2 ||
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return
      }

      this.guidedHeroTimer = window.setInterval(() => {
        if (
          window.matchMedia("(orientation: portrait)").matches &&
          !this.mobileExpanded
        ) {
          return
        }
        this.guidedHeroIndex =
          (this.guidedHeroIndex + 1) % this.galleryMedia.length
      }, 4500)
    },
    stopGuidedHeroCycle() {
      if (this.guidedHeroTimer != null) {
        window.clearInterval(this.guidedHeroTimer)
        this.guidedHeroTimer = null
      }
    },
    handleVisibilityChange() {
      if (document.hidden) this.stopGuidedHeroCycle()
      else this.startGuidedHeroCycle()
    },
    scrollDetailsToTop() {
      this.$nextTick(() => {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth"
        this.$refs.detailScroll?.scrollTo({ top: 0, behavior })
        this.updateScrollCue()
      })
    },
    observeDetailSize() {
      const scroller = this.$refs.detailScroll
      if (!scroller) return

      this.detailResizeObserver?.disconnect()
      if (typeof ResizeObserver !== "undefined") {
        this.detailResizeObserver = new ResizeObserver(this.updateScrollCue)
        this.detailResizeObserver.observe(scroller)
        if (scroller.firstElementChild) {
          this.detailResizeObserver.observe(scroller.firstElementChild)
        }
      }
      this.updateScrollCue()
    },
    updateScrollCue() {
      const scroller = this.$refs.detailScroll
      if (!scroller) return

      const remaining =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
      const canScroll = scroller.scrollHeight - scroller.clientHeight > 24
      this.showScrollCue = canScroll && remaining > 28
    },
    handleDetailScroll() {
      this.updateScrollCue()
    },
    scrollToJourneyStops() {
      const scroller = this.$refs.detailScroll
      const target = this.$refs.journeyStops
      if (!scroller || !target) return

      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? "auto"
        : "smooth"
      scroller.scrollTo({
        top: Math.max(0, target.offsetTop - 20),
        behavior,
      })
    },
    openDestinationItem(item) {
      if (item.kind === "place") {
        this.$emit("select", item.id)
        return
      }

      this.$emit("open-story-section", item.id)
    },
    normalizeMedia(entry) {
      const media = typeof entry === "string" ? { src: entry } : entry || {}
      const src = media.src || media.url || ""
      const declaredType = media.kind || media.type || ""
      const isVideo =
        declaredType === "video" ||
        declaredType.startsWith("video/") ||
        /\.(mp4|webm|ogv)(?:[?#]|$)/i.test(src)
      const kind = isVideo ? "video" : "image"

      return {
        kind,
        key: `${kind}:${src}`,
        src,
        // A Place hero is not a video poster. Missing video posters remain
        // empty so the UI can present an explicit play affordance instead of
        // making a photo and video look like duplicate media.
        poster: isVideo ? media.poster || "" : "",
        mimeType: isVideo
          ? media.mimeType ||
            media.mime ||
            (declaredType.startsWith("video/")
              ? declaredType
              : this.videoMimeType(src))
          : "",
        alt:
          media.alt ||
          `${this.node.title} travel ${isVideo ? "video" : "photograph"}`,
      }
    },
    videoMimeType(src) {
      if (/\.webm(?:[?#]|$)/i.test(src)) return "video/webm"
      if (/\.ogv(?:[?#]|$)/i.test(src)) return "video/ogg"
      return "video/mp4"
    },
    openGallery(entry) {
      const media = this.normalizeMedia(entry)
      const mediaIndex = this.galleryMedia.findIndex(
        item => item.kind === media.kind && item.src === media.src
      )
      this.lightboxIndex = mediaIndex >= 0 ? mediaIndex : 0
      this.previouslyFocusedElement = document.activeElement
      this.lightboxOpen = true
      this.$nextTick(() => this.$refs.lightboxClose?.focus())
    },
    closeGallery(restoreFocus = true) {
      if (!this.lightboxOpen) return

      this.pauseActiveVideo()
      this.lightboxOpen = false
      if (restoreFocus) {
        this.$nextTick(() => this.previouslyFocusedElement?.focus())
      }
    },
    showPreviousImage() {
      this.pauseActiveVideo()
      this.lightboxIndex =
        (this.lightboxIndex - 1 + this.galleryMedia.length) %
        this.galleryMedia.length
    },
    showNextImage() {
      this.pauseActiveVideo()
      this.lightboxIndex = (this.lightboxIndex + 1) % this.galleryMedia.length
    },
    pauseActiveVideo() {
      this.$refs.activeVideo?.pause()
    },
    handleGalleryKeydown(event) {
      if (!this.lightboxOpen) return

      if (event.key === "Escape") this.closeGallery()
      if (event.target?.tagName === "VIDEO") return
      if (event.key === "ArrowLeft") this.showPreviousImage()
      if (event.key === "ArrowRight") this.showNextImage()
    },
  },
}
</script>

<style scoped>
.atlas-detail {
  position: absolute;
  z-index: 10;
  top: 5.8rem;
  right: 1.25rem;
  bottom: 1.25rem;
  width: min(420px, calc(100vw - 2.5rem));
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 24px;
  background: rgba(var(--color-page-rgb, 9, 14, 17), 0.94);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.54);
  color: var(--color-text, #fff);
  backdrop-filter: blur(18px);
}

.atlas-detail-dock {
  display: none;
}

.atlas-detail-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--color-accent, #f6bd60)
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  scrollbar-width: thin;
}

.atlas-detail-scroll::-webkit-scrollbar {
  width: 7px;
}

.atlas-detail-scroll::-webkit-scrollbar-track {
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.05);
}

.atlas-detail-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--color-accent, #f6bd60);
}

.atlas-scroll-fade {
  position: absolute;
  z-index: 5;
  right: 0;
  bottom: 0;
  left: 0;
  height: 6.25rem;
  background: linear-gradient(
    180deg,
    rgba(var(--color-page-rgb, 9, 14, 17), 0),
    rgba(var(--color-page-rgb, 9, 14, 17), 0.74) 58%,
    rgba(var(--color-page-rgb, 9, 14, 17), 0.98)
  );
  pointer-events: none;
}

.atlas-detail-hero {
  position: relative;
  min-height: 300px;
}

.atlas-detail-hero-image,
.atlas-detail-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.atlas-detail-hero-image {
  overflow: hidden;
  border: 0;
  padding: 0;
  background: var(--color-surface, #10181c);
  color: var(--color-text, #fff);
  cursor: zoom-in;
}

.atlas-detail-hero-image.is-empty {
  background:
    radial-gradient(
      circle at 30% 24%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.2),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      var(--color-surface-raised, #17272e),
      var(--color-page, #091014)
    );
  cursor: default;
}

.atlas-detail-hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.atlas-detail-hero-image span {
  position: absolute;
  z-index: 2;
  top: 1rem;
  left: 50%;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.22);
  border-radius: 999px;
  padding: 0.48rem 0.7rem;
  background: rgba(var(--color-page-rgb, 5, 8, 10), 0.58);
  color: var(--color-text, #fff);
  font-size: 0.65rem;
  font-weight: 700;
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.atlas-detail-hero-image span.is-placeholder {
  top: 50%;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
}

.atlas-detail-shade {
  background: linear-gradient(
    180deg,
    rgba(var(--color-page-rgb, 4, 7, 9), 0.18) 20%,
    rgba(var(--color-page-rgb, 4, 7, 9), 0.96) 100%
  );
  pointer-events: none;
}

.atlas-detail-close,
.atlas-favorite {
  position: absolute;
  z-index: 2;
  top: 1rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.22);
  background: rgba(var(--color-page-rgb, 5, 8, 10), 0.58);
  color: var(--color-text, #fff);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.atlas-detail-close {
  left: 1rem;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 50%;
  font-size: 1.2rem;
}

.atlas-favorite {
  right: 1rem;
  border-radius: 999px;
  padding: 0.68rem 0.9rem;
  font-weight: 700;
}

.atlas-favorite.active {
  border-color: var(--color-accent, #f6bd60);
  color: var(--color-accent-soft, #f6bd60);
}

.atlas-detail-title {
  position: absolute;
  z-index: 1;
  right: 1.25rem;
  bottom: 1.25rem;
  left: 1.25rem;
}

.atlas-detail-date {
  display: inline-flex;
  width: fit-content;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.72);
  border-radius: 999px;
  padding: 0.32rem 0.56rem;
  background: rgba(var(--color-page-rgb, 8, 12, 15), 0.66);
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}

.atlas-section-heading span {
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.atlas-detail-title h1 {
  margin: 0.25rem 0;
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 0.98;
}

.atlas-detail-content {
  padding: 1.35rem 1.35rem 5.5rem;
}

.atlas-summary {
  margin: 0 0 1.4rem;
  font-size: 1.03rem;
  line-height: 1.65;
}

.atlas-note {
  border-left: 2px solid var(--color-accent, #f6bd60);
  padding-left: 1rem;
}

.atlas-story-lead + .atlas-note {
  margin-top: 1.4rem;
}

.atlas-note p {
  margin: 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  line-height: 1.55;
}

.atlas-stop-story {
  display: grid;
  grid-template-columns: minmax(108px, 0.72fr) minmax(0, 1.28fr);
  gap: 1rem;
  overflow: hidden;
  margin: 0 0 1.4rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.42);
  border-radius: 18px;
  padding: 0.85rem;
  background:
    linear-gradient(
      145deg,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.12),
      transparent 65%
    ),
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.035);
}

.atlas-stop-story-media {
  overflow: hidden;
  min-height: 176px;
  border: 0;
  border-radius: 12px;
  padding: 0;
  background: var(--color-surface, #10181c);
  cursor: pointer;
}

.atlas-stop-story-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.atlas-stop-story-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.atlas-stop-story-more > span {
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.atlas-stop-story h2 {
  margin: 0.35rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.28rem;
  font-weight: 500;
  line-height: 1.12;
}

.atlas-stop-story-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.55rem 0 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.7));
  font-size: 0.9rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.atlas-stop-story-action {
  align-self: flex-start;
  min-height: 2.65rem;
  margin-top: auto;
  border: 1px solid var(--color-accent, #f6bd60);
  border-radius: 999px;
  padding: 0.62rem 0.82rem;
  background: var(--color-accent, #f6bd60);
  color: var(--color-accent-contrast, #111719);
  font: inherit;
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  cursor: pointer;
}

.atlas-stop-story-more {
  display: grid;
  grid-column: 1 / -1;
  gap: 0.5rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  padding-top: 0.8rem;
}

.atlas-stop-story-more button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 12px;
  padding: 0.7rem 0.75rem;
  background: rgba(0, 0, 0, 0.16);
  color: var(--color-text, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.atlas-stop-story-more strong {
  font-size: 0.86rem;
  line-height: 1.3;
}

.atlas-stop-story-more small {
  flex: 0 0 auto;
  color: var(--color-accent-soft, #f6bd60);
  font-weight: 800;
}

.atlas-stop-story button:hover,
.atlas-stop-story button:focus-visible {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

.atlas-story-lead {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  overflow: hidden;
  margin-top: 1.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.38);
  border-radius: 18px;
  padding: 0.85rem;
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.065);
}

.atlas-story-lead.has-media {
  grid-template-columns: minmax(118px, 0.8fr) minmax(0, 1.2fr);
}

.atlas-story-lead-media {
  display: block;
  overflow: hidden;
  width: 100%;
  min-height: 164px;
  border: 0;
  border-radius: 12px;
  padding: 0;
  background: var(--color-surface, #10181c);
  cursor: pointer;
}

.atlas-story-lead-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.atlas-story-lead-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.atlas-story-lead-date {
  margin-bottom: 0.42rem;
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}

.atlas-story-lead h2,
.atlas-section-heading h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 500;
}

.atlas-story-lead h2 {
  font-size: 1.35rem;
  line-height: 1.08;
}

.atlas-story-lead p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.55rem 0 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  font-size: 1rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.atlas-story-lead .atlas-story-progress-note {
  display: block;
  overflow: visible;
  border-left: 2px solid var(--color-accent, #f6bd60);
  padding-left: 0.75rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.72));
  font-size: 0.86rem;
  line-height: 1.55;
  -webkit-line-clamp: unset;
}

.atlas-story-lead-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.8rem;
}

.atlas-story-lead-actions a,
.atlas-story-lead-actions button {
  min-height: 2.65rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.18);
  border-radius: 999px;
  padding: 0.62rem 0.78rem;
  background: transparent;
  color: var(--color-text, #fff);
  font: inherit;
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.atlas-story-lead-actions .is-primary {
  border-color: var(--color-accent, #f6bd60);
  background: var(--color-accent, #f6bd60);
  color: var(--color-accent-contrast, #111719);
}

.atlas-story-lead-actions a:hover,
.atlas-story-lead-actions a:focus-visible,
.atlas-story-lead-actions button:hover,
.atlas-story-lead-actions button:focus-visible {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

.atlas-discoveries,
.atlas-adjacent,
.atlas-related,
.atlas-mini-gallery,
.atlas-actions {
  margin-top: 1.8rem;
}

.atlas-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.atlas-section-heading strong {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.46));
  font-size: 0.72rem;
}

.atlas-section-heading h2 {
  color: var(--color-accent-soft, #f6bd60);
  font-family: inherit;
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.atlas-discoveries > button {
  display: grid;
  grid-template-columns: 66px 1fr auto;
  align-items: center;
  width: 100%;
  gap: 0.8rem;
  border: 0;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  padding: 0.75rem 0;
  background: transparent;
  color: var(--color-text, #fff);
  text-align: left;
  cursor: pointer;
}

.atlas-discoveries img,
.atlas-discovery-placeholder {
  width: 66px;
  height: 54px;
  border-radius: 9px;
}

.atlas-discoveries img {
  object-fit: cover;
}

.atlas-discovery-placeholder,
.atlas-dock-placeholder {
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.2),
      transparent 38%
    ),
    var(--color-surface-raised, #142128);
}

.atlas-discoveries button > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-weight: 700;
}

.atlas-destination-index em {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.58));
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 500;
}

.atlas-destination-index .atlas-discovery-placeholder {
  display: grid;
  place-items: center;
}

.atlas-destination-index .atlas-discovery-placeholder.is-video b {
  color: var(--color-accent-soft, #e6ba68);
  font-size: 1rem;
}

.atlas-discoveries small {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.46));
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.atlas-related > div:last-child,
.atlas-mini-gallery > div {
  display: flex;
  gap: 0.55rem;
}

.atlas-related > div:last-child {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.atlas-adjacent > div:last-child {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.atlas-adjacent button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.04);
  color: var(--color-text, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.atlas-adjacent small {
  color: var(--color-accent-soft, #f6bd60);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.atlas-adjacent strong {
  overflow: hidden;
  text-overflow: ellipsis;
}

.atlas-adjacent button:hover,
.atlas-adjacent button:focus-visible {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

.atlas-related button {
  display: grid;
  grid-template-columns: 1.15rem minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 4.5rem;
  gap: 0.65rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  border-radius: 14px;
  padding: 0.75rem 0.8rem;
  background: linear-gradient(
    145deg,
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.075),
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.025)
  );
  color: var(--color-text, #fff);
  font: inherit;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.atlas-related button:only-child {
  grid-column: 1 / -1;
}

.atlas-related-marker {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: var(--color-accent-soft, #f6bd60);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.atlas-related strong {
  min-width: 0;
  font-size: max(0.875rem, 14px);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.atlas-related button:hover {
  border-color: rgba(var(--color-accent-rgb, 246, 189, 96), 0.48);
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.1);
  transform: translateY(-1px);
}

.atlas-related button:focus-visible {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

.atlas-mini-gallery > div {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 0.1rem 0 0.45rem;
  scroll-padding-inline: 0.1rem;
  scroll-snap-type: x mandatory;
}

.atlas-mini-gallery > div > button {
  position: relative;
  flex: 0 0 76%;
  width: 76%;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  padding: 0;
  background: var(--color-surface, #10181c);
  cursor: zoom-in;
  scroll-snap-align: start;
}

.atlas-mini-gallery img,
.atlas-video-tile {
  display: block;
  width: 100%;
  height: 150px;
}

.atlas-mini-gallery img {
  object-fit: cover;
}

.atlas-mini-gallery > div > button.is-video {
  cursor: pointer;
}

.atlas-video-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.55rem;
  background:
    radial-gradient(
      circle at 50% 42%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.2),
      transparent 42%
    ),
    linear-gradient(
      145deg,
      var(--color-surface-raised, #17272e),
      var(--color-page, #091014)
    );
  color: var(--color-text, #fff);
}

.atlas-video-tile b {
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.72);
  border-radius: 50%;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.72);
  color: var(--color-accent-soft, #f6bd60);
  font-size: 1rem;
  text-indent: 0.12em;
}

.atlas-video-tile > span {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.atlas-media-badge {
  position: absolute;
  right: 0.55rem;
  bottom: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  place-items: center;
  min-width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  padding: 0 0.38rem;
  background: rgba(var(--color-page-rgb, 5, 8, 10), 0.74);
  color: var(--color-text, #fff);
  font-size: 0.68rem;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.atlas-detail-hero-image:focus-visible,
.atlas-mini-gallery button:focus-visible {
  outline: 3px solid var(--color-focus, #f6bd60);
  outline-offset: -3px;
}

.atlas-actions {
  display: block;
}

.atlas-actions > div:last-child {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.atlas-actions a {
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.38);
  border-radius: 999px;
  padding: 0.65rem 0.8rem;
  color: var(--color-accent-soft, #f8d79f);
  font-size: max(0.875rem, 14px);
  font-weight: 700;
  text-decoration: none;
}

.atlas-actions a:hover,
.atlas-actions a:focus-visible {
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.1);
}

.atlas-lightbox {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(3.5rem, 8vw) minmax(0, 1fr) minmax(3.5rem, 8vw);
  align-items: center;
  padding: clamp(1rem, 3vw, 2.5rem);
  background: rgba(var(--color-page-rgb, 2, 5, 7), 0.96);
  backdrop-filter: blur(20px);
}

.atlas-lightbox figure {
  grid-column: 2;
  max-width: 100%;
  margin: 0;
}

.atlas-lightbox figure img,
.atlas-lightbox figure video {
  display: block;
  width: 100%;
  height: min(78vh, 900px);
  background: var(--color-page, #020507);
  object-fit: contain;
}

.atlas-lightbox figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.8rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.72));
}

.atlas-lightbox figcaption strong {
  color: var(--color-text, #fff);
}

.atlas-lightbox button {
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.07);
  color: var(--color-text, #fff);
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.atlas-lightbox button:hover,
.atlas-lightbox button:focus-visible {
  border-color: var(--color-accent, #f6bd60);
  color: var(--color-accent-soft, #f6bd60);
}

.atlas-lightbox-close {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.8rem;
}

.atlas-lightbox-previous,
.atlas-lightbox-next {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.2rem;
}

.atlas-lightbox-previous {
  grid-column: 1;
  justify-self: start;
}

.atlas-lightbox-next {
  grid-column: 3;
  justify-self: end;
}

@media (orientation: portrait) {
  .atlas-detail {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 82dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 24px 24px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .atlas-detail:not(.is-expanded) {
    border-top-color: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.18);
    background: rgba(var(--color-page-rgb, 7, 11, 14), 0.9);
  }

  /* Leave the journey controls and a useful slice of the map visible while a
     stop is presenting media. The detail content remains independently
     scrollable, so the smaller guided drawer does not hide any story fields. */
  .atlas-detail.is-guided {
    max-height: min(62dvh, calc(100dvh - 18rem));
  }

  /* The journey player reports its live bottom edge, including a map gutter.
     This remains accurate when copy wraps or the mobile viewport changes. */
  .atlas-detail.is-expanded.has-expanded-guide {
    max-height: min(
      54dvh,
      calc(100dvh - var(--atlas-guided-clearance, 22.5rem))
    );
  }

  .atlas-detail:not(.is-expanded) .atlas-detail-scroll {
    display: none;
  }

  .atlas-detail:not(.is-expanded) .atlas-scroll-fade {
    display: none;
  }

  .atlas-scroll-fade {
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
    height: 5.5rem;
  }

  .atlas-detail-scroll {
    order: 1;
    min-height: 0;
    scroll-padding-bottom: 5.5rem;
  }

  .atlas-detail-dock {
    order: 2;
    display: grid;
    grid-template-columns: 5rem minmax(0, 1fr) 5rem;
    align-items: stretch;
    min-height: 5.75rem;
    border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
    background: rgba(var(--color-page-rgb, 7, 11, 14), 0.96);
  }

  .atlas-detail:not(.is-expanded) .atlas-detail-dock {
    border-top: 0;
  }

  .atlas-detail-dock button {
    border: 0;
    background: transparent;
    color: var(--color-text, #fff);
    font: inherit;
    cursor: pointer;
  }

  .atlas-dock-action {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.18rem;
    color: var(--color-text-muted, rgba(255, 255, 255, 0.7)) !important;
    font-size: 0.76rem !important;
    font-weight: 700 !important;
  }

  .atlas-dock-action > .atlas-dock-icon {
    color: var(--color-text, #fff);
    font-size: 1.35rem;
  }

  .atlas-dock-action.active,
  .atlas-dock-action.active > .atlas-dock-icon {
    color: var(--color-accent-soft, #f6bd60) !important;
  }

  .atlas-dock-count {
    position: absolute;
    top: 0.72rem;
    right: 0.55rem;
    display: inline-grid;
    place-items: center;
    min-width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: var(--color-accent, #f6bd60);
    color: var(--color-accent-contrast, #111);
    font-size: 0.65rem;
    font-weight: 800;
  }

  .atlas-dock-place {
    display: grid;
    grid-template-columns: 3.75rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
    padding: 0.65rem 0.5rem;
    text-align: left;
  }

  .atlas-dock-place img,
  .atlas-dock-placeholder {
    width: 3.75rem;
    height: 3.75rem;
    border-radius: 12px;
  }

  .atlas-dock-place img {
    object-fit: cover;
  }

  .atlas-dock-place > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.18rem;
  }

  .atlas-dock-place strong {
    font-size: 1rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .atlas-dock-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    color: var(--color-text-muted, rgba(255, 255, 255, 0.62));
  }

  .atlas-dock-chevron {
    width: 1.15rem;
    height: 1.15rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
    transform: rotate(180deg);
    transition: transform 180ms ease;
  }

  .atlas-dock-chevron.is-open {
    transform: rotate(0);
  }

  .atlas-dock-toggle > small {
    color: var(--color-text-muted, rgba(255, 255, 255, 0.62));
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
  }

  .atlas-detail-close,
  .atlas-favorite {
    display: none;
  }

  .atlas-detail-hero {
    min-height: 250px;
  }

  .atlas-detail-hero-image span {
    font-size: 0.8rem;
  }

  .atlas-section-heading span {
    font-size: 0.8rem;
  }

  .atlas-detail-title h1 {
    font-size: clamp(2.25rem, 10vw, 3rem);
  }

  .atlas-note p {
    font-size: 1rem;
  }

  .atlas-detail-content {
    padding: 1.4rem 1.4rem 6.5rem;
  }

  .atlas-summary {
    font-size: 1.08rem;
  }

  .atlas-stop-story {
    grid-template-columns: 1fr;
    padding: 0.9rem;
  }

  .atlas-stop-story-media {
    min-height: 150px;
    max-height: 210px;
  }

  .atlas-stop-story-more > span {
    font-size: 0.76rem;
  }

  .atlas-stop-story h2 {
    font-size: 1.55rem;
  }

  .atlas-stop-story-copy p {
    font-size: max(1rem, 16px);
    -webkit-line-clamp: 5;
  }

  .atlas-stop-story-action {
    min-height: 3rem;
    margin-top: 0.9rem;
  }

  .atlas-stop-story-more {
    grid-column: auto;
  }

  .atlas-section-heading strong {
    font-size: 0.82rem;
  }

  .atlas-story-lead {
    grid-template-columns: 1fr;
    padding: 0.9rem;
  }

  .atlas-story-lead-media {
    min-height: 150px;
    max-height: 210px;
  }

  .atlas-story-lead h2 {
    font-size: 1.65rem;
  }

  .atlas-story-lead p {
    font-size: max(1rem, 16px);
    -webkit-line-clamp: 5;
  }

  .atlas-story-lead-actions a,
  .atlas-story-lead-actions button {
    min-height: 3rem;
    font-size: max(0.875rem, 14px);
  }

  .atlas-section-heading h2 {
    font-size: 0.88rem;
  }

  .atlas-discoveries > button {
    grid-template-columns: 72px minmax(0, 1fr) auto;
    min-height: 5rem;
    padding: 0.85rem 0;
    font: inherit;
    font-size: 1rem;
  }

  .atlas-discoveries img,
  .atlas-discovery-placeholder {
    width: 72px;
    height: 60px;
  }

  .atlas-discoveries small {
    font-size: 0.76rem;
  }

  .atlas-related button {
    min-height: 4.75rem;
    padding: 0.8rem;
  }

  .atlas-actions a {
    min-height: 3rem;
    font-size: 1rem;
  }

  .atlas-media-badge {
    min-width: 2rem;
    height: 2rem;
    font-size: 0.78rem;
  }

  .atlas-lightbox {
    grid-template-columns: 3rem minmax(0, 1fr) 3rem;
    padding: max(0.75rem, env(safe-area-inset-top)) 0.65rem
      max(0.75rem, env(safe-area-inset-bottom));
  }

  .atlas-lightbox figure img,
  .atlas-lightbox figure video {
    height: 72dvh;
  }

  .atlas-lightbox-previous,
  .atlas-lightbox-next {
    width: 3rem;
    height: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-dock-chevron {
    transition: none;
  }
}
</style>
