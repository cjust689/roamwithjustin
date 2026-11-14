<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <div class="atlas-detail-root">
    <aside
      class="atlas-detail"
      :class="{ 'is-expanded': mobileExpanded }"
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
          <span aria-hidden="true">&larr;</span>
          Back
        </button>
        <button
          class="atlas-dock-place"
          type="button"
          :aria-expanded="String(mobileExpanded)"
          aria-controls="atlas-detail-content"
          @click="mobileExpanded = !mobileExpanded"
        >
          <img :src="node.image" alt="" />
          <span>
            <small>{{ node.eyebrow }}</small>
            <strong>{{ node.title }}</strong>
          </span>
          <span class="atlas-dock-toggle" aria-hidden="true">
            <span>{{ mobileExpanded ? "&#8964;" : "&#8963;" }}</span>
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
          <span aria-hidden="true">{{
            isFavorite ? "&#9733;" : "&#9734;"
          }}</span>
          {{ isFavorite ? "Saved" : "Save" }}
        </button>
      </div>

      <div id="atlas-detail-content" class="atlas-detail-scroll">
        <div class="atlas-detail-hero">
          <button
            class="atlas-detail-hero-image"
            type="button"
            :aria-label="`View ${node.title} photograph full screen`"
            @click="openGallery(node.image)"
          >
            <img :src="node.image" :alt="node.title" />
            <span>View full photo</span>
          </button>
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
            <span>{{ node.eyebrow }}</span>
            <h1>{{ node.title }}</h1>
            <p>{{ node.category }}</p>
          </div>
        </div>

        <div class="atlas-detail-content">
          <p class="atlas-summary">{{ node.summary }}</p>
          <div class="atlas-note">
            <span>From the trip</span>
            <p>{{ node.personalNote }}</p>
          </div>

          <section v-if="children.length" class="atlas-discoveries">
            <div class="atlas-section-heading">
              <span>Explore deeper</span>
              <strong>{{ children.length }} places</strong>
            </div>
            <button
              v-for="(child, childIndex) in children"
              :key="child.id"
              type="button"
              @click="$emit('select', child.id)"
            >
              <img :src="child.image" alt="" loading="lazy" />
              <span
                ><small>Stop {{ childIndex + 1 }} · {{ child.eyebrow }}</small
                >{{ child.title }}</span
              >
              <span aria-hidden="true">&rarr;</span>
            </button>
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
                {{ item.title }}
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
                type="button"
                :aria-label="`Open ${node.title} ${media.kind} ${mediaIndex + 1} of ${galleryMedia.length}`"
                @click="openGallery(media)"
              >
                <img
                  v-if="media.kind === 'image'"
                  :src="media.src"
                  :alt="media.alt"
                  loading="lazy"
                />
                <video
                  v-else
                  muted
                  playsinline
                  preload="metadata"
                  :poster="media.poster"
                  :aria-label="media.alt"
                >
                  <source :src="media.src" :type="media.mimeType" />
                </video>
                <span class="atlas-media-badge">
                  <span v-if="media.kind === 'video'" aria-hidden="true"
                    >&#9654;</span
                  >
                  {{ mediaIndex + 1 }}
                </span>
              </button>
            </div>
          </section>

          <div v-if="node.actions.length" class="atlas-actions">
            <template v-for="action in node.actions">
              <router-link
                v-if="action.type === 'internal'"
                :key="action.label"
                :to="action.href"
              >
                {{ action.label }}
              </router-link>
              <a
                v-else
                :key="action.label"
                :href="action.href"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ action.label }}
              </a>
            </template>
          </div>
        </div>
      </div>
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
export default {
  name: "AtlasDetailPanel",
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
    isFavorite: Boolean,
    expandRequest: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      mobileExpanded: false,
      lightboxOpen: false,
      lightboxIndex: 0,
      previouslyFocusedElement: null,
    }
  },
  computed: {
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
  },
  watch: {
    node() {
      this.mobileExpanded = false
      this.closeGallery(false)
    },
    expandRequest() {
      // Match the same condition that turns this panel into a bottom drawer.
      // Desktop/sidebar navigation should remain compact and unchanged.
      if (window.matchMedia("(orientation: portrait)").matches) {
        this.mobileExpanded = true
      }
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleGalleryKeydown)
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.removeEventListener("keydown", this.handleGalleryKeydown)
  },
  methods: {
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
        poster: isVideo ? media.poster || this.node.image : "",
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
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  background: rgba(9, 14, 17, 0.94);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.54);
  color: #fff;
  backdrop-filter: blur(18px);
}

.atlas-detail-dock {
  display: none;
}

.atlas-detail-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
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
  background: #10181c;
  color: #fff;
  cursor: zoom-in;
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
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 0.48rem 0.7rem;
  background: rgba(5, 8, 10, 0.58);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.atlas-detail-shade {
  background: linear-gradient(
    180deg,
    rgba(4, 7, 9, 0.18) 20%,
    rgba(4, 7, 9, 0.96) 100%
  );
  pointer-events: none;
}

