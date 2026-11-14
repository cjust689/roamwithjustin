<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <div v-if="open" class="atlas-saved-layer">
    <button
      class="atlas-saved-backdrop"
      type="button"
      aria-label="Close saved places"
      @click="$emit('close')"
    ></button>
    <aside class="atlas-saved" aria-label="Saved atlas places">
      <header>
        <div>
          <span>Personal atlas</span>
          <h2>Saved places</h2>
        </div>
        <button type="button" aria-label="Close" @click="$emit('close')">
          &times;
        </button>
      </header>

      <section>
        <h3>Favorites</h3>
        <p v-if="favorites.length === 0" class="atlas-saved-empty">
          Save a destination or experience and it will appear here on your next
          visit.
        </p>
        <button
          v-for="node in favorites"
          :key="`favorite-${node.id}`"
          class="atlas-saved-card"
          type="button"
          @click="$emit('select', node.id)"
        >
          <img :src="node.image" alt="" loading="lazy" />
          <span
            ><small>{{ node.eyebrow }}</small
            >{{ node.title }}</span
          >
        </button>
      </section>

      <section v-if="recent.length">
        <h3>Recently explored</h3>
        <button
          v-for="node in recent"
          :key="`recent-${node.id}`"
          class="atlas-recent"
          type="button"
          @click="$emit('select', node.id)"
        >
          <span>{{ node.title }}</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </section>
    </aside>
  </div>
</template>

<script>
export default {
  name: "AtlasSavedDrawer",
  props: {
    open: Boolean,
    favorites: {
      type: Array,
      default: () => [],
    },
    recent: {
      type: Array,
      default: () => [],
    },
  },
}
</script>

<style scoped>
.atlas-saved-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.atlas-saved-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(2, 5, 8, 0.68);
  backdrop-filter: blur(8px);
}

.atlas-saved {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 92vw);
  overflow-y: auto;
  padding: 1.5rem;
  background: #0c1115;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.38);
  color: #fff;
}

.atlas-saved header,
.atlas-saved header > div,
.atlas-saved-card,
.atlas-recent {
  display: flex;
}

.atlas-saved header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.atlas-saved header > div {
  flex-direction: column;
  gap: 0.3rem;
}

.atlas-saved header span,
.atlas-saved-card small {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.atlas-saved h2 {
  margin: 0;
  font-size: 1.7rem;
}

.atlas-saved header button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 1.6rem;
  cursor: pointer;
}

.atlas-saved section + section {
  margin-top: 2.2rem;
}

.atlas-saved h3 {
  margin: 0 0 0.9rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.atlas-saved-empty {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.6;
}

.atlas-saved-card {
  align-items: center;
  width: 100%;
  gap: 0.9rem;
  border: 0;
  border-radius: 14px;
  padding: 0.55rem;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.atlas-saved-card:hover,
.atlas-saved-card:focus-visible,
.atlas-recent:hover,
.atlas-recent:focus-visible {
  background: rgba(255, 255, 255, 0.07);
}

.atlas-saved-card img {
  width: 72px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
}

.atlas-saved-card > span {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-weight: 700;
}

.atlas-recent {
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.9rem 0.6rem;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

@media (max-width: 720px) {
  .atlas-saved {
    width: 100%;
    padding: max(1.25rem, env(safe-area-inset-top)) 1.25rem
      max(1.25rem, env(safe-area-inset-bottom));
  }

  .atlas-saved header span,
  .atlas-saved-card small {
    font-size: 0.8rem;
  }

  .atlas-saved h2 {
    font-size: 2rem;
  }

  .atlas-saved header button {
    width: 3rem;
    height: 3rem;
  }

  .atlas-saved h3 {
    font-size: 0.88rem;
  }

  .atlas-saved-empty,
  .atlas-saved-card > span,
  .atlas-recent {
    font-size: 1rem;
  }

  .atlas-saved-card {
    min-height: 5.25rem;
    padding: 0.65rem;
  }

  .atlas-saved-card img {
    width: 88px;
    height: 68px;
  }

  .atlas-recent {
    min-height: 3.25rem;
  }
}
</style>
