<template>
  <section
    v-if="offers.length"
    id="travel-planning"
    class="travel-offers"
    aria-labelledby="travel-offers-title"
  >
    <div class="travel-offers__copy">
      <span>Travel planning</span>
      <h2 id="travel-offers-title">Planning your own Utah journey?</h2>
      <p>
        Explore Expedia options for stays or flights when you are ready to
        compare the next step of your trip.
      </p>
      <p class="travel-offers__disclosure">
        I may earn a commission from qualifying bookings made through these
        Expedia tools, at no additional cost to you.
      </p>
    </div>

    <button
      v-if="!activated"
      class="travel-offers__activate"
      type="button"
      @click="activateOffers"
    >
      Show Expedia travel options
    </button>

    <div v-else class="travel-offers__banners" aria-live="polite">
      <p v-if="loading" class="travel-offers__status">
        Loading Expedia travel options…
      </p>
      <p v-if="loadError" class="travel-offers__error">
        Expedia travel options could not be loaded. You can retry without
        leaving this page.
      </p>
      <button
        v-if="loadError"
        class="travel-offers__activate"
        type="button"
        @click="activateOffers"
      >
        Retry Expedia options
      </button>

      <article
        v-for="offer in offers"
        :key="offer.id"
        class="travel-offers__banner"
        @click.capture="trackOfferClick($event, offer)"
      >
        <span>{{
          offer.banner.product === "stays" ? "Stays" : "Flights"
        }}</span>
        <div class="travel-offers__banner-frame">
          <div
            class="eg-affiliate-banners"
            :data-program="offer.banner.program"
            :data-network="offer.banner.network"
            :data-layout="offer.banner.layout"
            :data-image="offer.banner.image"
            :data-message="offer.banner.message"
            :data-camref="offer.banner.campaignReference"
            :data-pubref="offer.banner.publisherReference"
            :data-link="offer.banner.product"
          ></div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { loadExpediaBannerScript } from "@/services/expediaBanners.mjs"
import { trackAnalyticsEvent } from "@/utils/analytics.mjs"

export default {
  name: "TravelPlanningOffers",
  props: {
    journeyId: {
      type: String,
      required: true,
    },
    offers: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      activated: false,
      loading: false,
      loadError: false,
      linkObserver: null,
    }
  },
  // This project uses Vue 2; its current lint preset incorrectly targets Vue 3.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.linkObserver?.disconnect()
  },
  methods: {
    activateOffers() {
      if (this.loading) return

      this.activated = true
      this.loading = true
      this.loadError = false
      this.$nextTick(async () => {
        this.observeRenderedLinks()
        try {
          await loadExpediaBannerScript()
          this.secureRenderedLinks()
        } catch (error) {
          this.loadError = true
        } finally {
          this.loading = false
        }
      })
    },
    observeRenderedLinks() {
      if (this.linkObserver || typeof MutationObserver === "undefined") return

      this.linkObserver = new MutationObserver(this.secureRenderedLinks)
      this.linkObserver.observe(this.$el, { childList: true, subtree: true })
    },
    secureRenderedLinks() {
      this.$el
        .querySelectorAll(".eg-affiliate-banners a[href]")
        .forEach(anchor => {
          const relationships = new Set(
            String(anchor.getAttribute("rel") || "")
              .split(/\s+/)
              .filter(Boolean)
          )
          relationships.add("sponsored")
          relationships.add("noopener")
          anchor.setAttribute("rel", Array.from(relationships).join(" "))
        })
    },
    trackOfferClick(event, offer) {
      if (!event.target?.closest?.("a[href]")) return

      trackAnalyticsEvent("partner_click", {
        link_type: offer.linkType,
        partner_id: offer.partnerId,
        placement: offer.id,
        public_journey_id: this.journeyId,
      })
    },
  },
}
</script>

<style scoped>
.travel-offers {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: start;
  margin-top: clamp(4rem, 10vw, 9rem);
  border: 1px solid rgba(246, 189, 96, 0.28);
  border-radius: 24px;
  padding: clamp(1.4rem, 4vw, 2.6rem);
  background:
    radial-gradient(
      circle at 88% 12%,
      rgba(246, 189, 96, 0.12),
      transparent 36%
    ),
    #11191d;
}

.travel-offers__copy > span,
.travel-offers__banner > span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.travel-offers h2 {
  margin: 0.55rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2rem, 4vw, 3.3rem);
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 1;
}

.travel-offers p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.84rem !important;
  line-height: 1.65;
}

.travel-offers__disclosure {
  color: rgba(255, 255, 255, 0.54) !important;
  font-size: 0.72rem !important;
}

.travel-offers__activate {
  align-self: center;
  justify-self: start;
  min-height: 46px;
  border: 1px solid #f6bd60;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: #f6bd60;
  color: #11191d;
  cursor: pointer;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 800;
}

.travel-offers__activate:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}

.travel-offers__banners,
.travel-offers__banner {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.travel-offers__banners {
  gap: 1.4rem;
}

.travel-offers__banner-frame {
  width: 100%;
  min-height: 90px;
  overflow-x: auto;
  border-radius: 14px;
  scrollbar-width: thin;
}

.travel-offers__status,
.travel-offers__error {
  margin: 0;
}

.travel-offers__error {
  color: #ffb7b7 !important;
}

@media (max-width: 760px) {
  .travel-offers {
    grid-template-columns: 1fr;
  }

  .travel-offers__activate {
    width: 100%;
  }
}
</style>
