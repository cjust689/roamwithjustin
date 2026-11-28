<template>
  <aside
    class="atlas-story-reader"
    :class="{ 'is-map-preview': mapPreviewOpen }"
    :role="readerRole"
    :aria-modal="readerIsModal ? 'true' : null"
    :aria-labelledby="`atlas-reader-title-${trip.journeyId}`"
  >
    <header class="atlas-reader-toolbar">
      <button ref="backButton" type="button" @click="$emit('close')">
        Back to journey
      </button>
      <button
        class="atlas-reader-map-toggle"
        type="button"
        :aria-pressed="String(mapPreviewOpen)"
        @click="toggleMapPreview"
      >
        {{ mapPreviewOpen ? "Continue reading" : "Show map" }}
      </button>
      <span aria-hidden="true">{{ scrollProgress }}%</span>
    </header>

    <div
      ref="readerScroll"
      class="atlas-reader-scroll"
      tabindex="0"
      @pointerdown="cancelScrollRestore"
      @touchstart.passive="cancelScrollRestore"
      @wheel.passive="cancelScrollRestore"
      @scroll="handleScroll"
    >
      <article class="atlas-reader-article">
        <header class="atlas-reader-hero">
          <img
            v-if="trip.cover"
            :src="trip.cover"
            :alt="`${trip.name} story photograph`"
            decoding="async"
            fetchpriority="high"
          />
          <div class="atlas-reader-hero-shade" aria-hidden="true"></div>
          <div class="atlas-reader-heading">
            <span>{{ trip.dates }}</span>
            <h1 :id="`atlas-reader-title-${trip.journeyId}`">
              {{ trip.name }}
            </h1>
            <p v-if="trip.description">{{ trip.description }}</p>
          </div>
        </header>

        <div class="atlas-reader-body">
          <JourneyStoryBody
            ref="storyBody"
            :trip="trip"
            :focused-section-id="initialSectionId"
            embedded
            show-field-notes
            @open-location="openLocation"
            @open-media="openMedia"
            @show-stop="showStop"
          />

          <footer class="atlas-reader-footer">
            <p>You have reached the end of this journey story.</p>
            <button type="button" @click="$emit('close')">
              Back to journey
            </button>
          </footer>
        </div>
      </article>
    </div>

    <LocationModal
      :open="modalOpen"
      :location="activeLocation"
      @close="closeLocation"
    />

    <div
      v-if="lightboxMedia"
      class="atlas-reader-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="lightboxMedia.alt"
      @click.self="closeMedia"
    >
      <button
        ref="lightboxClose"
        type="button"
        aria-label="Close photograph"
        @click="closeMedia"
      >
        &times;
      </button>
      <figure>
        <img :src="lightboxMedia.src" :alt="lightboxMedia.alt" />
        <figcaption v-if="lightboxMedia.caption">
          {{ lightboxMedia.caption }}
        </figcaption>
      </figure>
    </div>
  </aside>
</template>

<script>
import JourneyStoryBody from "@/components/JourneyStoryBody.vue"
import LocationModal from "@/components/LocationModal.vue"

