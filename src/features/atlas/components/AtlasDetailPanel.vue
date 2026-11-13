<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <aside class="atlas-detail" :aria-label="`${node.title} details`">
    <div class="atlas-detail-scroll">
      <div class="atlas-detail-hero">
        <img :src="node.image" :alt="node.title" />
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
            v-for="child in children"
            :key="child.id"
            type="button"
            @click="$emit('select', child.id)"
          >
            <img :src="child.image" alt="" loading="lazy" />
            <span
              ><small>{{ child.eyebrow }}</small
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

        <section v-if="node.media.length > 1" class="atlas-mini-gallery">
          <div class="atlas-section-heading">
            <span>Photography</span>
          </div>
          <div>
            <img
              v-for="image in node.media.slice(0, 3)"
              :key="image"
              :src="image"
              :alt="`${node.title} travel photograph`"
              loading="lazy"
            />
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

.atlas-detail-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.atlas-detail-hero {
  position: relative;
  min-height: 300px;
}

.atlas-detail-hero > img,
.atlas-detail-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.atlas-detail-hero > img {
  object-fit: cover;
}

.atlas-detail-shade {
  background: linear-gradient(
    180deg,
    rgba(4, 7, 9, 0.18) 20%,
    rgba(4, 7, 9, 0.96) 100%
  );
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
  scroll-snap-type: x mandatory;
}

.atlas-mini-gallery img {
  flex: 0 0 76%;
  width: 76%;
  height: 150px;
  border-radius: 12px;
  object-fit: cover;
  scroll-snap-align: start;
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

@media (max-width: 720px) {
  .atlas-detail {
    position: fixed;
    top: auto;
    right: 0.65rem;
    bottom: 0.65rem;
    left: 0.65rem;
    width: auto;
    max-height: 62vh;
    border-radius: 22px;
  }

  .atlas-detail-hero {
    min-height: 215px;
  }
}
</style>
