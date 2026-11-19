<template>
  <main class="gear-grid container">
    <Banner v-if="hasAffiliateLinks" />
    <header>
      <h1 class="page-title">Gear I use</h1>
      <p class="subtitle">
        Camera and travel gear from my trips, with original photographs and
        firsthand notes.
      </p>
    </header>

    <div v-if="gear.length" class="gallery-grid">
      <article v-for="item in gear" :key="item.id" class="gallery-card">
        <img
          v-if="item.image"
          class="card-banner"
          :src="item.image"
          :srcset="item.imageSrcset || null"
          sizes="(min-width: 1100px) 340px, (min-width: 640px) 45vw, 100vw"
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
              :title="link.disclosure || null"
              @click="trackGearLink(item, link)"
            >
              {{ link.label || "View product" }}
            </a>
          </div>
          <p
            v-for="disclosure in item.affiliateDisclosures"
            :key="disclosure"
            class="gear-link-disclosure"
          >
            {{ disclosure }}
          </p>
        </div>
      </article>
    </div>
    <section v-else class="gear-empty" aria-labelledby="gear-empty-title">
      <h2 id="gear-empty-title">No gear notes yet</h2>
      <p>
        Products will appear here with original photographs and firsthand trip
        notes.
      </p>
    </section>
  </main>
</template>

<script>
import { getGearCatalog } from "@/content/selectors/gear.mjs"
import commercialLinks from "@/content/commercial-links.js"
import Banner from "@/components/Banner.vue"
import { trackAnalyticsEvent } from "@/utils/analytics.mjs"

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
  methods: {
    trackGearLink(item, link) {
      const parameters = commercialLinks.buildPartnerClickParameters({
        partnerId: link.partnerId,
        linkType: link.linkType,
        placement: "gear_catalog",
        gearId: item.id,
      })
      if (parameters) trackAnalyticsEvent("partner_click", parameters)
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

.card-content .gear-link-disclosure {
  margin: 0.75rem 0 0;
  color: #c9d0ce;
  font-size: 0.76rem;
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
