<template>
  <div class="my-atlas-action-feedback-layer">
    <p class="feedback-announcer" role="status" aria-atomic="true">
      {{ feedback ? feedback.message : "" }}
    </p>
    <aside
      v-if="feedback"
      class="my-atlas-action-feedback"
      :class="`is-${feedback.tone}`"
      aria-label="Action feedback"
      @mouseenter="pauseForPointer"
      @mouseleave="resumeFromPointer"
      @focusin="pauseForFocus"
      @focusout="resumeFromFocus"
    >
      <div aria-hidden="true">
        <strong>{{ heading }}</strong>
        <p>{{ feedback.message }}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        @click="$emit('dismiss', feedback.id)"
      >
        &times;
      </button>
    </aside>
  </div>
</template>

<script>
export default {
  name: "MyAtlasActionFeedback",
  props: {
    feedback: { type: Object, default: null },
  },
  emits: ["dismiss"],
  data() {
    return { timer: null, hovered: false, focused: false }
  },
  computed: {
    heading() {
      return (
        {
          busy: "Working on it",
          draft: "Trip draft updated",
          success: "Done",
          warning: "Saved, refresh needed",
          error: "Action needs attention",
        }[this.feedback?.tone] || "My Atlas"
      )
    },
  },
  watch: {
    feedback: {
      immediate: true,
      handler() {
        if (!this.feedback) {
          this.hovered = false
          this.focused = false
        }
        this.startTimer()
      },
    },
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle -- This app runs Vue 2.
  beforeDestroy() {
    this.clearTimer()
  },
  methods: {
    pauseForPointer() {
      this.hovered = true
      this.clearTimer()
    },
    resumeFromPointer() {
      this.hovered = false
      this.startTimer()
    },
    pauseForFocus() {
      this.focused = true
      this.clearTimer()
    },
    resumeFromFocus() {
      this.focused = false
      this.startTimer()
    },
    clearTimer() {
      window.clearTimeout(this.timer)
    },
    startTimer() {
      this.clearTimer()
      if (
        !this.feedback ||
        this.hovered ||
        this.focused ||
        ["busy", "warning", "error"].includes(this.feedback.tone)
      )
        return
      const id = this.feedback.id
      this.timer = window.setTimeout(() => this.$emit("dismiss", id), 8000)
    },
  },
}
</script>

<style scoped>
.feedback-announcer {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.my-atlas-action-feedback {
  position: fixed;
  z-index: 1500;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: min(27rem, calc(100vw - 2rem));
  box-sizing: border-box;
  padding: 0.85rem;
  border: 1px solid var(--color-success, #9bd3b0);
  border-radius: 1rem;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface, #111f22);
  box-shadow: 0 0.75rem 2.5rem rgba(0, 0, 0, 0.4);
  font-family: "Poppins", system-ui, sans-serif;
}
.my-atlas-action-feedback.is-draft,
.my-atlas-action-feedback.is-busy,
.my-atlas-action-feedback.is-warning {
  border-color: var(--color-accent, #e6ba68);
}
.my-atlas-action-feedback.is-error {
  border-color: var(--color-error, #f3c1bb);
}
.my-atlas-action-feedback > div {
  flex: 1;
  min-width: 0;
}
.my-atlas-action-feedback strong {
  font-size: 0.78rem;
}
.my-atlas-action-feedback p {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.my-atlas-action-feedback button {
  display: grid;
  flex: 0 0 auto;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
}
.my-atlas-action-feedback button:focus-visible {
  outline: 2px solid var(--color-focus, #f4d38f);
  outline-offset: 3px;
}
</style>
