<template>
  <aside
    v-if="configured"
    v-show="!unfilled"
    class="ad-placement"
    :data-placement="placement"
    aria-label="Advertisement"
  >
    <span class="ad-placement-label">Advertisement</span>
    <ins
      ref="unit"
      class="adsbygoogle ad-placement-unit"
      :data-ad-client="clientId"
      :data-ad-slot="slotId"
      data-ad-format="auto"
      data-full-width-responsive="false"
    ></ins>
  </aside>
</template>

<script>
import { adSenseConfig } from "@/config/adsense.mjs"
import { initializeAdSenseUnit } from "@/services/adsense.mjs"

export default {
  name: "AdSlot",
  props: {
    slotId: {
      type: String,
      required: true,
    },
    placement: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      observer: null,
      unfilled: false,
    }
  },
  computed: {
    clientId() {
      return adSenseConfig.clientId
    },
    configured() {
      return adSenseConfig.ready && /^\d+$/.test(this.slotId)
    },
  },
  mounted() {
    if (!this.configured || !this.$refs.unit) return

    this.observeFillStatus()
    this.$nextTick(() => initializeAdSenseUnit(this.$refs.unit))
  },
  // Vue 2 lifecycle hook. The lint preset also checks Vue 3 conventions.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.observer?.disconnect()
  },
  methods: {
    observeFillStatus() {
      if (typeof MutationObserver === "undefined") return

      this.observer = new MutationObserver(() => {
        this.unfilled = this.$refs.unit?.dataset.adStatus === "unfilled"
      })
      this.observer.observe(this.$refs.unit, {
        attributes: true,
        attributeFilter: ["data-ad-status"],
      })
    },
  },
}
</script>

<style scoped>
.ad-placement {
  width: min(960px, calc(100% - 2rem));
  margin: clamp(4.5rem, 10vw, 8rem) auto 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.25rem 0;
  text-align: center;
}

.ad-placement-label {
  display: block;
  margin-bottom: 0.65rem;
  color: rgba(255, 255, 255, 0.38);
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ad-placement-unit {
  display: block;
  width: 100%;
  min-height: 90px;
}

.ad-placement-unit[data-ad-status="unfilled"] {
  display: none !important;
}

@media (max-width: 620px) {
  .ad-placement {
    width: min(100% - 1rem, 960px);
    margin-top: 4rem;
  }
}
</style>
