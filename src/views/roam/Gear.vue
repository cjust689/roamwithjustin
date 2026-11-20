<template>
  <div class="gear valign-wrapper">
    <div class="row container">
      <GearGrid />
    </div>
  </div>
</template>

<script>
import GearGrid from "@/components/GearGrid.vue"

export default {
  components: { GearGrid },
}
</script>

<style scoped>
.gear {
  display: flex;
  width: 100%;
  min-height: calc(100dvh - 72px);
  padding: clamp(1.5rem, 5vw, 4rem) 0;
  background:
    radial-gradient(
      circle at 85% 5%,
      rgba(var(--color-accent-rgb, 246, 189, 96), 0.08),
      transparent 28%
    ),
    var(--color-page, #0b1114);
  color: var(--color-text, #fff);
}

.gear > .row {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
}
</style>
