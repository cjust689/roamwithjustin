<template>
  <header class="site-header">
    <nav class="site-nav" aria-label="Primary navigation">
      <router-link class="site-brand" to="/" aria-label="Roam With Justin home">
        <span>RWJ</span>
        <strong>Roam With Justin</strong>
      </router-link>

      <div class="site-links" aria-label="Desktop navigation">
        <router-link class="site-link" to="/trips">Stories</router-link>
        <router-link class="site-link atlas-link" to="/atlas">
          Travel Atlas
        </router-link>
        <router-link class="site-link" to="/gear">Gear</router-link>
        <router-link class="site-link" to="/about">About</router-link>
      </div>

      <button
        class="menu-toggle"
        type="button"
        :aria-expanded="String(menuOpen)"
        aria-controls="mobile-site-menu"
        :aria-label="menuOpen ? 'Close navigation' : 'Open navigation'"
        @click="menuOpen = !menuOpen"
      >
        <span></span>
        <span></span>
      </button>
    </nav>

    <transition name="menu-fade">
      <nav
        v-if="menuOpen"
        id="mobile-site-menu"
        class="mobile-menu"
        aria-label="Mobile navigation"
      >
        <router-link to="/trips"> <span>01</span> Travel stories </router-link>
        <router-link to="/atlas">
          <span>02</span> Interactive Atlas
        </router-link>
        <router-link to="/gear"> <span>03</span> Field gear </router-link>
        <router-link to="/about"> <span>04</span> About </router-link>
        <router-link to="/affiliates"> <span>05</span> Affiliates </router-link>
      </nav>
    </transition>
  </header>
</template>

<script>
export default {
  name: "RoamHeader",
  data() {
    return {
      menuOpen: false,
    }
  },
  watch: {
    $route() {
      this.closeMenu()
    },
  },
  methods: {
    closeMenu() {
      this.menuOpen = false
    },
  },
}
</script>

<style scoped>
.site-header {
  position: relative;
  z-index: 1000;
  font-family: "Poppins", system-ui, sans-serif;
}

.site-nav {
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px !important;
  line-height: normal !important;
  padding: 0 clamp(1rem, 4vw, 4rem);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(7, 11, 14, 0.9);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(18px);
}

.site-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  height: auto;
  color: #fff;
  text-decoration: none;
}

.site-brand > span {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 50%;
  background: #f6bd60;
  color: #111719;
  font-size: 0.7rem;
  font-weight: 900;
}

.site-brand strong {
  font-size: 0.86rem;
  letter-spacing: 0.04em;
}

.site-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.site-link {
  border-radius: 999px;
  padding: 0.65rem 0.9rem;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-decoration: none;
  transition:
    color 180ms ease,
    background 180ms ease;
}

.site-link:hover,
.site-link:focus-visible,
.site-link.router-link-active {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.site-link.atlas-link {
  border: 1px solid rgba(246, 189, 96, 0.45);
  color: #f8d79f;
}

.menu-toggle {
  display: none;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  width: 1.15rem;
  height: 2px;
  margin: 0.28rem auto;
  background: #fff;
}

.mobile-menu {
  position: fixed;
  z-index: 999;
  top: 72px;
  right: 0;
  left: 0;
  display: grid;
  height: auto !important;
  line-height: normal !important;
  padding: 0.75rem 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 11, 14, 0.98);
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.4);
}

.mobile-menu a {
  display: flex;
  align-items: center;
  min-height: 3.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.35rem;
  text-decoration: none;
}

.mobile-menu a span {
  width: 2.4rem;
  color: #f6bd60;
  font-family: "Poppins", sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.menu-fade-enter,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (max-width: 760px) {
  .site-links {
    display: none;
  }

  .menu-toggle {
    display: block;
  }
}

@media (max-width: 420px) {
  .site-brand strong {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-link,
  .menu-fade-enter-active,
  .menu-fade-leave-active {
    transition: none;
  }
}
</style>
