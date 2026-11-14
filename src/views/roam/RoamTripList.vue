<template>
  <main class="story-library">
    <section class="library-intro">
      <div>
        <span class="eyebrow">Travel stories and field notes</span>
        <h1>Follow the journey beyond the pin.</h1>
      </div>
      <div class="intro-copy">
        <p>
          Day-by-day routes, photographs, places, lodging, and the practical
          details behind each trip. Switch to the Atlas whenever geography tells
          the story better.
        </p>
        <router-link to="/atlas">Explore the interactive Atlas</router-link>
      </div>
    </section>

    <section class="story-grid" aria-label="Travel stories">
      <article
        v-for="trip in trips"
        :key="trip.id"
        class="story-card"
        :class="{ 'is-coming-soon': trip.comingSoon }"
      >
        <div class="story-image">
          <img :src="trip.cover" :alt="`${trip.name} landscape`" />
          <div class="story-shade"></div>
          <span class="story-status">
            {{ trip.comingSoon ? "Coming soon" : trip.dates }}
          </span>
        </div>

        <div class="story-body">
          <span>{{ trip.duration || "Journey preview" }}</span>
          <h2>{{ trip.name }}</h2>
          <p>{{ trip.description }}</p>

          <div class="story-actions">
            <router-link
              v-if="!trip.comingSoon"
              class="story-primary"
              :to="`/trips/${trip.id}`"
            >
              Read the story <b aria-hidden="true">&rarr;</b>
            </router-link>
            <span v-else class="story-unavailable">Story in progress</span>
            <router-link
              v-if="trip.atlasHref"
              class="story-atlas"
              :to="trip.atlasHref"
            >
              View on Atlas
            </router-link>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script>
import { trips } from "@/content/selectors/trips"

export default {
  name: "RoamTripList",
  data() {
    return {
      trips,
    }
  },
}
</script>

<style scoped>
.story-library {
  min-height: 100vh;
  padding: clamp(3rem, 8vw, 7rem) max(1rem, calc((100vw - 1180px) / 2));
  background:
    radial-gradient(
      circle at 84% 4%,
      rgba(246, 189, 96, 0.09),
      transparent 30%
    ),
    #0b1114;
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
}

.library-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  align-items: end;
  gap: clamp(2rem, 6vw, 6rem);
  padding-bottom: clamp(2.5rem, 6vw, 5rem);
}

.eyebrow,
.story-status,
.story-body > span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.library-intro h1 {
  max-width: 760px;
  margin: 0.75rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 7vw, 6.5rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.93;
}

.intro-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.94rem !important;
  font-weight: 400;
  line-height: 1.7;
}

.intro-copy a {
  display: inline-block;
  margin-top: 1.15rem;
  border-bottom: 1px solid rgba(246, 189, 96, 0.6);
  color: #f8d79f;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.story-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 26px;
  background: #11191d;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
  transition:
    transform 300ms ease,
    border-color 300ms ease;
}

.story-card:hover {
  border-color: rgba(246, 189, 96, 0.42);
  transform: translateY(-5px);
}

.story-image {
  position: relative;
  height: clamp(250px, 34vw, 430px);
  overflow: hidden;
}

.story-image img,
.story-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.story-image img {
  object-fit: cover;
  transition: transform 700ms cubic-bezier(0.2, 0.75, 0.2, 1);
}

.story-card:hover .story-image img {
  transform: scale(1.035);
}

.story-shade {
  background: linear-gradient(180deg, transparent 45%, rgba(5, 9, 11, 0.8));
}

.story-status {
  position: absolute;
  right: 1.1rem;
  bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  background: rgba(7, 11, 14, 0.68);
  color: #fff;
  letter-spacing: 0.08em;
  backdrop-filter: blur(10px);
}

.story-body {
  padding: clamp(1.35rem, 3vw, 2.1rem);
}

.story-body h2 {
  margin: 0.45rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1;
}

.story-body p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.9rem 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem !important;
  font-weight: 400;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.story-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
}

.story-actions a {
  font-size: 0.78rem;
  font-weight: 800;
  text-decoration: none;
}

.story-primary {
  color: #fff;
}

.story-primary b {
  display: inline-block;
  margin-left: 0.25rem;
  color: #f6bd60;
  transition: transform 180ms ease;
}

.story-primary:hover b,
.story-primary:focus-visible b {
  transform: translateX(0.3rem);
}

.story-atlas {
  border: 1px solid rgba(246, 189, 96, 0.42);
  border-radius: 999px;
  padding: 0.6rem 0.75rem;
  color: #f8d79f;
}

.story-unavailable {
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.78rem;
  font-weight: 700;
}

.story-card.is-coming-soon {
  opacity: 0.78;
}

@media (max-width: 760px) {
  .story-library {
    padding-top: 3.5rem;
  }

  .library-intro,
  .story-grid {
    grid-template-columns: 1fr;
  }

  .library-intro {
    gap: 1.5rem;
  }

  .story-image {
    height: 280px;
  }
}

@media (max-width: 430px) {
  .story-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .story-atlas {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .story-card,
  .story-image img,
  .story-primary b {
    transition: none;
  }
}
</style>
