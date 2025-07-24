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
  height: 100%;
}
</style>
