<template>
  <div class="my-atlas-tutorial-backdrop" @click.self="close">
    <section
      ref="dialog"
      class="my-atlas-tutorial"
      :class="`is-${variant}`"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-atlas-tutorial-title"
      aria-describedby="my-atlas-tutorial-description"
      tabindex="-1"
      @keydown="handleKeydown"
    >
      <button
        type="button"
        class="my-atlas-tutorial-close"
        aria-label="Close tutorial"
        @click="close"
      >
        &times;
      </button>

      <div class="my-atlas-tutorial-visual" :class="`is-step-${stepIndex + 1}`">
        <span class="my-atlas-tutorial-orbit" aria-hidden="true"></span>
        <svg aria-hidden="true" viewBox="0 0 320 150" role="presentation">
          <path d="M34 112 C88 18 186 140 282 42" />
        </svg>
        <i class="pin pin-one" aria-hidden="true"></i>
        <i class="pin pin-two" aria-hidden="true"></i>
        <i class="pin pin-three" aria-hidden="true"></i>
        <strong aria-hidden="true">{{
          String(stepIndex + 1).padStart(2, "0")
        }}</strong>
      </div>

      <div class="my-atlas-tutorial-copy">
        <div class="my-atlas-tutorial-meta">
          <small>Step {{ stepIndex + 1 }} of {{ steps.length }}</small>
        </div>
        <h2 id="my-atlas-tutorial-title" ref="title" tabindex="-1">
          {{ currentStep.title }}
        </h2>
        <p id="my-atlas-tutorial-description">{{ currentStep.body }}</p>
        <ul v-if="currentStep.points.length">
          <li v-for="point in currentStep.points" :key="point">
            {{ point }}
          </li>
        </ul>
      </div>

      <div
        class="my-atlas-tutorial-progress"
        role="progressbar"
        :aria-valuenow="stepIndex + 1"
        aria-valuemin="1"
        :aria-valuemax="steps.length"
        :aria-label="`Tutorial step ${stepIndex + 1} of ${steps.length}`"
      >
        <span
          v-for="(_, index) in steps"
          :key="index"
          :class="{ 'is-active': index <= stepIndex }"
        ></span>
      </div>

      <footer>
        <button
          v-if="stepIndex > 0"
          type="button"
          class="secondary"
          @click="previous"
        >
          Back
        </button>
        <span v-else></span>
        <button type="button" class="primary" @click="advance">
          {{ finalStep ? currentStep.action : "Next" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script>
const tutorials = Object.freeze({
  preview: Object.freeze([
    Object.freeze({
      title: "See your travels take shape.",
      body: "My Atlas turns the places you have visited into a map you can explore, replay, and share when you choose.",
      points: Object.freeze(["Private by default", "Visit years are optional"]),
      action: "",
    }),
    Object.freeze({
      title: "Add places one at a time.",
      body: "Search for a country, city, national park, or iconic spot, choose the right match, and add it to your Atlas. Add one or more visit years, or leave the date open.",
      points: Object.freeze([
        "Countries, cities, and curated spots use verified catalog IDs",
        "Repeat visits can include more than one year",
      ]),
      action: "",
    }),
    Object.freeze({
      title: "Watch your map grow.",
      body: "Filter by year, move through destinations, and play a timeline that reveals how your Atlas grew. Paths are visual connections, not a recorded route.",
      points: Object.freeze([
        "Pins show place names and visit years",
        "Statistics update with the current view",
      ]),
      action: "",
    }),
    Object.freeze({
      title: "Your account begins private.",
      body: "Sign in with Google, use your invitation, and create your private Atlas. Nothing becomes public unless you choose to share it.",
      points: Object.freeze([
        "Export a Story image from your browser",
        "Share your personal link only when you choose",
      ]),
      action: "Create your Atlas",
    }),
  ]),
  account: Object.freeze([
    Object.freeze({
      title: "Your private Atlas is ready.",
      body: "Begin with any place that matters to you. Your account stays private while you build and refine your map.",
      points: Object.freeze([
        "Start with a country, city, or spot",
        "Add places in any order",
      ]),
      action: "",
    }),
    Object.freeze({
      title: "Search, choose, and mark it.",
      body: "Use the place search, choose the correct result, then add an optional visit year. You can edit years later or record repeat visits.",
      points: Object.freeze([
        "Leave the year open when you are unsure",
        "Add more than one year for repeat visits",
      ]),
      action: "",
    }),
    Object.freeze({
      title: "Explore every angle.",
      body: "Open Map controls to filter by year, show or hide paths, and play your timeline. Select a pin or use Previous and Next to move through destinations.",
      points: Object.freeze([
        "Timeline playback follows visit years",
        "Map paths do not claim an exact travel route",
      ]),
      action: "",
    }),
    Object.freeze({
      title: "Share only when it feels ready.",
      body: "Export a Story image whenever you like. If you want others to explore your Atlas, turn on sharing and copy your personal link.",
      points: Object.freeze([
        "Sharing can be turned off again",
        "Your quick start guide stays available from the page",
      ]),
      action: "Add your first place",
    }),
  ]),
})

export default {
  name: "MyAtlasTutorial",
  props: {
    variant: {
      type: String,
      default: "preview",
      validator: value =>
        Object.prototype.hasOwnProperty.call(tutorials, value),
    },
  },
  emits: ["close", "complete"],
  data() {
    return {
      stepIndex: 0,
      previousFocus: null,
      previousBodyOverflow: "",
    }
  },
  computed: {
    steps() {
      return tutorials[this.variant]
    },
    currentStep() {
      return this.steps[this.stepIndex]
    },
    finalStep() {
      return this.stepIndex === this.steps.length - 1
    },
  },
  mounted() {
    this.previousFocus = document.activeElement
    this.previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    this.$nextTick(() => this.$refs.dialog?.focus())
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    document.body.style.overflow = this.previousBodyOverflow
    this.previousFocus?.focus?.()
  },
  methods: {
    advance() {
      if (this.finalStep) {
        this.$emit("complete")
        return
      }
      this.stepIndex += 1
      this.focusTitle()
    },
    previous() {
      if (this.stepIndex === 0) return
      this.stepIndex -= 1
      this.focusTitle()
    },
    close() {
      this.$emit("close")
    },
    focusTitle() {
      this.$nextTick(() => this.$refs.title?.focus())
    },
    handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        this.close()
        return
      }
      if (event.key !== "Tab") return
      const focusable = [
        ...this.$refs.dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        [first, this.$refs.dialog].includes(document.activeElement)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
  },
}
</script>

<style scoped>
.my-atlas-tutorial-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  padding: 1rem;
  place-items: center;
  background: rgba(var(--color-page-rgb, 3, 10, 12), 0.78);
  backdrop-filter: blur(12px);
}

.my-atlas-tutorial {
  box-sizing: border-box;
  position: relative;
  display: grid;
  width: min(33rem, 100%);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.36);
  border-radius: 1.4rem;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface, #0b1719);
  box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.58);
  font-family: "Poppins", sans-serif;
  outline: none;
}

