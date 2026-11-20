<template>
  <aside class="support-note" aria-label="Affiliate disclosure">
    <p>
      Some gear links are affiliate links. They support the work at no extra
      cost to you.
    </p>
    <router-link to="/affiliates">Learn more</router-link>
  </aside>
</template>

<script>
export default {
  name: "Banner",
}
</script>

<style scoped>
.support-note {
  display: flex;
  z-index: 2;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  background: var(--color-surface, #10181c);
  color: var(--color-text-muted, rgba(255, 255, 255, 0.62));
  font-family: "Poppins", sans-serif;
  font-size: 0.72rem;
}

.support-note p {
  margin: 0;
  font-size: inherit !important;
  font-weight: 400;
}

.support-note a {
  color: var(--color-text, #fff);
  font-weight: 700;
}

@media (max-width: 640px) {
  .support-note {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.2rem;
  }
}
</style>
