<template>
  <div
    class="hero-carousel"
    role="region"
    :aria-label="label"
    tabindex="0"
    @mouseenter="stopAutoSlide"
    @mouseleave="startAutoSlide"
    @focusin="stopAutoSlide"
    @focusout="startAutoSlide"
    @keydown.left.prevent="previousSlide"
    @keydown.right.prevent="nextSlide"
  >
    <div class="carousel-viewport">
      <div
        class="carousel-track"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <figure
          v-for="(image, index) in allImages"
          :key="image"
          class="carousel-item"
          :aria-hidden="String(index !== currentSlide)"
        >
          <img
            :src="image"
            :alt="index === currentSlide ? `${label}, image ${index + 1}` : ''"
            :loading="index === 0 ? 'eager' : 'lazy'"
          />
        </figure>
      </div>
    </div>

    <div v-if="allImages.length > 1" class="carousel-controls">
      <button
        type="button"
        aria-label="Previous hero image"
        @click="previousSlide"
      >
        &larr;
      </button>
      <span>{{ currentSlide + 1 }} / {{ allImages.length }}</span>
      <button type="button" aria-label="Next hero image" @click="nextSlide">
        &rarr;
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "HeroCarousel",
  props: {
    images: {
      type: Array,
      default: () => [],
    },
    cover: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "Trip photography",
    },
  },
  data() {
    return {
      currentSlide: 0,
      interval: null,
    }
  },
  computed: {
    allImages() {
      return [this.cover, ...this.images]
        .filter(Boolean)
        .filter((image, index, images) => images.indexOf(image) === index)
    },
  },
  mounted() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    this.startAutoSlide()
  },
  // This application is Vue 2; timers must be cleared by beforeDestroy.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    )
    this.stopAutoSlide()
  },
  methods: {
    startAutoSlide() {
      this.stopAutoSlide()
      if (
        this.allImages.length < 2 ||
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return
      }
      this.interval = window.setInterval(this.nextSlide, 6000)
    },
    stopAutoSlide() {
      if (this.interval != null) {
        window.clearInterval(this.interval)
        this.interval = null
      }
    },
    nextSlide() {
      if (!this.allImages.length) return
      this.currentSlide = (this.currentSlide + 1) % this.allImages.length
    },
    previousSlide() {
      if (!this.allImages.length) return
      this.currentSlide =
        (this.currentSlide - 1 + this.allImages.length) % this.allImages.length
    },
    handleVisibilityChange() {
      if (document.hidden) this.stopAutoSlide()
      else this.startAutoSlide()
    },
  },
}
</script>

<style scoped>
.hero-carousel,
.carousel-viewport,
.carousel-track,
.carousel-item {
  width: 100%;
  height: 100%;
}

.hero-carousel {
  position: relative;
  overflow: hidden;
  background: #11191d;
}

.hero-carousel:focus-visible {
  outline: 3px solid #f6bd60;
  outline-offset: -3px;
}

.carousel-viewport {
  overflow: hidden;
}

.carousel-track {
  display: flex;
  transition: transform 700ms cubic-bezier(0.2, 0.75, 0.2, 1);
}

.carousel-item {
  min-width: 100%;
  margin: 0;
  overflow: hidden;
}

.carousel-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-controls {
  position: absolute;
  z-index: 3;
  right: clamp(1rem, 4vw, 3rem);
  bottom: clamp(1rem, 4vw, 2.5rem);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 0.28rem;
  background: rgba(7, 11, 14, 0.72);
  color: #fff;
  backdrop-filter: blur(12px);
}

.carousel-controls button {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.carousel-controls button:hover,
.carousel-controls button:focus-visible {
  background: #f6bd60;
  color: #111;
}

.carousel-controls span {
  min-width: 3.3rem;
  color: rgba(255, 255, 255, 0.68);
  font-family: "Poppins", sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
}

@media (max-width: 760px) {
  /* Trip details and calls-to-action occupy the lower portion of the mobile
     hero. Keep image navigation in the quiet upper corner instead. */
  .carousel-controls {
    top: 1rem;
    right: 1rem;
    bottom: auto;
  }

  .carousel-controls button {
    width: 2.35rem;
    height: 2.35rem;
  }

  .carousel-controls span {
    min-width: 2.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track {
    transition: none;
  }
}
</style>
