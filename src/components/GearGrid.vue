<template>
  <main class="gear-grid container">
    <Banner v-if="hasAffiliateLinks" />
    <header>
      <p class="eyebrow">Creator tested</p>
      <h1 class="page-title">Gear I use</h1>
      <p class="subtitle">
        Products appear here only after their identity, firsthand use, image,
        and destination link have been reviewed.
      </p>
    </header>

    <div v-if="gear.length" class="gallery-grid">
      <article v-for="item in gear" :key="item.id" class="gallery-card">
        <img
          v-if="item.image"
          class="card-banner"
          :src="item.image"
          :alt="item.imageAlt"
          loading="lazy"
        />
        <div class="card-content">
          <p>{{ item.category }}</p>
          <h2>{{ item.name }}</h2>
          <p v-if="item.description">{{ item.description }}</p>
          <p v-if="item.notes">{{ item.notes }}</p>
          <div v-if="item.links.length" class="gear-actions">
            <a
              v-for="link in item.links"
              :key="link.id || link.url"
              :href="link.url"
              target="_blank"
              :rel="link.rel"
            >
              {{ link.label || "View product" }}
            </a>
          </div>
        </div>
      </article>
    </div>
    <section v-else class="gear-empty" aria-labelledby="gear-empty-title">
      <h2 id="gear-empty-title">Field notes are being prepared</h2>
      <p>
        This page will open as creator verified products, original photographs,
        and honest trip notes are added to the Gear catalog.
      </p>
    </section>
  </main>
</template>

<script>
import { getGearCatalog } from "@/content/selectors/gear.mjs"
import Banner from "@/components/Banner.vue"

export default {
  name: "GearGrid",
  components: { Banner },
  data() {
    return {
      gear: getGearCatalog(),
    }
  },
  computed: {
    hasAffiliateLinks() {
      return this.gear.some(item =>
        item.links.some(link => link.affiliate === true)
      )
    },
  },
}
</script>

<style scoped>
.container {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 4rem 0;
}

header {
  max-width: 44rem;
  margin-bottom: 2.5rem;
}

.eyebrow {
  margin: 0 0 0.45rem;
  color: #e6ba68;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  color: #f4f7f4;
  font-size: clamp(2.3rem, 6vw, 4.8rem);
  line-height: 0.95;
}

.subtitle,
.gear-empty p {
  color: #aeb9b7;
  line-height: 1.65;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1.25rem;
}

.gallery-card,
.gear-empty {
  overflow: hidden;
  border: 1px solid rgba(230, 186, 104, 0.25);
  border-radius: 1rem;
  background: #111b1c;
}

.card-banner {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.card-content,
.gear-empty {
  padding: 1.2rem;
}

.card-content > p:first-child {
  margin: 0 0 0.35rem;
  color: #e6ba68;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-content h2,
.gear-empty h2 {
  margin: 0;
  color: #f4f7f4;
}

.card-content p {
  color: #aeb9b7;
  line-height: 1.55;
}

.gear-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.gear-actions a {
  min-height: 2.75rem;
  padding: 0.72rem 0.9rem;
  border: 1px solid #e6ba68;
  border-radius: 999px;
  color: #f4d38f;
  text-decoration: none;
}

.gear-actions a:hover,
.gear-actions a:focus-visible {
  background: rgba(230, 186, 104, 0.12);
}

.gear-empty {
  max-width: 42rem;
}

.gear-empty p {
  margin-bottom: 0;
}
</style>
