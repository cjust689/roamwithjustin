<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-message">
        <span>Roam With Justin</span>
        <p>{{ quote }}</p>
      </div>
      <nav aria-label="Footer navigation">
        <router-link to="/trips">Stories</router-link>
        <router-link to="/atlas">Travel Atlas</router-link>
        <router-link to="/gear">Gear</router-link>
        <router-link to="/about">About</router-link>
      </nav>
    </div>
    <div class="footer-meta">
      <span>&copy; {{ new Date().getFullYear() }} Roam With Justin</span>
      <router-link to="/affiliates">Affiliate disclosure</router-link>
    </div>
  </footer>
</template>

<script>
import { randomQuote } from "../js/functions"

export default {
  name: "VueFooter",
  data() {
    return {
      quote: randomQuote(),
    }
  },
}
</script>

<style scoped>
.site-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #070b0e;
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
}

.footer-inner,
.footer-meta {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
}

.footer-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(250px, 0.6fr);
  gap: 3rem;
  padding: clamp(2.5rem, 7vw, 5rem) 0;
}

.footer-message span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.footer-message p {
  max-width: 720px;
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.45rem, 3vw, 2.65rem) !important;
  font-weight: 400;
  line-height: 1.18;
}

.footer-inner nav {
  display: grid;
  align-content: start;
  gap: 0.2rem;
}

.footer-inner nav a {
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  padding: 0.7rem 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
}

.footer-inner nav a:hover,
.footer-inner nav a:focus-visible,
.footer-meta a:hover,
.footer-meta a:focus-visible {
  color: #f6bd60;
}

.footer-meta {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding: 1rem 0 1.25rem;
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.footer-meta a {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 680px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .footer-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