.my-atlas-tutorial-close {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  z-index: 2;
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
  border-radius: 50%;
  color: var(--color-text, #edf7f2);
  background: rgba(var(--color-page-rgb, 8, 20, 22), 0.72);
  font: inherit;
  font-size: 1.25rem;
  cursor: pointer;
}

.my-atlas-tutorial-visual {
  position: relative;
  min-height: 10.5rem;
  overflow: hidden;
  border-radius: 1.35rem 1.35rem 0 0;
  background:
    radial-gradient(
      circle at 22% 28%,
      rgba(var(--color-success-rgb, 88, 209, 201), 0.24),
      transparent 28%
    ),
    radial-gradient(
      circle at 82% 68%,
      rgba(var(--color-accent-rgb, 230, 186, 104), 0.25),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      var(--color-surface-raised, #17363a),
      var(--color-surface, #0b191c) 68%
    );
}

.my-atlas-tutorial-visual::before,
.my-atlas-tutorial-visual::after {
  position: absolute;
  inset: 0;
  content: "";
  background-image:
    linear-gradient(
      rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055) 1px,
      transparent 1px
    );
  background-size: 2.5rem 2.5rem;
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 16%,
    #000 84%,
    transparent
  );
}

.my-atlas-tutorial-visual::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--color-accent-rgb, 230, 186, 104), 0.12),
    transparent
  );
  transform: translateX(-100%);
  animation: atlas-tutorial-scan 5s ease-in-out infinite;
}

.my-atlas-tutorial-visual svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.my-atlas-tutorial-visual path {
  fill: none;
  stroke: rgba(var(--color-accent-rgb, 230, 186, 104), 0.7);
  stroke-width: 2;
  stroke-dasharray: 7 8;
}

.my-atlas-tutorial-visual > strong {
  position: absolute;
  right: 1.2rem;
  bottom: 0.35rem;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.09));
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 5.5rem;
  line-height: 1;
}

