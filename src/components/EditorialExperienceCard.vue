<template>
  <div class="editorial-experience-card" :class="{ 'is-story': story }">
    <img
      v-if="showImage && experience.image"
      :src="experience.image.src"
      :alt="experience.image.alt || ''"
      :width="experience.image.width || null"
      :height="experience.image.height || null"
      loading="lazy"
      decoding="async"
    />
    <div>
      <span v-if="experience.category" class="experience-category">{{
        experience.category
      }}</span>
      <span v-if="experience.contextLabel" class="experience-context">{{
        experience.contextLabel
      }}</span>
      <h3 tabindex="-1">{{ experience.title }}</h3>
      <p v-if="experience.summary">{{ experience.summary }}</p>
      <button v-if="readable" type="button" @click="$emit('read')">
        Read this experience
      </button>
      <a
        v-if="experience.operator"
        :href="experience.operator.href"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
        >{{ experience.operator.name }} website</a
      >
      <small v-if="experience.operator">{{
        experience.operator.disclosure
      }}</small>
    </div>
  </div>
</template>

<script>
export default {
  name: "EditorialExperienceCard",
  props: {
    experience: { type: Object, required: true },
    showImage: { type: Boolean, default: true },
    readable: Boolean,
    story: Boolean,
  },
  emits: ["read"],
}
</script>

<style scoped>
.editorial-experience-card {
  display: grid;
  gap: 14px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.editorial-experience-card > img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
}
.editorial-experience-card > div {
  display: grid;
  gap: 9px;
}
.editorial-experience-card h3 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.3;
}
.editorial-experience-card.is-story h3 {
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  letter-spacing: -0.045em;
}
.editorial-experience-card.is-story p {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
  font-size: max(1rem, 16px);
  line-height: 1.75;
}
.editorial-experience-card p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-line;
}
.editorial-experience-card small,
.experience-category,
.experience-context {
  font-size: 0.72rem;
  line-height: 1.5;
}
.experience-context {
  color: var(--color-text-muted, rgba(255, 255, 255, 0.68));
}
.editorial-experience-card a {
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.82rem;
}
.editorial-experience-card button {
  justify-self: start;
  padding: 0.65rem 0.8rem;
  border: 1px solid currentColor;
  border-radius: 10px;
  background: transparent;
  color: var(--color-accent-soft, #e6ba68);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
}
</style>
