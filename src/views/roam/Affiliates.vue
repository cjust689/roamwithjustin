<template>
  <div class="affiliate-page container">
    <h1>Support the Journey</h1>
    <p class="intro">
      Some links here are affiliate links — purchases made through them help
      fund my adventures, at no extra cost to you.
    </p>

    <!-- Partner Cards -->
    <section class="affiliate-cards">
      <div
        v-for="partner in affiliates.partners"
        :key="partner.id"
        class="affiliate-card"
      >
        <a
          :href="partner.link"
          target="_blank"
          class="card-background"
          :style="{ backgroundImage: `url(${partner.logo})` }"
        >
          <div class="card-overlay">
            <h3>{{ partner.name }}</h3>
            <p>{{ partner.description }}</p>
          </div>
        </a>
      </div>
    </section>

    <!-- Gear Affiliate Pills -->
    <section class="affiliate-gear">
      <h2>Featured Gear</h2>
      <div class="gear-grid">
        <a
          v-for="item in affiliates.gear"
          :key="item.name"
          :href="item.link"
          target="_blank"
          class="gear-pill"
        >
          <img v-if="item.image" :src="item.image" :alt="item.name" />
          {{ item.name }}
        </a>
      </div>
    </section>
  </div>
</template>

<script>
import { affiliates } from "@/data/affiliates.js"

export default {
  name: "AffiliatePage",
  data() {
    return {
      affiliates,
    }
  },
}
</script>

<style scoped>
.affiliate-page {
  padding: 2rem;
  font-family: "Poppins", sans-serif;
}
.intro {
  font-size: 1rem;
  color: #555;
  margin-bottom: 2rem;
}
.affiliate-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}
.affiliate-card {
  height: 200px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.affiliate-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}
.affiliate-logo {
  height: 60px;
  margin-bottom: 1rem;
}
.affiliate-gear h2 {
  margin-bottom: 1rem;
}
.gear-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.gear-pill {
  background-color: #e0f3ff;
  color: #0077cc;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  font-weight: 500;
  transition: background-color 0.2s ease;
}
.gear-pill img {
  height: 24px;
  width: auto;
  margin-right: 0.5rem;
}
.gear-pill:hover {
  background-color: #d0eaff;
}
.card-background {
  display: block;
  height: 100%;
  width: 100%;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  position: relative;
  text-decoration: none;
}
.card-overlay {
  background: rgba(0, 0, 0, 0.55);
  color: white;
  padding: 1rem;
  width: 100%;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: background 0.3s;
}
.card-background:hover .card-overlay {
  background: rgba(0, 0, 0, 0.7);
}
.card-overlay h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.card-overlay p {
  font-size: 0.9rem;
  margin: 0;
}
</style>
