<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-button" @click="$emit('close')">&times;</button>
      <h2>
        <template v-if="location.link">
          <a :href="location.link" target="_blank" rel="noopener">
            {{ location.name }} ↗
          </a>
        </template>
        <template v-else>
          {{ location.name }}
        </template>
      </h2>
      <p class="description">{{ location.description }}</p>
      <p><strong>Type:</strong> {{ location.type }}</p>
      <p>
        <strong>Drone Allowed:</strong>
        <span
          :class="{ yes: location.droneAllowed, no: !location.droneAllowed }"
        >
          {{ location.droneAllowed ? "Yes" : "No" }}
        </span>
      </p>

      <div v-if="displayMedia.length" class="modal-gallery">
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
          <figcaption v-if="media.caption">
            {{ media.caption }}
          </figcaption>
        </figure>
      </div>

      <div v-if="location.notes && location.notes.length">
        <h4>Notes</h4>
        <ul>
          <li v-for="note in location.notes" :key="note">{{ note }}</li>
        </ul>
      </div>

      <div v-if="location.video">
        <h4>Related Video</h4>
        <a
          :href="location.video"
          class="ig-watch-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          📺 Watch this Reel on Instagram
        </a>
      </div>
    </div>
  </div>
</template>

<script>
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
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  max-width: 1200px;
  width: 90%;
  position: relative;
  overflow-y: auto;
  max-height: 90vh;
}
.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.modal-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
}
.modal-gallery figure {
  flex: 1 1 min(500px, 100%);
  margin: 0;
}
.modal-gallery img,
.modal-gallery video {
  display: block;
  width: 500px;
  max-width: 100%;
  height: 500px;
  background: #111;
  object-fit: cover;
  border-radius: 4px;
}
.modal-gallery video {
  object-fit: contain;
}
.modal-gallery figcaption {
  margin-top: 0.5rem;
  color: #555;
  font-size: 0.9rem;
}
.yes {
  color: green;
  font-weight: bold;
}
.no {
  color: red;
  font-weight: bold;
}
.ig-watch-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  background-color: #0077cc;
  color: white;
  text-decoration: none;
  font-weight: bold;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.ig-watch-button:hover {
  background-color: #005fa3;
}
</style>
