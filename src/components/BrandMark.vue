<template>
  <img
    class="brand-mark"
    :src="source"
    width="36"
    height="36"
    alt=""
    aria-hidden="true"
  />
</template>

<script>
import { themeState } from "../theme"

export default {
  name: "BrandMark",
  data() {
    return { theme: themeState }
  },
  computed: {
    source() {
      const variant = this.theme.current === "explorer" ? "orange" : "amber"
      return `/img/icons/SVG/${variant}.svg`
    },
  },
}
</script>

<style scoped>
.brand-mark {
  display: block;
  flex: 0 0 auto;
  width: 2.35rem;
  height: 2.35rem;
  object-fit: contain;
}
</style>
