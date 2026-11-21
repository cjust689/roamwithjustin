<template>
  <button
    class="atlas-switch"
    type="button"
    role="switch"
    :aria-checked="String(value)"
    :disabled="disabled || pending"
    :aria-busy="String(pending)"
    @click="toggle"
  >
    <span class="atlas-switch-label"><slot /></span>
    <span class="atlas-switch-track" aria-hidden="true"><span /></span>
  </button>
</template>

<script>
export default {
  name: "MyAtlasSwitch",
  props: { value: Boolean, disabled: Boolean, pending: Boolean },
  emits: ["input", "change"],
  methods: {
    toggle() {
      if (this.disabled || this.pending) return
      this.$emit("input", !this.value)
      this.$emit("change", !this.value)
    },
  },
}
</script>

<style scoped>
.atlas-switch.atlas-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  width: 100%;
  padding: 6px 0;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.atlas-switch-label {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atlas-switch-track {
  display: flex;
  align-items: center;
  flex: 0 0 40px;
  height: 24px;
  padding: 2px;
  box-sizing: border-box;
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 20px;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
}
.atlas-switch-track > span {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: var(--color-control-border, #8fa29c);
  transition: transform 140ms ease;
}
.atlas-switch[aria-busy="true"] .atlas-switch-track > span {
  visibility: hidden;
}
.atlas-switch[aria-checked="true"] .atlas-switch-track {
  border-color: var(--color-accent, #e6ba68);
  background: var(--color-accent, #e6ba68);
}
.atlas-switch[aria-checked="true"] .atlas-switch-track > span {
  transform: translateX(16px);
  background: #152024;
}
.atlas-switch:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .atlas-switch-track > span {
    transition: none;
  }
}
</style>
