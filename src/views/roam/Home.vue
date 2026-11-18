<!-- eslint-disable vue/no-deprecated-v-on-native-modifier -- Vue 2 RouterLink click tracking uses native listeners. -->
<template>
  <main class="home">
    <img class="home-background" :src="heroImage" alt="" aria-hidden="true" />
    <div class="home-shade"></div>

    <div class="home-shell">
      <section class="home-intro" aria-labelledby="home-title">
        <h1 id="home-title">Choose how the journey unfolds.</h1>
        <p class="home-lede">
          Original photography, short films, and practical notes from the places
          I've explored.
        </p>
        <div class="home-primary-action">
          <router-link
            to="/atlas"
            @click.native="trackAtlasEntry('homepage_primary')"
          >
            Explore the Interactive Atlas <span aria-hidden="true">&rarr;</span>
          </router-link>
          <p>
            Explore destinations, photography and field notes directly on the
            map.
          </p>
        </div>
      </section>

      <section
        class="journey-options"
        :class="{ 'has-my-atlas': myAtlasEnabled }"
        aria-label="Ways to explore"
      >
        <router-link
          class="journey-card atlas-card"
          to="/atlas"
          @click.native="trackAtlasEntry('homepage_atlas_card')"
        >
          <span
            class="journey-card-background"
            :style="{ backgroundImage: `url('${atlasImage}')` }"
            aria-hidden="true"
          ></span>
          <span class="journey-card-shade" aria-hidden="true"></span>
          <span class="journey-card-content">
            <strong>Explore the Interactive Atlas</strong>
            <span class="journey-action">Open the atlas <b>&rarr;</b></span>
          </span>
        </router-link>

        <router-link
          v-if="myAtlasEnabled"
          class="journey-card my-atlas-card"
          to="/my-atlas"
        >
          <span
            class="journey-card-background"
            :style="{ backgroundImage: `url('${myAtlasImage}')` }"
            aria-hidden="true"
          ></span>
          <span class="journey-card-shade" aria-hidden="true"></span>
          <span class="journey-card-content">
            <strong>Make My Atlas yours</strong>
            <span class="journey-action">Start My Atlas <b>&rarr;</b></span>
          </span>
        </router-link>
      </section>

      <p class="home-footnote">
        Interactive Atlas: Utah and Puerto Rico available now
      </p>
    </div>
  </main>
</template>

<script>
import { isMyAtlasGeographicProofEnabled } from "../../features/my-atlas/config/featureFlags.mjs"
import { trackAtlasOpen } from "../../utils/analytics.mjs"

const heroImages = [
  "/img/roam/default/1.jpg",
  "/img/roam/default/4.jpg",
  "/img/roam/default/5.jpg",
  "/img/roam/default/6.jpg",
]

export default {
  name: "RoamHome",
  data() {
    return {
      atlasImage: "/img/locations/utah/utah-full.jpg",
      heroImage: heroImages[Math.floor(Math.random() * heroImages.length)],
      myAtlasEnabled: isMyAtlasGeographicProofEnabled(process.env),
      myAtlasImage: "/img/roam/default/4.jpg",
    }
  },
  methods: {
    trackAtlasEntry(entrySurface) {
      trackAtlasOpen({ entrySurface })
    },
  },
}
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #080d10;
  color: #fff;
}

.home-background,
.home-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.home-background {
  object-fit: cover;
  transform: scale(1.02);
  animation: home-drift 18s ease-out both;
}

.home-shade {
  background:
    radial-gradient(circle at 72% 26%, rgba(12, 21, 25, 0.08), #070b0e 78%),
    linear-gradient(180deg, rgba(5, 9, 11, 0.28), rgba(5, 9, 11, 0.9));
}

.home-shell {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  width: min(1180px, calc(100% - 2.5rem));
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(2.5rem, 6vh, 5rem) 0 2rem;
}

.home-intro {
  max-width: 760px;
  text-shadow: 0 4px 32px rgba(0, 0, 0, 0.48);
}

.home-footnote {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.home-intro h1 {
  max-width: 720px;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3.25rem, 7.3vw, 6.8rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.91;
}

.home-lede {
  max-width: 620px;
  margin: 1.25rem 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: clamp(1rem, 1.5vw, 1.16rem);
  line-height: 1.65;
}

.home-primary-action {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.3rem;
}

.home-primary-action a {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 48px;
  border: 1px solid #f6bd60;
  border-radius: 999px;
  padding: 0.8rem 1.15rem;
  background: #f6bd60;
  color: #11191d;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.055em;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    background 180ms ease,
    transform 180ms ease;
}

.home-primary-action a:hover,
.home-primary-action a:focus-visible {
  background: #ffd889;
  transform: translateY(-2px);
}

.home-primary-action a:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}

.home-primary-action p {
  max-width: 350px;
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.85rem;
  line-height: 1.45;
}

.journey-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  margin-top: clamp(2rem, 5vh, 3.75rem);
}

.journey-options.has-my-atlas {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.journey-card {
  position: relative;
  min-height: 255px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
  color: #fff;
  text-decoration: none;
  isolation: isolate;
}

.journey-card-background,
.journey-card-shade {
  position: absolute;
  inset: 0;
}

.journey-card-background {
  z-index: -2;
  background-position: center;
  background-size: cover;
  transition: transform 700ms cubic-bezier(0.2, 0.75, 0.2, 1);
}

.journey-card-shade {
  z-index: -1;
  background: linear-gradient(
    115deg,
    rgba(5, 9, 11, 0.96),
    rgba(5, 9, 11, 0.48)
  );
  transition: background 300ms ease;
}

.journey-card-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 255px;
  padding: clamp(1.35rem, 3vw, 2rem);
}

.journey-card strong {
  max-width: 410px;
  margin-top: auto;
  padding-top: 1.8rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 500;
  line-height: 1;
}

.journey-action {
  margin-top: 1.2rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.journey-action b {
  display: inline-block;
  margin-left: 0.35rem;
  color: #f6bd60;
  transition: transform 200ms ease;
}

.journey-card:hover .journey-card-background,
.journey-card:focus-visible .journey-card-background {
  transform: scale(1.06);
}

.journey-card:hover .journey-card-shade,
.journey-card:focus-visible .journey-card-shade {
  background: linear-gradient(
    115deg,
    rgba(5, 9, 11, 0.9),
    rgba(5, 9, 11, 0.28)
  );
}

.journey-card:hover .journey-action b,
.journey-card:focus-visible .journey-action b {
  transform: translateX(0.3rem);
}

.journey-card:focus-visible {
  outline: 3px solid #f6bd60;
  outline-offset: 4px;
}

.home-footnote {
  margin: 1.1rem 0 0;
  color: rgba(255, 255, 255, 0.48);
  letter-spacing: 0.11em;
}

@keyframes home-drift {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1.02);
  }
}

@media (max-width: 760px) {
  .home-shell {
    align-content: start;
    width: min(100% - 1.5rem, 620px);
    padding-top: 3.5rem;
  }

  .home-intro h1 {
    font-size: clamp(3rem, 14vw, 4.7rem);
  }

  .home-primary-action {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.7rem;
  }

  .home-primary-action p {
    max-width: 31rem;
  }

  .journey-options {
    grid-template-columns: 1fr;
    margin-top: 2.25rem;
  }

  .journey-options.has-my-atlas {
    grid-template-columns: 1fr;
  }

  .journey-card,
  .journey-card-content {
    min-height: 235px;
  }

  .home-footnote {
    padding-bottom: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-background {
    animation: none;
  }

  .journey-card-background,
  .journey-action b,
  .home-primary-action a {
    transition: none;
  }
}
</style>
