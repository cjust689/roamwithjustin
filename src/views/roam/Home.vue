<template>
  <div class="home">
    <div class="parallax-container valign-wrapper">
      <div class="row container">
        <div class="col s12">
          <h4 class="center white-text hover-motto">
            <h2 class="yellow-text">ROAM WITH JUSTIN</h2>
          </h4>
        </div>
        <div class="col s12">
          <div></div>
          <h4 class="center white-text hover-motto">
            <span
              >Roam with Justin is where adventure meets intention — a visual
              journey through hidden corners of the world, captured one story,
              one shot at a time. Come for the views, stay for the
              feeling.</span
            >
          </h4>
          <div class="center-align">
            <router-link
              style="z-index: 9999; position: relative"
              to="/roam/trips"
              class="cta-button yellow darken-2 black-text"
            >
              🧭 Explore the Travel Guide
            </router-link>
          </div>
        </div>
      </div>

      <div class="parallax" v-html="randomRoamImage('default')"></div>
    </div>
  </div>
</template>
<script>
/* eslint-disable */
import { getRandom, randomRoamImage } from "../../js/functions"
export default {
  name: "Home2",
  components: {
    //HelloWorld
  },
  methods: {
    getRandom,
    randomRoamImage,
  },
  mounted() {
    M.AutoInit() // That way, it is only initialized when the component is mounted
  },
}
</script>
<style scoped>
.cta-button {
  margin-top: 1.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #0077cc;
  color: #fff;
  font-weight: 600;
  font-size: 2rem;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.3s ease;
  display: inline-block;
}

.cta-button:hover {
  background-color: #005fa3;
}

.home {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.parallax-container {
  min-height: 100vh; /* or 500px+ for better visibility */
  height: auto;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.parallax img {
  object-fit: cover;
  width: 100%;
  height: auto;
  max-height: unset;
}
</style>
