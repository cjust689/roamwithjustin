<template>
  <div
    class="theme-selector"
    :class="{ 'theme-align-start': align === 'start' }"
    @keydown.esc.stop.prevent="close(true)"
  >
    <button
      ref="trigger"
      class="theme-trigger"
      type="button"
      :aria-label="`Theme: ${label}. Change theme`"
      :title="`Theme: ${label}`"
      :aria-expanded="String(open)"
      @click="open = !open"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path d="M12 4a8 8 0 0 1 0 16V4Z" fill="currentColor" />
      </svg>
    </button>
    <div
      v-if="open"
      class="theme-options"
      role="group"
      aria-label="Visual theme"
    >
      <span class="theme-heading">Appearance</span>
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        :aria-pressed="String(theme.current === option.id)"
        @click="choose(option.id)"
      >
        <span
          class="theme-swatch"
          :class="`theme-swatch-${option.id}`"
          aria-hidden="true"
        ></span>
        <span>{{ option.label }}</span>
        <span v-if="theme.current === option.id" aria-hidden="true"
          >&#10003;</span
        >
      </button>
    </div>
  </div>
</template>

<script>
import { selectTheme, themeState } from "../theme"

export default {
  name: "ThemeSelector",
  props: {
    align: { type: String, default: "end" },
  },
  data() {
    return {
      open: false,
      theme: themeState,
      options: [
        { id: "current", label: "Classic" },
        { id: "explorer", label: "Explorer" },
      ],
    }
  },
  computed: {
    label() {
      return this.theme.current === "explorer" ? "Explorer" : "Classic"
    },
  },
  watch: {
    $route() {
      this.close()
    },
  },
  mounted() {
    document.addEventListener("click", this.outside)
    document.addEventListener("focusin", this.outside)
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle -- This app runs Vue 2.
  beforeDestroy() {
    document.removeEventListener("click", this.outside)
    document.removeEventListener("focusin", this.outside)
  },
  methods: {
    choose(theme) {
      selectTheme(theme)
      this.close(true)
    },
    close(focus = false) {
      this.open = false
      if (focus) this.$refs.trigger.focus()
    },
    outside(event) {
      if (!this.$el.contains(event.target)) this.close()
    },
  },
}
</script>

<style scoped>
.theme-selector {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  letter-spacing: normal;
  text-transform: none;
  line-height: normal;
  font-family: "Poppins", system-ui, sans-serif;
}
.theme-selector .theme-trigger {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border: 1px solid var(--color-control-border, #7c8588);
  border-radius: 50%;
  background: var(--color-surface, #11191d);
  color: var(--color-accent, #f6bd60);
  cursor: pointer;
}
.theme-selector .theme-options {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 12rem;
  padding: 0.5rem;
  border: 1px solid var(--color-control-border, #7c8588);
  border-radius: 0.9rem;
  background: var(--color-surface, #11191d);
  color: var(--color-text, #fff);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}
.theme-heading {
  display: block;
  padding: 0.45rem 0.5rem;
  color: var(--color-text-muted, #bbc5c8);
  font-size: 0.72rem;
  font-weight: 600;
}

.theme-align-start .theme-options {
  right: auto;
  left: 0;
}
.theme-selector .theme-options button {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 2.75rem;
  margin: 0;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  background: transparent;
  color: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.theme-options button[aria-pressed="true"],
.theme-options button:hover {
  border-color: var(--color-accent, #f6bd60);
}
.theme-selector button:focus-visible {
  outline: 2px solid var(--color-focus, #f6bd60);
  outline-offset: 3px;
}
.theme-swatch {
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.theme-swatch-current {
  background: linear-gradient(135deg, #0b1114 50%, #f6bd60 50%);
}
.theme-swatch-explorer {
  background: linear-gradient(135deg, #07152b 50%, #ff8a00 50%);
}
</style>
