<template>
  <div class="journey-destinations">
    <p
      v-if="reorderable && showReorderHelp && stops.length > 1"
      class="journey-reorder-help"
    >
      Drag a handle to change the order, or use its arrow keys. Open a
      destination for more actions.
    </p>
    <ol ref="list" aria-label="Journey destinations">
      <li
        v-for="(stop, index) in orderedStops"
        :key="stop.stopId"
        :data-stop-id="stop.stopId"
        :class="{ 'is-dragging': dragId === stop.stopId }"
      >
        <button
          v-if="reorderable && stops.length > 1"
          class="journey-drag-handle"
          type="button"
          :disabled="pending || reorderDisabled"
          :aria-label="`Reorder ${stop.place.name}. Use up and down arrow keys.`"
          @pointerdown="startDrag($event, stop.stopId)"
          @keydown.up.prevent="move(index, -1)"
          @keydown.down.prevent="move(index, 1)"
          @keydown.esc.prevent="cancelDrag"
        >
          <svg viewBox="0 0 20 24" aria-hidden="true">
            <circle
              v-for="point in dots"
              :key="point.join(',')"
              :cx="point[0]"
              :cy="point[1]"
              r="1.5"
            />
          </svg>
        </button>
        <button
          class="journey-destination"
          type="button"
          :disabled="pending"
          :aria-label="`Open ${stop.place.name}, destination ${index + 1}`"
          @click="$emit('open', stop)"
        >
          <span class="journey-stop-number" aria-hidden="true">{{
            index + 1
          }}</span>
          <span class="journey-stop-copy">
            <strong>{{ stop.place.name }}</strong>
            <small v-if="context(stop)">{{ context(stop) }}</small>
            <span v-if="memory(stop)" class="journey-memory">{{
              memory(stop)
            }}</span>
            <small v-if="stop.experiences.length"
              >{{ stop.experiences.length }}
              {{
                stop.experiences.length === 1 ? "experience" : "experiences"
              }}</small
            >
          </span>
          <svg
            class="journey-stop-chevron"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </li>
    </ol>
    <span class="journey-reorder-status" role="status" aria-live="polite">{{
      announcement
    }}</span>
  </div>
</template>

