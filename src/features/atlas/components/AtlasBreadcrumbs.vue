<!-- eslint-disable vue/require-explicit-emits -- Vue 2 uses implicit component events. -->
<template>
  <div class="atlas-breadcrumbs" role="navigation" aria-label="Atlas location">
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="crumb.id || 'world'">
        <button
          type="button"
          :aria-current="index === crumbs.length - 1 ? 'location' : null"
          @click="$emit('select', crumb.id)"
        >
          {{ crumb.title }}
        </button>
        <span v-if="index < crumbs.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </div>
</template>

<script>
export default {
  name: "AtlasBreadcrumbs",
  props: {
    crumbs: {
      type: Array,
      required: true,
    },
  },
}
</script>

<style scoped>
.atlas-breadcrumbs {
  min-width: 0;
  overflow: hidden;
}

.atlas-breadcrumbs ol {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  scrollbar-width: none;
  list-style: none;
}

.atlas-breadcrumbs ol::-webkit-scrollbar {
  display: none;
}

.atlas-breadcrumbs li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.42);
}

.atlas-breadcrumbs button {
  border: 0;
  padding: 0.45rem 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.atlas-breadcrumbs button[aria-current="location"] {
  color: #fff;
  font-weight: 700;
}

.atlas-breadcrumbs button:focus-visible {
  outline: 2px solid #f6bd60;
  outline-offset: 3px;
  border-radius: 2px;
}

@media (max-width: 720px) {
  .atlas-breadcrumbs ol,
  .atlas-breadcrumbs li {
    gap: 0.6rem;
  }

  .atlas-breadcrumbs button {
    min-height: 2.75rem;
    padding: 0.65rem 0;
    font-size: 0.92rem;
  }
}
</style>