.atlas-detail-close,
.atlas-favorite {
  position: absolute;
  z-index: 2;
  top: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(5, 8, 10, 0.58);
  color: #fff;
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
  border-color: #f6bd60;
  color: #f6bd60;
}

.atlas-detail-title {
  position: absolute;
  z-index: 1;
  right: 1.25rem;
  bottom: 1.25rem;
  left: 1.25rem;
}

.atlas-detail-title span,
.atlas-note span,
.atlas-section-heading span {
  color: #f6bd60;
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

.atlas-detail-title p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.atlas-detail-content {
  padding: 1.35rem;
}

.atlas-summary {
  margin: 0 0 1.4rem;
  font-size: 1.03rem;
  line-height: 1.65;
}

.atlas-note {
  border-left: 2px solid #f6bd60;
  padding-left: 1rem;
}

.atlas-note p {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.55;
}

.atlas-discoveries,
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
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.72rem;
}

.atlas-discoveries > button {
  display: grid;
  grid-template-columns: 66px 1fr auto;
  align-items: center;
  width: 100%;
  gap: 0.8rem;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.75rem 0;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.atlas-discoveries img {
  width: 66px;
  height: 54px;
  border-radius: 9px;
  object-fit: cover;
}

.atlas-discoveries button > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-weight: 700;
}

.atlas-discoveries small {
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.atlas-related > div,
.atlas-mini-gallery > div {
  display: flex;
  gap: 0.55rem;
}

.atlas-related button {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.62rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
}

.atlas-mini-gallery > div {
  overflow-x: auto;
  padding: 0.1rem 0 0.45rem;
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
  background: #10181c;
  cursor: zoom-in;
  scroll-snap-align: start;
}

.atlas-mini-gallery img,
.atlas-mini-gallery video {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: cover;
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
  background: rgba(5, 8, 10, 0.74);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.atlas-detail-hero-image:focus-visible,
.atlas-mini-gallery button:focus-visible {
  outline: 3px solid #f6bd60;
  outline-offset: -3px;
}

.atlas-actions {
  display: grid;
  gap: 0.6rem;
}

.atlas-actions a {
  border: 1px solid rgba(246, 189, 96, 0.38);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  color: #f8d79f;
  text-align: center;
  text-decoration: none;
}

.atlas-actions a:hover,
.atlas-actions a:focus-visible {
  background: rgba(246, 189, 96, 0.1);
}

.atlas-lightbox {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(3.5rem, 8vw) minmax(0, 1fr) minmax(3.5rem, 8vw);
  align-items: center;
  padding: clamp(1rem, 3vw, 2.5rem);
  background: rgba(2, 5, 7, 0.96);
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
  background: #020507;
  object-fit: contain;
}

.atlas-lightbox figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.8rem;
  color: rgba(255, 255, 255, 0.72);
}

.atlas-lightbox figcaption strong {
  color: #fff;
}

.atlas-lightbox button {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.atlas-lightbox button:hover,
.atlas-lightbox button:focus-visible {
  border-color: #f6bd60;
  color: #f6bd60;
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
    max-height: 78dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 24px 24px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .atlas-detail:not(.is-expanded) {
    border-top-color: rgba(255, 255, 255, 0.18);
    background: rgba(7, 11, 14, 0.9);
  }

  .atlas-detail:not(.is-expanded) .atlas-detail-scroll {
    display: none;
  }

  .atlas-detail-scroll {
    order: 1;
    min-height: 0;
  }

  .atlas-detail-dock {
    order: 2;
    display: grid;
    grid-template-columns: 4.25rem minmax(0, 1fr) 4.25rem;
    align-items: stretch;
    min-height: 4.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(7, 11, 14, 0.96);
  }

  .atlas-detail:not(.is-expanded) .atlas-detail-dock {
    border-top: 0;
  }

  .atlas-detail-dock button {
    border: 0;
    background: transparent;
    color: #fff;
    font: inherit;
    cursor: pointer;
  }

  .atlas-dock-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.18rem;
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 0.58rem !important;
    font-weight: 700 !important;
  }

  .atlas-dock-action > span {
    color: #fff;
    font-size: 1.1rem;
  }

  .atlas-dock-action.active,
  .atlas-dock-action.active > span {
    color: #f6bd60 !important;
  }

  .atlas-dock-place {
    display: grid;
    grid-template-columns: 3.25rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
    padding: 0.55rem 0.45rem;
    text-align: left;
  }

  .atlas-dock-place img {
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 12px;
    object-fit: cover;
  }

  .atlas-dock-place > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.18rem;
  }

  .atlas-dock-place small {
    overflow: hidden;
    color: #f6bd60;
    font-size: 0.57rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .atlas-dock-place strong {
    overflow: hidden;
    font-size: 0.82rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .atlas-dock-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    color: rgba(255, 255, 255, 0.62);
  }

  .atlas-dock-toggle > span {
    font-size: 1.05rem;
    line-height: 0.8;
  }

  .atlas-dock-toggle > small {
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
  }

  .atlas-detail-close,
  .atlas-favorite {
    display: none;
  }

  .atlas-detail-hero {
    min-height: 230px;
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
    width: 2.6rem;
    height: 2.6rem;
  }
}
</style>