<script>
export default {
  name: "MyAtlasTripDestinations",
  props: {
    stops: { type: Array, required: true },
    pending: Boolean,
    reorderable: Boolean,
    reorderDisabled: Boolean,
    showReorderHelp: { type: Boolean, default: true },
    lifecycle: { type: String, default: "past" },
  },
  emits: ["open", "reorder"],
  data: () => ({
    dragId: "",
    dragOrder: [],
    pointerId: null,
    scrollFrame: null,
    announcement: "",
    dots: [
      [7, 6],
      [13, 6],
      [7, 12],
      [13, 12],
      [7, 18],
      [13, 18],
    ],
  }),
  computed: {
    orderedStops() {
      return this.dragId
        ? this.dragOrder
            .map(id => this.stops.find(stop => stop.stopId === id))
            .filter(Boolean)
        : this.stops
    },
  },
  watch: {
    stops() {
      this.cancelDrag()
    },
    pending(value) {
      if (value) this.cancelDrag()
      else this.announcement = ""
    },
    reorderDisabled(value) {
      if (value) this.cancelDrag()
    },
  },
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.cancelDrag()
  },
  methods: {
    context(stop) {
      return [
        ...new Set(
          [stop.place.admin1Name, stop.place.countryName].filter(Boolean)
        ),
      ].join(", ")
    },
    memory(stop) {
      if (this.lifecycle === "planned") return stop.planNote || ""
      return stop.memories.find(item => item.kind === "note")?.text || ""
    },
    startDrag(event, id) {
      if (
        this.pending ||
        this.reorderDisabled ||
        !this.reorderable ||
        event.button !== 0
      )
        return
      this.dragId = id
      this.pointerId = event.pointerId
      this.dragOrder = this.stops.map(stop => stop.stopId)
      event.currentTarget.setPointerCapture(event.pointerId)
      // Moving a keyed row can release pointer capture. Track the gesture at
      // document level so release still commits when it ends outside a handle.
      document.addEventListener("pointermove", this.drag)
      document.addEventListener("pointerup", this.finishDrag)
      document.addEventListener("pointercancel", this.cancelDrag)
      window.addEventListener("blur", this.cancelDrag)
      this._dragScroll = this.$el.closest(".atlas-dialog-body, .my-atlas-panel")
      this._dragY = event.clientY
      if (this._dragScroll)
        this.scrollFrame = window.requestAnimationFrame(this.scrollDuringDrag)
    },
    drag(event) {
      if (!this.dragId || event.pointerId !== this.pointerId) return
      this._dragY = event.clientY
      this.previewOrder(event.clientY)
    },
    previewOrder(clientY) {
      const rows = [...this.$refs.list.children]
      const others = rows.filter(row => row.dataset.stopId !== this.dragId)
      const before = others.find(
        row =>
          clientY <
          row.getBoundingClientRect().top +
            row.getBoundingClientRect().height / 2
      )
      const ids = this.dragOrder.filter(id => id !== this.dragId)
      ids.splice(
        before ? ids.indexOf(before.dataset.stopId) : ids.length,
        0,
        this.dragId
      )
      this.dragOrder = ids
    },
    scrollDuringDrag() {
      this.scrollFrame = null
      if (!this.dragId || !this._dragScroll) return
      const rect = this._dragScroll.getBoundingClientRect()
      const edge = Math.min(48, rect.height / 4)
      const delta =
        this._dragY < rect.top + edge
          ? -12
          : this._dragY > rect.bottom - edge
            ? 12
            : 0
      const before = this._dragScroll.scrollTop
      this._dragScroll.scrollTop += delta
      if (this._dragScroll.scrollTop !== before) this.previewOrder(this._dragY)
      this.scrollFrame = window.requestAnimationFrame(this.scrollDuringDrag)
    },
    finishDrag(event) {
      if (!this.dragId || event.pointerId !== this.pointerId) return
      const ids = [...this.dragOrder]
      this.cancelDrag()
      this.commitOrder(ids)
    },
    cancelDrag() {
      if (this.scrollFrame !== null)
        window.cancelAnimationFrame(this.scrollFrame)
      this.scrollFrame = null
      this._dragScroll = null
      document.removeEventListener("pointermove", this.drag)
      document.removeEventListener("pointerup", this.finishDrag)
      document.removeEventListener("pointercancel", this.cancelDrag)
      window.removeEventListener("blur", this.cancelDrag)
      this.dragId = ""
      this.dragOrder = []
      this.pointerId = null
    },
    move(index, direction) {
      if (
        this.pending ||
        this.reorderDisabled ||
        this.dragId ||
        !this.reorderable ||
        index + direction < 0 ||
        index + direction >= this.stops.length
      )
        return
      const ids = this.stops.map(stop => stop.stopId)
      ;[ids[index], ids[index + direction]] = [
        ids[index + direction],
        ids[index],
      ]
      this.commitOrder(ids)
    },
    commitOrder(ids) {
      if (
        this.pending ||
        this.reorderDisabled ||
        ids.every((id, index) => id === this.stops[index].stopId)
      )
        return
      this.announcement = "Saving destination order."
      this.$emit("reorder", ids)
    },
  },
}
</script>

<style scoped>
.journey-destinations {
  min-width: 0;
}
.journey-destinations button {
  font: inherit;
  cursor: pointer;
}
.journey-destinations button:disabled {
  opacity: 0.5;
  cursor: default;
}
.journey-destinations button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 2px;
}
.journey-destinations button:not(:disabled):hover {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.1);
}
.journey-destinations ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
.journey-destinations li {
  display: flex;
  align-items: center;
  min-width: 0;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.journey-destinations li:last-child {
  border-bottom: 0;
}
.journey-destinations .journey-destination {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 72px;
  padding: 12px 4px;
  border: 0;
  border-radius: 8px;
  color: var(--color-text, #f3f1e9);
  background: transparent;
  text-align: left;
}
.journey-stop-number {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.1);
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.78rem;
}
.journey-stop-copy {
  display: grid;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
.journey-stop-copy strong {
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
.journey-stop-copy small {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.68rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.journey-memory {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.journey-stop-chevron {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  fill: none;
  stroke: var(--color-accent-soft, #e6ba68);
  stroke-width: 1.8;
}
.journey-destinations .journey-drag-handle {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  touch-action: none;
  cursor: grab;
  color: var(--color-text-muted, #adbcba);
}
.journey-drag-handle svg {
  width: 20px;
  height: 24px;
  fill: currentColor;
}
.journey-destinations .is-dragging {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.12);
  outline: 1px solid var(--color-accent, #e6ba68);
  border-radius: 8px;
}
.journey-reorder-help {
  margin: 0 0 8px;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text-muted, #adbcba);
}
.journey-reorder-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