export default {
  name: "AtlasStoryReader",
  components: {
    JourneyStoryBody,
    LocationModal,
  },
  props: {
    trip: {
      type: Object,
      required: true,
    },
    initialScroll: {
      type: Number,
      default: 0,
    },
    initialSectionId: {
      type: String,
      default: "",
    },
  },
  emits: ["close", "scroll-position", "show-stop"],
  data() {
    return {
      activeLocation: null,
      lightboxMedia: null,
      lightboxTrigger: null,
      focusInitialSection:
        this.initialScroll <= 0 && Boolean(this.initialSectionId),
      mapPreviewOpen: false,
      mobileLayout:
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 720px), (orientation: portrait)")
          .matches,
      modalOpen: false,
      restoreTimer: null,
      restoreFrame: null,
      scrollProgress: 0,
      scrollFrame: null,
      userInterruptedRestore: false,
    }
  },
  computed: {
    readerIsModal() {
      return this.mobileLayout && !this.mapPreviewOpen
    },
    readerRole() {
      return this.readerIsModal ? "dialog" : "region"
    },
  },
  watch: {
    initialSectionId(sectionId, previousSectionId) {
      if (!sectionId || sectionId === previousSectionId) return
      this.$nextTick(() => {
        this.$refs.storyBody?.scrollToStorySection(sectionId, { focus: true })
        this.updateProgress()
        this.emitScrollPosition()
      })
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeydown)
    window.addEventListener("resize", this.updateLayoutMode)
    this.updateLayoutMode()
    this.$nextTick(() => {
      this.focusInitial()
      this.restoreScroll()
      this.restoreFrame = window.requestAnimationFrame(this.restoreScroll)
      this.restoreTimer = window.setTimeout(this.completeInitialRestore, 180)
    })
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.removeEventListener("keydown", this.handleKeydown)
    window.removeEventListener("resize", this.updateLayoutMode)
    if (this.restoreTimer != null) window.clearTimeout(this.restoreTimer)
    if (this.restoreFrame != null)
      window.cancelAnimationFrame(this.restoreFrame)
    if (this.scrollFrame != null) window.cancelAnimationFrame(this.scrollFrame)
  },
  methods: {
    updateLayoutMode() {
      this.mobileLayout = window.matchMedia(
        "(max-width: 720px), (orientation: portrait)"
      ).matches
    },
    focusInitial() {
      this.$refs.backButton?.focus()
    },
    getScrollPosition() {
      return this.$refs.readerScroll?.scrollTop || 0
    },
    restoreScroll() {
      if (!this.$refs.readerScroll || this.userInterruptedRestore) return
      if (this.initialScroll > 0) {
        this.$refs.readerScroll.scrollTop = Math.max(0, this.initialScroll)
      } else if (this.initialSectionId) {
        this.$refs.storyBody?.scrollToStorySection(this.initialSectionId)
      } else {
        this.$refs.readerScroll.scrollTop = 0
      }
      this.updateProgress()
    },
    completeInitialRestore() {
      this.restoreTimer = null
      this.restoreFrame = null
      this.restoreScroll()
      if (
        !this.userInterruptedRestore &&
        this.focusInitialSection &&
        this.initialSectionId
      ) {
        this.$refs.storyBody?.scrollToStorySection(this.initialSectionId, {
          focus: true,
        })
      }
    },
    cancelScrollRestore() {
      this.userInterruptedRestore = true
      if (this.restoreTimer != null) {
        window.clearTimeout(this.restoreTimer)
        this.restoreTimer = null
      }
      if (this.restoreFrame != null) {
        window.cancelAnimationFrame(this.restoreFrame)
        this.restoreFrame = null
      }
    },
    handleScroll() {
      if (this.scrollFrame != null) return
      this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null
        this.updateProgress()
        this.emitScrollPosition()
      })
    },
    updateProgress() {
      const scroller = this.$refs.readerScroll
      if (!scroller) return
      const maximum = scroller.scrollHeight - scroller.clientHeight
      this.scrollProgress =
        maximum > 0
          ? Math.min(100, Math.round((scroller.scrollTop / maximum) * 100))
          : 100
    },
    emitScrollPosition() {
      this.$emit("scroll-position", this.getScrollPosition())
    },
    toggleMapPreview() {
      this.mapPreviewOpen = !this.mapPreviewOpen
      this.$nextTick(this.updateProgress)
    },
    openLocation(location) {
      this.activeLocation = location
      this.modalOpen = true
    },
    closeLocation() {
      this.modalOpen = false
    },
    showStop(location) {
      this.emitScrollPosition()
      this.$emit("show-stop", location)
    },
    openMedia(media, trigger) {
      this.lightboxMedia = media
      this.lightboxTrigger = trigger
      this.$nextTick(() => this.$refs.lightboxClose?.focus())
    },
    closeMedia() {
      if (!this.lightboxMedia) return
      this.lightboxMedia = null
      this.$nextTick(() => this.lightboxTrigger?.focus())
    },
    handleKeydown(event) {
      if (
        ["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"].includes(
          event.key
        )
      ) {
        this.cancelScrollRestore()
      }
      if (this.lightboxMedia && event.key === "Tab") {
        event.preventDefault()
        this.$refs.lightboxClose?.focus()
        return
      }
      if (event.key === "Tab" && this.readerIsModal) {
        this.containMobileFocus(event)
        return
      }
      if (event.key !== "Escape") return
      if (this.lightboxMedia) {
        this.closeMedia()
        return
      }
      if (this.modalOpen) {
        this.closeLocation()
        return
      }
      this.$emit("close")
    },
    containMobileFocus(event) {
      const focusable = Array.from(
        this.$el.querySelectorAll(
          'a[href], button:not([disabled]), video[controls], [tabindex="0"]'
        )
      ).filter(element => element.getClientRects().length)
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
  },
}
</script>

<style scoped>
.atlas-story-reader {
  position: absolute;
  z-index: 15;
  top: 5.8rem;
  right: 1.25rem;
  bottom: 1.25rem;
  display: grid;
  width: min(46vw, 720px);
  min-width: 540px;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.16);
  border-radius: 24px;
  background: var(--color-page, #0b1114);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.6);
  color: var(--color-text, #fff);
}

.atlas-reader-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 4rem;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  padding: 0.65rem 0.8rem;
  background: rgba(var(--color-page-rgb, 7, 11, 14), 0.98);
}

