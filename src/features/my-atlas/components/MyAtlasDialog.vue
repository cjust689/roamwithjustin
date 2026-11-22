<template>
  <dialog
    ref="dialog"
    class="atlas-workspace-dialog"
    :class="{ 'is-closing': closing }"
    :inert="closing ? '' : null"
    :aria-labelledby="'atlas-dialog-' + _uid"
    @cancel.prevent="requestClose"
    @keydown.esc.stop.prevent="requestClose"
    @click="backdrop"
    @keydown="trapFocus"
  >
    <header class="atlas-dialog-header">
      <h2 :id="'atlas-dialog-' + _uid">{{ title }}</h2>
      <button
        type="button"
        :disabled="pending || closing"
        @click="requestClose"
      >
        Close
      </button>
    </header>
    <slot name="tabs" />
    <div v-if="statusVisible" class="atlas-dialog-status">
      <slot name="status" />
    </div>
    <div class="atlas-dialog-body"><slot /></div>
  </dialog>
</template>
<script>
export default {
  name: "MyAtlasDialog",
  props: {
    title: { type: String, required: true },
    pending: Boolean,
    statusVisible: Boolean,
  },
  emits: ["close"],
  data: () => ({ closing: false }),
  mounted() {
    document
      .querySelectorAll(".atlas-help-copy:popover-open")
      .forEach(popup => popup.hidePopover())
    this.returnFocus = document.activeElement
    this.previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    this.$refs.dialog.showModal()
    if (
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches &&
      this.$refs.dialog.animate
    )
      this.entryAnimation = this.$refs.dialog.animate(
        [
          { opacity: 0, transform: "translateY(12px) scale(0.985)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 190, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      )
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.disposed = true
    this.entryAnimation?.cancel()
    this.closeAnimation?.cancel()
    this.$refs.dialog.close()
    document.body.style.overflow = this.previousOverflow
    if (this.returnFocus?.isConnected)
      this.returnFocus.focus({ preventScroll: true })
  },
  methods: {
    trapFocus(event) {
      if (event.key !== "Tab") return
      const elements = [
        ...this.$refs.dialog.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
        ),
      ].filter(
        element => element.getClientRects().length && element.tabIndex >= 0
      )
      const first = elements[0],
        last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    },
    async requestClose() {
      if (this.pending || this.closing) return
      const dialog = this.$refs.dialog
      if (
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches &&
        dialog.animate
      ) {
        const current = window.getComputedStyle(dialog)
        const frame = { opacity: current.opacity, transform: current.transform }
        this.entryAnimation?.cancel()
        this.closing = true
        this.closeAnimation = dialog.animate(
          [frame, { opacity: 0, transform: "translateY(8px) scale(0.99)" }],
          { duration: 140, easing: "ease-in", fill: "forwards" }
        )
        await this.closeAnimation.finished.catch(() => {})
      }
      if (this.disposed) return
      if (this.pending) {
        this.closeAnimation?.cancel()
        this.closing = false
        return
      }
      this.$emit("close")
    },
    backdrop(event) {
      if (event.target !== this.$refs.dialog) return
      const rect = this.$refs.dialog.getBoundingClientRect()
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        this.requestClose()
    },
  },
}
</script>
<style scoped>
.atlas-workspace-dialog {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: min(640px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  padding: 0;
  margin: auto;
  overflow: hidden;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 16px;
  color: var(--color-text, #f3f1e9);
  background: var(--color-surface, #112124);
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.5);
}
.atlas-workspace-dialog[open] {
  display: flex;
  flex-direction: column;
}
.atlas-workspace-dialog::backdrop {
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
  animation: atlas-backdrop-enter 190ms ease both;
}
.atlas-workspace-dialog.is-closing::backdrop {
  animation: atlas-backdrop-leave 140ms ease forwards;
}
@keyframes atlas-backdrop-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes atlas-backdrop-leave {
  to {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atlas-workspace-dialog::backdrop,
  .atlas-workspace-dialog.is-closing::backdrop {
    animation: none;
  }
}
.atlas-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  flex: 0 0 auto;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.atlas-dialog-header h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.4;
  min-width: 0;
  overflow-wrap: anywhere;
}
.atlas-dialog-header button {
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 9px;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}
.atlas-dialog-header button:hover,
.atlas-dialog-header button:focus {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.12);
  border-color: var(--color-accent, #e6ba68);
}
.atlas-dialog-header button:focus-visible {
  outline: 2px solid var(--color-focus, #e6ba68);
  outline-offset: 3px;
}
.atlas-dialog-body {
  padding: 16px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.atlas-dialog-status {
  flex: 0 0 auto;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
</style>
