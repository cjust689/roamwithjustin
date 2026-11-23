<template>
  <form class="stay-editor" @submit.prevent="save">
    <label :for="'stay-name-' + _uid"
      >Name<input
        :id="'stay-name-' + _uid"
        :value="value.name"
        maxlength="160"
        required
        :disabled="pending"
        placeholder="Hotel, rental, campsite or another place to stay"
        @input="patch('name', $event.target.value)"
    /></label>
    <label :for="'stay-url-' + _uid"
      >Website or listing <small>Optional</small
      ><input
        :id="'stay-url-' + _uid"
        :value="value.url"
        type="url"
        maxlength="2048"
        :disabled="pending"
        placeholder="https://"
        @input="patch('url', $event.target.value)"
    /></label>
    <div class="stay-dates">
      <label :for="'stay-in-' + _uid"
        >Check-in<input
          :id="'stay-in-' + _uid"
          :value="value.checkIn"
          type="date"
          required
          :disabled="pending"
          :max="value.checkOut || undefined"
          @input="patch('checkIn', $event.target.value)"
      /></label>
      <label :for="'stay-out-' + _uid"
        >Check-out<input
          :id="'stay-out-' + _uid"
          :value="value.checkOut"
          type="date"
          required
          :disabled="pending"
          :min="value.checkIn || undefined"
          @input="patch('checkOut', $event.target.value)"
      /></label>
    </div>
    <p v-if="nights" role="status">
      {{ nights }} {{ nights === 1 ? "night" : "nights" }}
    </p>
    <section aria-label="Lodging location" class="stay-location">
      <strong>Location</strong>
      <template v-if="value.place"
        ><p>
          {{ value.place.name
          }}<small>{{
            [value.place.admin1Name, value.place.countryName]
              .filter(Boolean)
              .join(", ")
          }}</small>
        </p>
        <button
          type="button"
          :disabled="pending"
          @click="$emit('change-location')"
        >
          {{ pickerOpen ? "Keep selected location" : "Change location" }}
        </button>
      </template>
      <MyAtlasDestinationPicker
        v-if="pickerOpen || !value.place"
        :value="locationDraft"
        :pending="pending"
        :resolve-link="resolveLink"
        action-label="Use this location"
        context-label="lodging"
        @input="$emit('location-input', $event)"
        @choose="$emit('choose', $event)"
        @review="$emit('review', $event)"
      />
    </section>
    <p v-if="message" class="stay-guidance" role="status">{{ message }}</p>
    <button
      type="submit"
      class="stay-save"
      :disabled="pending || Boolean(message)"
      :aria-busy="String(pending)"
    >
      {{
        pending ? "Saving lodging…" : editing ? "Save lodging" : "Add lodging"
      }}
    </button>
    <button
      v-if="editing"
      type="button"
      class="stay-remove"
      :disabled="pending"
      @click="$emit('remove')"
    >
      Remove lodging
    </button>
  </form>
</template>
<script>
import MyAtlasDestinationPicker from "./MyAtlasDestinationPicker.vue"
import {
  tripStayNights,
  normalizeTripStayUrl,
} from "../../../../shared/my-atlas-trips.mjs"
export default {
  name: "MyAtlasStayEditor",
  components: { MyAtlasDestinationPicker },
  props: {
    value: { type: Object, required: true },
    locationDraft: { type: Object, required: true },
    pickerOpen: Boolean,
    pending: Boolean,
    editing: Boolean,
    resolveLink: { type: Function, default: null },
  },
  emits: [
    "input",
    "location-input",
    "change-location",
    "choose",
    "review",
    "save",
    "remove",
  ],
  computed: {
    nights() {
      return tripStayNights(this.value.checkIn, this.value.checkOut)
    },
    message() {
      if (!this.value.name.trim()) return "Enter a name for this stay."
      if (!this.value.checkIn || !this.value.checkOut)
        return "Choose check-in and check-out dates."
      if (!this.nights) return "Check-out must be after check-in."
      try {
        normalizeTripStayUrl(this.value.url)
      } catch {
        return "Use a full http:// or https:// website or listing URL."
      }
      if (!this.value.place || this.pickerOpen)
        return "Choose a location below, then select Use this location."
      return ""
    },
  },
  methods: {
    patch(key, value) {
      this.$emit("input", { ...this.value, [key]: value })
    },
    save() {
      if (!this.pending && !this.message) this.$emit("save")
    },
  },
}
</script>
<style scoped>
.stay-editor,
label {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.stay-editor {
  gap: 0.9rem;
}
.stay-editor input:not(.browser-default) {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 2.75rem;
  padding: 0.65rem;
  font: inherit;
  color: inherit;
  background: var(--surface-raised, #ffffff0d);
  border: 1px solid var(--border-soft, #ffffff40);
  border-radius: 0.6rem;
}
.stay-dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}
.stay-location {
  display: grid;
  gap: 0.6rem;
}
.stay-location p {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}
small,
.stay-guidance {
  opacity: 0.8;
}
button {
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.65rem;
  background: transparent;
  color: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.stay-save {
  background: var(--color-accent, #e6ba68);
  color: var(--color-on-accent, #121d24);
  font-weight: 600;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 3px;
}
.stay-remove {
  color: var(--danger, #f5aaa0);
}
@media (max-width: 360px) {
  .stay-dates {
    grid-template-columns: 1fr;
  }
}
</style>
