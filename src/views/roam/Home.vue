<template>
  <main class="home">
    <img class="home-background" :src="heroImage" alt="" aria-hidden="true" />
    <div class="home-shade"></div>

    <div class="home-shell">
      <section class="home-intro" aria-labelledby="home-title">
        <p class="home-brand">Roam With Justin</p>
        <h1 id="home-title">Choose how the journey unfolds.</h1>
        <p class="home-lede">
          Adventure meets intention through visual stories, practical field
          notes, and places worth slowing down for.
        </p>
      </section>

      <section class="journey-options" aria-label="Ways to explore">
        <router-link class="journey-card atlas-card" to="/atlas">
          <span
            class="journey-card-background"
            :style="{ backgroundImage: `url('${atlasImage}')` }"
            aria-hidden="true"
          ></span>
          <span class="journey-card-shade" aria-hidden="true"></span>
          <span class="journey-card-content">
            <span class="journey-label">
              <span class="journey-pulse" aria-hidden="true"></span>
              Interactive experience
            </span>
            <strong>Enter the Travel Atlas</strong>
            <span class="journey-description">
              Fly across satellite terrain through Utah's red-rock parks and
              Puerto Rico's cities, cliffs, waterfalls, and beaches.
            </span>
            <span class="journey-action">Open the atlas <b>&rarr;</b></span>
          </span>
        </router-link>

        <router-link class="journey-card guides-card" to="/trips">
          <span
            class="journey-card-background"
            :style="{ backgroundImage: `url('${guidesImage}')` }"
            aria-hidden="true"
          ></span>
          <span class="journey-card-shade" aria-hidden="true"></span>
          <span class="journey-card-content">
            <span class="journey-label">Travel guides</span>
            <strong>Follow the full journey</strong>
            <span class="journey-description">
              Read the itineraries, locations, travel notes, photography, and
              gear behind each completed trip.
            </span>
            <span class="journey-action">Browse the guides <b>&rarr;</b></span>
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
      guidesImage: "/img/locations/puerto-rico/puerto-rico-full.jpg",
      heroImage: heroImages[Math.floor(Math.random() * heroImages.length)],
    }
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

.home-brand,
.journey-label,
.home-footnote {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.home-brand {
  margin: 0 0 0.7rem;
  color: #f6bd60;
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

.journey-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: clamp(2rem, 5vh, 3.75rem);
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

.journey-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #f6bd60;
}

.journey-pulse {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  background: #f6bd60;
  box-shadow: 0 0 0 0 rgba(246, 189, 96, 0.65);
  animation: journey-pulse 2.4s infinite;
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

.journey-description {
  max-width: 470px;
  margin-top: 0.65rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.55;
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

@keyframes journey-pulse {
  70% {
    box-shadow: 0 0 0 0.55rem rgba(246, 189, 96, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(246, 189, 96, 0);
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

  .journey-options {
    grid-template-columns: 1fr;
    margin-top: 2.25rem;
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
  .home-background,
  .journey-pulse {
    animation: none;
  }

  .journey-card-background,
  .journey-action b {
    transition: none;
  }
}
</style>