.atlas-reader-toolbar button,
.atlas-reader-footer button {
  min-height: 2.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 246, 189, 96), 0.44);
  border-radius: 999px;
  padding: 0.62rem 0.85rem;
  background: rgba(var(--color-accent-rgb, 246, 189, 96), 0.08);
  color: var(--color-text, #fff);
  font: inherit;
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  cursor: pointer;
}

.atlas-reader-toolbar > span {
  min-width: 2.6rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.62));
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  text-align: right;
}

.atlas-reader-map-toggle {
  display: none;
}

.atlas-reader-scroll {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-bottom: 3rem;
  scrollbar-color: var(--color-accent, #f6bd60)
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  scrollbar-width: thin;
}

.atlas-reader-scroll:focus-visible {
  outline: 3px solid var(--color-focus, #f6bd60);
  outline-offset: -3px;
}

.atlas-reader-hero {
  position: relative;
  display: flex;
  min-height: min(68vh, 660px);
  align-items: flex-end;
  overflow: hidden;
  background: var(--color-surface-raised, #152229);
}

.atlas-reader-hero > img,
.atlas-reader-hero-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.atlas-reader-hero > img {
  object-fit: cover;
}

.atlas-reader-hero-shade {
  background: linear-gradient(
    180deg,
    rgba(var(--color-page-rgb, 4, 7, 9), 0.08),
    var(--color-page, #0b1114) 94%
  );
}

.atlas-reader-heading {
  position: relative;
  z-index: 1;
  padding: clamp(1.4rem, 4vw, 3rem);
}

.atlas-reader-heading > span {
  color: var(--color-accent-soft, #f6bd60);
  font-size: max(0.875rem, 14px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.atlas-reader-heading h1 {
  max-width: 680px;
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 7vw, 6.4rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.9;
  overflow-wrap: anywhere;
}

.atlas-reader-heading p {
  max-width: 640px;
  margin: 1.2rem 0 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.8));
  font-size: max(1rem, 16px);
  line-height: 1.7;
}

.atlas-reader-body {
  padding: clamp(3rem, 7vw, 5rem) clamp(1rem, 3vw, 2.5rem) 4rem;
}

.atlas-reader-footer {
  display: grid;
  justify-items: start;
  gap: 0.8rem;
  margin-top: 4rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.14);
  padding-top: 1.5rem;
}

.atlas-reader-footer p {
  margin: 0;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  font-size: max(1rem, 16px);
}

.atlas-reader-lightbox {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 4vw, 3rem);
  background: rgba(var(--color-page-rgb, 2, 5, 7), 0.96);
  backdrop-filter: blur(18px);
}

.atlas-reader-lightbox > button {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  width: 3rem;
  height: 3rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.28);
  border-radius: 50%;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  color: var(--color-text, #fff);
  font-size: 1.8rem;
  cursor: pointer;
}

.atlas-reader-lightbox figure {
  max-width: min(1200px, 92vw);
  margin: 0;
}

.atlas-reader-lightbox img {
  display: block;
  max-width: 100%;
  max-height: 82vh;
  object-fit: contain;
}

.atlas-reader-lightbox figcaption {
  margin-top: 0.75rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.76));
  font-size: max(1rem, 16px);
}

button:focus-visible {
  outline: 3px solid var(--color-focus, #fff);
  outline-offset: 2px;
}

@media (max-width: 1100px) and (orientation: landscape) {
  .atlas-story-reader {
    width: min(52vw, 660px);
    min-width: min(480px, calc(100vw - 2.5rem));
  }
}

@media (max-width: 720px), (orientation: portrait) {
  .atlas-story-reader {
    position: fixed;
    z-index: 30;
    inset: 0;
    width: 100%;
    min-width: 0;
    border: 0;
    border-radius: 0;
    transition: top 180ms ease;
  }

  .atlas-story-reader.is-map-preview {
    top: 32dvh;
    border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
    border-radius: 22px 22px 0 0;
  }

  .atlas-reader-map-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .atlas-reader-hero {
    min-height: min(72dvh, 620px);
  }

  .atlas-reader-heading h1 {
    font-size: clamp(3rem, 15vw, 5rem);
  }

  .atlas-reader-body {
    padding-right: 1rem;
    padding-left: 1rem;
  }
}

@media (max-width: 390px) {
  .atlas-reader-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .atlas-reader-toolbar > span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-story-reader {
    transition: none;
  }
}
</style>
