<template>
  <section class="visit-experiences" aria-label="Private experiences">
    <h3>What did you do here?</h3>
    <p>
      Optional. These entries stay private, including when you share your Atlas.
    </p>
    <ul v-if="experiences.length">
      <li v-for="entry in experiences" :key="entry.id">
        <strong>{{ entry.title }}</strong>
        <span v-if="entry.operatorName">{{ entry.operatorName }}</span>
        <a
          v-if="entry.operatorWebsite"
          :href="entry.operatorWebsite"
          target="_blank"
          rel="noopener noreferrer"
          referrerpolicy="no-referrer"
          >{{ websiteHost(entry.operatorWebsite) }}</a
        >
        <div>
          <button type="button" :disabled="pending" @click="edit(entry)">
            Edit
          </button>
          <button type="button" :disabled="pending" @click="remove(entry)">
            Remove
          </button>
        </div>
      </li>
    </ul>
    <form
      v-if="editingId || experiences.length < maxEntries"
      @submit.prevent="save"
    >
      <label
        >Activity<input
          ref="title"
          v-model="title"
          maxlength="120"
          :disabled="pending"
          placeholder="For example, snorkeling"
          required
      /></label>
      <details :open="Boolean(editingId)">
        <summary>More details (optional)</summary>
        <label
          >Who ran it? (optional)<input
            v-model="operatorName"
            maxlength="140"
            :disabled="pending"
        /></label>
        <label
          >Website (optional)<input
            v-model="operatorWebsite"
            type="url"
            maxlength="2048"
            placeholder="https://"
            :disabled="pending"
        /></label>
      </details>
      <p v-if="validation || error" role="alert">{{ validation || error }}</p>
      <button type="submit" :disabled="pending">
        {{
          pending ? "Saving" : editingId ? "Save changes" : "Save experience"
        }}
      </button>
      <button v-if="editingId" type="button" :disabled="pending" @click="reset">
        Cancel edit
      </button>
    </form>
    <p v-else>
      You can keep up to {{ maxEntries }} experiences at this destination.
    </p>
  </section>
</template>

<script>
import {
  MAX_VISIT_EXPERIENCES,
  normalizeExperienceChange,
} from "../../../../shared/my-atlas-experiences.mjs"
export default {
  name: "MyAtlasExperiences",
  props: {
    experiences: { type: Array, default: () => [] },
    pending: Boolean,
    error: { type: String, default: "" },
    savedSequence: { type: Number, default: 0 },
  },
  emits: ["change"],
  data: () => ({
    title: "",
    operatorName: "",
    operatorWebsite: "",
    editingId: "",
    draftId: "",
    validation: "",
    lastAction: null,
    maxEntries: MAX_VISIT_EXPERIENCES,
  }),
  watch: {
    savedSequence() {
      if (
        this.lastAction?.action !== "remove" ||
        this.lastAction.id === this.editingId
      )
        this.reset()
    },
  },
  methods: {
    websiteHost(value) {
      return new URL(value).hostname
    },
    reset() {
      this.title = ""
      this.operatorName = ""
      this.operatorWebsite = ""
      this.editingId = ""
      this.draftId = ""
      this.validation = ""
    },
    edit(entry) {
      this.editingId = entry.id
      this.title = entry.title
      this.operatorName = entry.operatorName
      this.operatorWebsite = entry.operatorWebsite
      this.validation = ""
      this.$nextTick(() => this.$refs.title?.focus())
    },
    remove(entry) {
      this.lastAction = { action: "remove", id: entry.id }
      this.$emit("change", this.lastAction)
    },
    save() {
      if (this.pending) return
      if (!this.draftId)
        this.draftId = "exp_" + crypto.randomUUID().replaceAll("-", "")
      const value = normalizeExperienceChange({
        action: this.editingId ? "edit" : "add",
        id: this.editingId || this.draftId,
        title: this.title,
        operatorName: this.operatorName,
        operatorWebsite: this.operatorWebsite,
      })
      if (!value) {
        this.validation =
          "Add an activity title and use a complete HTTPS website without a username or password."
        return
      }
      this.validation = ""
      this.lastAction = value
      this.$emit("change", value)
    },
  },
}
</script>

<style scoped>
.visit-experiences {
  display: grid;
  gap: 0.7rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #345);
  min-width: 0;
}
h3,
p {
  margin: 0;
}
h3 {
  font-size: 1.05rem;
  line-height: 1.3;
  font-weight: 600;
}
p,
li span,
a {
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}
ul {
  display: grid;
  gap: 0.7rem;
  padding: 0;
  list-style: none;
}
li,
form,
label,
details[open] {
  display: grid;
  gap: 0.6rem;
  min-width: 0;
}
li {
  padding: 0.7rem;
  border: 1px solid var(--color-border, #345);
  border-radius: 0.7rem;
}
li div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
input {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  padding: 0.7rem;
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border, #567);
  border-radius: 0.5rem;
}
button {
  min-height: 44px;
  font: inherit;
  padding: 0.5rem 0.7rem;
  color: var(--color-accent-soft);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-accent);
  border-radius: 0.5rem;
  cursor: pointer;
}
summary {
  cursor: pointer;
  padding-block: 0.5rem;
}
a {
  color: var(--color-accent-soft);
}
</style>
