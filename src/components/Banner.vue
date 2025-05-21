<template>
  <div class="banner-wrapper yellow darken-2 center-align">
    <router-link class="banner-link black-text pulsate" to="/roam/Affiliates">
      Affiliate Links
    </router-link>
    <div class="affiliate-disclaimer">
      💡 Some links are affiliate links — if you buy through them, it supports
      my work at no extra cost to you.
    </div>
  </div>
</template>

<script>
import M from "../js/materialize"
export default {
  name: "Banner",
  mounted() {
    M.AutoInit()
  },
}
</script>

<style scoped>
.banner-wrapper {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  line-height: 1.4;
  margin-top: 64px; /* adjust to match header height */
  z-index: 2;
  position: relative;
}

.banner-link {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
}

.affiliate-disclaimer {
  font-size: 0.9rem;
  color: #333;
}
</style>
