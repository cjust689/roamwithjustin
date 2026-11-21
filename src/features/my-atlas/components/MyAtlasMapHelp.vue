<template>
  <div class="atlas-map-help">
    <span>Map gestures</span
    ><MyAtlasInfo label="How to navigate the My Atlas map"
      ><span class="touch-help"
        >Use two fingers to move the map. To zoom in, place two fingers close
        together and spread them apart. To zoom out, pinch them together. Tap a
        marker to select a destination.</span
      ><span class="pointer-help"
        >Drag to move the map. Hold Ctrl or ⌘ while scrolling to zoom, or use
        the + and − buttons. Use the compass to face north again. Click a marker
        to select a destination.</span
      >
      Moving the map does not change saved places.</MyAtlasInfo
    >
  </div>
</template>
<script>
import MyAtlasInfo from "./MyAtlasInfo.vue"
export default { name: "MyAtlasMapHelp", components: { MyAtlasInfo } }
</script>
<style scoped>
.atlas-map-help {
  position: absolute;
  z-index: 4;
  right: 12px;
  top: 120px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 12px;
  color: var(--color-text, #edf7f2);
  background: var(--color-page, #0a1416);
  font-size: 0.72rem;
}
.touch-help {
  display: none;
}
@media (pointer: coarse), (max-width: 720px) {
  .touch-help {
    display: inline;
  }
  .pointer-help {
    display: none;
  }
}
</style>
