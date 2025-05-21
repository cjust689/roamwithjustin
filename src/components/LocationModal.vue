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

      <div
        v-if="location.gallery && location.gallery.length"
        class="modal-gallery"
      >
        <img
          v-for="(img, i) in location.gallery"
          :key="i"
          :src="img"
          :alt="location.name + ' photo ' + (i + 1)"
        />
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
    location: Object,
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
.modal-gallery img {
  width: 500px;
  height: 500px;
  object-fit: cover;
  border-radius: 4px;
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
