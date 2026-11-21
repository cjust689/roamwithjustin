<template>
  <section
    class="my-atlas-map-navigator"
    :class="{ 'is-menu-hidden': menuHidden }"
    aria-label="Navigate your Atlas on the map"
  >
    <button
      v-if="!open"
      type="button"
      class="navigator-open"
      @click="$emit('open')"
    >
      Explore my trips <span aria-hidden="true">↑</span>
    </button>
    <template v-else>
      <header>
        <label
          ><span class="sr-only">Choose a trip or all destinations</span
          ><select
            :value="activeId"
            @change="$emit('choose', $event.target.value)"
          >
            <option value="" disabled>Choose a trip</option>
            <option v-for="trip in trips" :key="trip.id" :value="trip.id">
              {{ trip.title
              }}{{
                trip.kind === "atlas"
                  ? ""
                  : trip.lifecycle === "past"
                    ? " · Past"
                    : " · Planned"
              }}
            </option>
          </select></label
        ><button
          type="button"
          :aria-expanded="String(!collapsed)"
          :aria-label="
            collapsed ? 'Expand trip navigator' : 'Collapse trip navigator'
          "
          @click="$emit('collapse')"
        >
          {{ collapsed ? "↑" : "↓" }}</button
        ><button
          type="button"
          aria-label="Close trip navigator"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>
      <div v-if="!collapsed" class="navigator-content">
        <template v-if="stop">
          <p class="navigator-step">
            Stop {{ index + 1 }} of {{ active.stops.length }}
          </p>
          <strong>{{ stop.place.name }}</strong>
          <small>{{
            [stop.place.admin1Name, stop.place.countryName]
              .filter(Boolean)
              .join(", ")
          }}</small>
          <progress
            :value="index + 1"
            :max="active.stops.length"
            :aria-label="`Stop ${index + 1} of ${active.stops.length}`"
          />
          <p role="status" aria-live="polite">
            {{
              stop.place.coordinates
                ? `${stop.place.name} on your map.`
                : "Coordinates are unavailable for this destination."
            }}
          </p>
          <div class="navigator-actions">
            <button
              type="button"
              :disabled="index === 0"
              @click="$emit('step', -1)"
            >
              ← Previous</button
            ><button
              type="button"
              :disabled="index >= active.stops.length - 1"
              @click="$emit('step', 1)"
            >
              Next stop →
            </button>
          </div>
        </template>
        <p v-else>Choose a trip to explore its destinations on the map.</p>
      </div>
    </template>
  </section>
</template>
<script>
export default {
  name: "MyAtlasMapNavigator",
  props: {
    trips: { type: Array, default: () => [] },
    activeId: { type: String, default: "" },
    index: { type: Number, default: 0 },
    open: Boolean,
    collapsed: Boolean,
    menuHidden: Boolean,
  },
  emits: ["open", "close", "collapse", "choose", "step"],
  computed: {
    active() {
      return this.trips.find(trip => trip.id === this.activeId) || null
    },
    stop() {
      return this.active?.stops[this.index] || null
    },
  },
}
</script>
<style scoped>
.my-atlas-map-navigator {
  position: absolute;
  z-index: 6;
  bottom: 28px;
  right: 16px;
  width: min(340px, calc(100% - 32px));
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.4);
  border-radius: 20px;
  color: var(--color-text, #edf7f2);
  background: var(--color-page, #0a1416);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  font: inherit;
}
.my-atlas-map-navigator.is-menu-hidden {
  bottom: 88px;
}
header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 10px 12px;
}
label {
  flex: 1;
  min-width: 0;
}
select {
  display: block;
  width: 100%;
  height: 44px;
  min-width: 0;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-size: 0.85rem;
  background: var(--color-page, #0a1416);
  color: inherit;
}
button {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
  border-radius: 24px;
  font: inherit;
  font-size: 0.75rem;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
button:not(:disabled):hover {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.12);
}
button:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-focus, #e6ba68);
  outline-offset: -2px;
}
.navigator-open {
  display: flex;
  width: 100%;
  justify-content: space-between;
  border: 0;
  border-radius: 0;
  padding: 12px 16px;
}
.navigator-content {
  display: grid;
  gap: 8px;
  padding: 8px 14px 14px;
  max-height: min(40dvh, 300px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.5;
}
small {
  font-size: 0.7rem;
  color: var(--color-text-muted, #adbcba);
}
.navigator-step {
  color: var(--color-accent-soft, #e6ba68);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.65rem;
}
strong {
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
progress {
  width: 100%;
  height: 5px;
  accent-color: var(--color-accent, #e6ba68);
}
.navigator-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.navigator-actions button:last-child {
  color: var(--color-accent-contrast, #102023);
  background: var(--color-accent, #e6ba68);
  border-color: var(--color-accent, #e6ba68);
  font-weight: 700;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