.my-atlas-tutorial-orbit {
  position: absolute;
  top: 1.25rem;
  left: 1.4rem;
  width: 4.3rem;
  height: 4.3rem;
  border: 1px solid rgba(var(--color-success-rgb, 88, 209, 201), 0.5);
  border-radius: 50%;
  box-shadow: 0 0 2.5rem rgba(88, 209, 201, 0.18);
}

.my-atlas-tutorial-orbit::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--color-success, #58d1c9);
  box-shadow: 0 0 1rem #58d1c9;
  content: "";
  transform: translate(-50%, -50%);
}

.my-atlas-tutorial-visual .pin {
  position: absolute;
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid var(--color-accent, #f7e7c4);
  border-radius: 50% 50% 50% 0;
  background: var(--color-accent, #e6ba68);
  box-shadow: 0 0 1.1rem rgba(230, 186, 104, 0.72);
  opacity: 0.24;
  transform: rotate(-45deg) scale(0.72);
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.my-atlas-tutorial-visual .pin-one {
  top: 6.25rem;
  left: 10%;
}

.my-atlas-tutorial-visual .pin-two {
  top: 3.2rem;
  left: 51%;
}

.my-atlas-tutorial-visual .pin-three {
  top: 1.7rem;
  right: 8%;
}

.my-atlas-tutorial-visual.is-step-1 .pin-one,
.my-atlas-tutorial-visual.is-step-2 .pin-one,
.my-atlas-tutorial-visual.is-step-2 .pin-two,
.my-atlas-tutorial-visual.is-step-3 .pin,
.my-atlas-tutorial-visual.is-step-4 .pin {
  opacity: 1;
  transform: rotate(-45deg) scale(1);
}

.my-atlas-tutorial-copy {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem 1.35rem 0.8rem;
}

.my-atlas-tutorial-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-tutorial-meta small {
  color: var(--color-text-subtle, #82968f);
  letter-spacing: 0.05em;
}

.my-atlas-tutorial h2 {
  margin: 0;
  color: var(--color-text, #f3faf6);
  font-family: "Poppins", system-ui, sans-serif;
  font-size: clamp(1.8rem, 7vw, 2.65rem);
  line-height: 1;
  text-wrap: balance;
  outline: none;
}

.my-atlas-tutorial-copy > p {
  margin: 0;
  color: var(--color-text-muted, #afc0ba);
  font-size: 0.8rem;
  line-height: 1.6;
}

.my-atlas-tutorial-copy ul {
  display: grid;
  gap: 0.42rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.my-atlas-tutorial-copy li {
  position: relative;
  padding-left: 1.1rem;
  color: var(--color-text, #d8e5df);
  font-size: 0.7rem;
}

.my-atlas-tutorial-copy li::before {
  position: absolute;
  top: 0.4rem;
  left: 0;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: var(--color-success, #58d1c9);
  box-shadow: 0 0 0.7rem rgba(88, 209, 201, 0.7);
  content: "";
}

.my-atlas-tutorial-progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.35rem;
  padding: 0.6rem 1.35rem 0;
}

.my-atlas-tutorial-progress span {
  height: 0.22rem;
  border-radius: 999px;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  transition: background 180ms ease;
}

.my-atlas-tutorial-progress span.is-active {
  background: var(--color-accent, #e6ba68);
}

.my-atlas-tutorial footer {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.35rem 1.25rem;
}

.my-atlas-tutorial footer button {
  min-height: 2.7rem;
  padding: 0.65rem 1rem;
  border-radius: 0.75rem;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-tutorial footer .secondary {
  justify-self: start;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.16);
  color: var(--color-text, #d9e5df);
  background: transparent;
}

.my-atlas-tutorial footer .primary {
  border: 0;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
}

@keyframes atlas-tutorial-scan {
  0%,
  18% {
    transform: translateX(-100%);
  }
  62%,
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 720px) {
  .my-atlas-tutorial-backdrop {
    align-items: end;
    padding: 0;
  }

  .my-atlas-tutorial {
    width: 100%;
    max-height: 94dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 1.4rem 1.4rem 0 0;
  }

  .my-atlas-tutorial footer {
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
  }

  .my-atlas-tutorial-visual {
    min-height: 8rem;
  }

  .my-atlas-tutorial-visual .pin-one {
    top: 4.6rem;
  }

  .my-atlas-tutorial-visual .pin-two {
    top: 2.6rem;
  }

  .my-atlas-tutorial-visual .pin-three {
    top: 1.4rem;
  }

  .my-atlas-tutorial-copy {
    padding-top: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .my-atlas-tutorial-visual::after {
    animation: none;
  }
}
</style>
