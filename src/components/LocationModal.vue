<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <div
    v-if="open && location"
    class="location-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`location-title-${location.id}`"
    @click.self="$emit('close')"
  >
    <article class="location-dialog">
      <button
        class="close-button"
        type="button"
        aria-label="Close location story"
        @click="$emit('close')"
      >
        &times;
      </button>

      <header class="location-header">
        <span>{{ location.type || "Trip stop" }}</span>
        <h2 :id="`location-title-${location.id}`">{{ location.name }}</h2>
        <p>{{ location.description }}</p>
        <div class="location-actions">
          <router-link v-if="location.atlasHref" :to="location.atlasHref">
            {{
              location.atlasExact
                ? "View this stop in Atlas"
                : "Open this trip in Atlas"
            }}
          </router-link>
          <a
            v-if="location.link"
            :href="location.link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official website &nearr;
          </a>
        </div>
        <div class="location-meta">
          <span>
            Drone guidance:
            <strong>{{
              location.droneAllowed ? "Allowed" : "Check locally"
            }}</strong>
          </span>
          <span v-if="location.evidenceStatus">
            {{ location.evidenceStatus }} visit record
          </span>
        </div>
      </header>

      <div v-if="displayMedia.length" class="location-gallery">
        <figure v-for="(media, index) in displayMedia" :key="media.key">
          <video
            v-if="media.kind === 'video'"
            controls
            playsinline
            preload="metadata"
            :poster="media.poster"
            :aria-label="media.alt"
          >
            <source :src="media.src" :type="media.mimeType" />
            Your browser does not support HTML video.
          </video>
          <img
            v-else
            :src="media.src"
            :alt="media.alt || location.name + ' photo ' + (index + 1)"
            loading="lazy"
          />
          <figcaption v-if="media.caption">{{ media.caption }}</figcaption>
        </figure>
      </div>

      <section
        v-if="location.notes && location.notes.length"
        class="field-notes"
      >
        <span>From the field</span>
        <h3>Notes from this stop</h3>
        <ul>
          <li v-for="note in location.notes" :key="note">{{ note }}</li>
        </ul>
      </section>

      <a
        v-if="location.video"
        :href="location.video"
        class="reel-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Watch the related reel on Instagram &nearr;
      </a>
    </article>
  </div>
</template>

<script>
/* eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. */
export default {
  name: "LocationModal",
  props: {
    open: Boolean,
    location: {
      type: Object,
      default: null,
    },
  },
  computed: {
    displayMedia() {
      if (!this.location) return []

      if (this.location.media?.length) {
        return this.location.media.map((media, index) => ({
          ...media,
          key: media.id || media.src || String(index),
        }))
      }

      return (this.location.gallery || []).map((src, index) => ({
        key: src || String(index),
        kind: "image",
        src,
        alt: this.location.name + " photo " + (index + 1),
        caption: null,
      }))
    },
  },
  watch: {
    open(isOpen) {
      document.body.style.overflow = isOpen ? "hidden" : ""
    },
  },
  mounted() {
    document.addEventListener("keydown", this.handleKeydown)
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    document.removeEventListener("keydown", this.handleKeydown)
    document.body.style.overflow = ""
  },
  methods: {
    handleKeydown(event) {
      if (this.open && event.key === "Escape") this.$emit("close")
    },
  },
}
</script>

<style scoped>
.location-overlay {
  position: fixed;
  z-index: 9999;
  inset: 0;
  overflow-y: auto;
  padding: clamp(0.6rem, 3vw, 2rem);
  background: rgba(3, 6, 8, 0.88);
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
  backdrop-filter: blur(16px);
}

.location-dialog {
  position: relative;
  width: min(1180px, 100%);
  min-height: calc(100vh - 4rem);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 28px;
  padding: clamp(1.25rem, 5vw, 4rem);
  background:
    radial-gradient(circle at 90% 0, rgba(246, 189, 96, 0.08), transparent 25%),
    #0b1114;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
}

.close-button {
  position: sticky;
  z-index: 4;
  top: 0;
  float: right;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 50%;
  background: rgba(7, 11, 14, 0.8);
  color: #fff;
  font-size: 1.45rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.location-header {
  max-width: 850px;
  padding-right: 3rem;
}

.location-header > span,
.field-notes > span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.location-header h2 {
  margin: 0.5rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 8vw, 7rem);
  font-weight: 500;
  letter-spacing: -0.06em;
  line-height: 0.92;
}

.location-header > p {
  max-width: 720px;
  margin: 1.1rem 0 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.94rem !important;
  font-weight: 400;
  line-height: 1.7;
}

.location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.4rem;
}

.location-actions a,
.reel-link {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 0.75rem 0.9rem;
  color: #fff;
  font-size: 0.74rem;
  font-weight: 800;
  text-decoration: none;
}

.location-actions a:first-child {
  border-color: #f6bd60;
  background: #f6bd60;
  color: #111719;
}

.location-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.location-meta > span {
  border-radius: 999px;
  padding: 0.45rem 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.68rem;
}

.location-meta strong {
  color: rgba(255, 255, 255, 0.82);
}

.location-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: clamp(2rem, 6vw, 4rem);
}

.location-gallery figure {
  overflow: hidden;
  margin: 0;
  border-radius: 20px;
  background: #05080a;
}

.location-gallery img,
.location-gallery video {
  display: block;
  width: 100%;
  height: min(520px, 54vw);
  background: #05080a;
  object-fit: cover;
}

.location-gallery video {
  object-fit: contain;
}

.location-gallery figcaption {
  padding: 0.7rem 0.9rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.72rem;
  line-height: 1.5;
}

.field-notes {
  margin-top: 3rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 2rem;
}

.field-notes h3 {
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  font-weight: 500;
}

.field-notes ul {
  max-width: 760px;
  padding-left: 1.25rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
  line-height: 1.7;
}

.reel-link {
  display: inline-block;
  margin-top: 1.5rem;
  color: #f8d79f;
}

@media (max-width: 680px) {
  .location-overlay {
    padding: 0;
  }

  .location-dialog {
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    padding-top: 1rem;
  }

  .location-gallery {
    grid-template-columns: 1fr;
  }

  .location-gallery img,
  .location-gallery video {
    height: 360px;
  }
}
</style>
