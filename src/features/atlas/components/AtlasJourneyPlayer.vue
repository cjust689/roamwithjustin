<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <section
    v-if="journey"
    class="atlas-guided"
    :class="`is-${status}`"
    aria-label="Guided journey controls"
  >
    <header>
      <div>
        <span>Guided journey</span>
        <strong>{{ journey.title }}</strong>
      </div>
      <button
        v-if="isActive"
        class="atlas-guided-exit"
        type="button"
        aria-label="Exit guided journey"
        @click="$emit('exit')"
      >
        &times;
      </button>
    </header>

    <div v-if="status === 'idle'" class="atlas-guided-intro">
      <p>
        Follow {{ journey.stopCount }} photographic stops in visit order. The
        tour pauses at every story.
      </p>
      <button class="primary" type="button" @click="$emit('start')">
        <span aria-hidden="true">&#9654;</span>
        Start journey
      </button>
    </div>

    <template v-else>
      <div class="atlas-guided-stop">
        <span>Stop {{ displayPosition }} of {{ journey.stopCount }}</span>
        <strong>{{ currentStop ? currentStop.title : journey.title }}</strong>
      </div>

      <div
        class="atlas-guided-progress"
        role="progressbar"
        aria-label="Guided journey progress"
        aria-valuemin="0"
        :aria-valuemax="journey.stopCount"
        :aria-valuenow="displayPosition"
      >
        <span :style="{ width: `${progressPercentage}%` }"></span>
      </div>

      <p class="atlas-guided-status" role="status">{{ statusText }}</p>

      <div class="atlas-guided-controls">
        <button
          type="button"
          :disabled="currentIndex <= 0 || status === 'traveling'"
          @click="$emit('previous')"
        >
          <span aria-hidden="true">&larr;</span> Previous
        </button>

        <button
          v-if="status === 'traveling'"
          class="primary"
          type="button"
          @click="$emit('pause')"
        >
          <span aria-hidden="true">&#10074;&#10074;</span> Pause
        </button>
        <button
          v-else-if="status === 'paused-travel'"
          class="primary"
          type="button"
          @click="$emit('resume')"
        >
          <span aria-hidden="true">&#9654;</span> Resume
        </button>
        <button
          v-else-if="status === 'at-stop'"
          class="primary"
          type="button"
          @click="
            $emit(currentIndex === journey.stopCount - 1 ? 'finish' : 'next')
          "
        >
          {{ currentIndex === journey.stopCount - 1 ? "Finish" : "Next stop" }}
          <span aria-hidden="true">&rarr;</span>
        </button>
        <button
          v-else-if="status === 'complete'"
          class="primary"
          type="button"
          @click="$emit('replay')"
        >
          Replay journey
        </button>
      </div>
    </template>
  </section>
</template>

<script>
export default {
  name: "AtlasJourneyPlayer",
  props: {
    journey: {
      type: Object,
      default: null,
    },
    status: {
      type: String,
      default: "idle",
    },
    currentIndex: {
      type: Number,
      default: -1,
    },
    transitionLabel: {
      type: String,
      default: "",
    },
  },
  computed: {
    isActive() {
      return this.status !== "idle"
    },
    currentStop() {
      return this.journey?.stops?.[this.currentIndex] || null
    },
    displayPosition() {
      return this.currentIndex >= 0 ? this.currentIndex + 1 : 0
    },
    progressPercentage() {
      if (!this.journey?.stopCount) return 0
      return (this.displayPosition / this.journey.stopCount) * 100
    },
    statusText() {
      const title = this.currentStop?.title || "the next stop"
      if (this.status === "traveling") {
        return this.transitionLabel || `Traveling to ${title}`
      }
      if (this.status === "paused-travel") {
        return `Journey paused on the way to ${title}`
      }
      if (this.status === "complete") {
        return "Journey complete. Replay it or exit to explore freely."
      }
      return `Paused at ${title}. Explore the open story, then continue.`
    },
  },
}
</script>

<style scoped>
.atlas-guided {
  position: absolute;
  z-index: 18;
  bottom: 1.25rem;
  left: 5.25rem;
  width: min(460px, calc(100vw - 7rem));
  border: 1px solid rgba(246, 189, 96, 0.38);
  border-radius: 18px;
  padding: 0.9rem;
  background: rgba(7, 11, 14, 0.92);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.42);
  color: #fff;
  backdrop-filter: blur(16px);
}

.atlas-guided header,
.atlas-guided header > div,
.atlas-guided-stop {
  display: flex;
}

.atlas-guided header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.atlas-guided header > div,
.atlas-guided-stop {
  min-width: 0;
  flex-direction: column;
}

.atlas-guided header span,
.atlas-guided-stop span {
  color: #f6bd60;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.atlas-guided header strong,
.atlas-guided-stop strong {
  overflow: hidden;
  margin-top: 0.16rem;
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.atlas-guided-exit {
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 1.35rem;
  cursor: pointer;
}

.atlas-guided-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.75rem;
}

.atlas-guided-intro p,
.atlas-guided-status {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.82rem;
  line-height: 1.45;
}

.atlas-guided-intro p {
  max-width: 265px;
}

.atlas-guided button {
  font-family: inherit;
}

.atlas-guided-intro .primary,
.atlas-guided-controls button {
  min-height: 2.75rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.62rem 0.85rem;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.atlas-guided-intro .primary,
.atlas-guided-controls .primary {
  border-color: #f6bd60;
  background: #f6bd60;
  color: #111;
}

.atlas-guided-controls button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.atlas-guided-stop {
  margin-top: 0.72rem;
}

.atlas-guided-progress {
  height: 5px;
  overflow: hidden;
  margin-top: 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.atlas-guided-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f6bd60;
  transition: width 300ms ease;
}

.atlas-guided-status {
  margin-top: 0.55rem;
}

.atlas-guided-controls {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.atlas-guided button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .atlas-guided {
    position: fixed;
    z-index: 19;
    top: 5.65rem;
    right: 0.7rem;
    bottom: auto;
    left: 0.7rem;
    width: auto;
    padding: 0.85rem;
  }

  .atlas-guided header span,
  .atlas-guided-stop span {
    font-size: 0.78rem;
  }

  .atlas-guided header strong,
  .atlas-guided-stop strong {
    font-size: 1.05rem;
  }

  .atlas-guided-intro {
    align-items: stretch;
  }

  .atlas-guided-intro p,
  .atlas-guided-status {
    font-size: 0.9rem;
  }

  .atlas-guided-intro .primary,
  .atlas-guided-controls button {
    min-height: 3rem;
    font-size: 0.88rem;
  }

  .atlas-guided-exit {
    width: 3rem;
    height: 3rem;
  }
}

@media (max-width: 430px) {
  .atlas-guided-intro {
    flex-direction: column;
  }

  .atlas-guided-intro p {
    max-width: none;
  }

  .atlas-guided-intro .primary {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-guided-progress span {
    transition: none;
  }
}
</style>
