<template>
  <div class="list grey darken-4">
    <div class="row container">
      <div v-for="trip in trips" :key="trip.id" class="col s12 l4">
        <router-link
          :to="trip.comingSoon ? '#' : `/roam/trips/${trip.id}`"
          class="card-link"
        >
          <div class="card trip-card">
            <div class="card-image">
              <img :src="trip.cover" />
              <span class="card-title">{{ trip.name }}</span>
              <div v-if="trip.comingSoon" class="coming-soon-ribbon">
                Coming Soon
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { trips } from "@/data/trips.js"
import M from "@/js/materialize"
export default {
  name: "RoamTripList",
  components: {},
  data() {
    return {
      trips,
    }
  },
  mounted() {
    M.AutoInit() // Initialize Materialize if needed
  },
}
</script>
<style scoped>
.list {
  padding-top: 200px;
  position: relative;
}
.trip-card {
  position: relative;
  overflow: hidden;
}

.coming-soon-ribbon {
  position: absolute;
  top: 30px; /* Slightly lower */
  left: -40px; /* Less offset to bring it toward center */
  transform: rotate(-45deg);
  background-color: #fbbf24;
  color: #111;
  font-weight: bold;
  padding: 0.4rem 3rem;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 10;
  text-transform: uppercase;
}
</style>
