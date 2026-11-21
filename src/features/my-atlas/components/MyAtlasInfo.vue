<template>
  <span class="atlas-help">
    <button
      ref="trigger"
      type="button"
      class="atlas-help-button"
      :aria-label="label"
      :aria-expanded="String(open)"
      :aria-controls="'atlas-help-' + _uid"
      @click="toggle"
      @keydown.esc.stop.prevent="open = false"
    >
      <span aria-hidden="true">i</span>
    </button>
    <span
      v-if="open"
      :id="'atlas-help-' + _uid"
      ref="popup"
      class="atlas-help-copy"
      :style="popupStyle"
      role="note"
      popover="auto"
      @toggle="syncPopover"
      ><slot
    /></span>
  </span>
</template>
<script>
export default {
  name: "MyAtlasInfo",
  props: { label: { type: String, required: true } },
  data: () => ({ open: false, popupStyle: {} }),
  mounted() {
    document.addEventListener("click", this.outside)
    document.addEventListener("scroll", this.dismiss, true)
    window.addEventListener("resize", this.dismiss)
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    document.removeEventListener("click", this.outside)
    document.removeEventListener("scroll", this.dismiss, true)
    window.removeEventListener("resize", this.dismiss)
  },
  methods: {
    toggle() {
      const rect = this.$refs.trigger.getBoundingClientRect()
      const width = Math.min(260, window.innerWidth - 48)
      this.popupStyle = {
        left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
        top: `${Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 200))}px`,
        width: `${width}px`,
      }
      this.open = !this.open
      if (this.open)
        this.$nextTick(() => {
          const popup = this.$refs.popup
          if (!popup) return
          const dialog = document.querySelector("dialog[open]")
          if (dialog && !dialog.contains(this.$el)) {
            this.open = false
            return
          }
          popup.showPopover()
          this.popupStyle.top = `${Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - popup.getBoundingClientRect().height - 12))}px`
        })
    },
    syncPopover(event) {
      if (event.newState === "closed") this.open = false
    },
    dismiss() {
      this.open = false
    },
    outside(event) {
      if (!this.$el.contains(event.target)) this.open = false
    },
  },
}
</script>
<style scoped>
.atlas-help {
  display: inline-flex;
  position: relative;
  flex: 0 0 auto;
  align-self: center;
}
.atlas-help .atlas-help-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  cursor: pointer;
}
.atlas-help-button > span {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font:
    600 12px Georgia,
    serif;
}
.atlas-help-copy {
  position: fixed;
  inset: auto;
  margin: 0;
  box-sizing: border-box;
  z-index: 20;
  width: min(260px, calc(100vw - 76px));
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  background: var(--color-surface, #112124);
  color: var(--color-text, #f3f1e9);
  font-size: 0.78rem;
  line-height: 1.6;
  font-weight: normal;
}
</style>
