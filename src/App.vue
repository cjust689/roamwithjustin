<template>
  <div id="app-container">
    <!-- If on / (WebHome), render only the view -->
    <router-view v-if="$route.path === '/'" />
    <!-- Else, render layout + view -->
    <template v-else>
      <!-- Show different headers depending on the route -->
      <component :is="currentHeader" />
      <div id="main-content" class="grey darken-4">
        <!-- Only show banner if not on root or about -->
        <Banner v-if="showBanner" />
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </div>

      <div class="divider yellow darken-2"></div>
      <VueFooter />
    </template>
  </div>
</template>

<script>
import M from "./js/materialize"
const RoamHeader = () => import("./components/RoamHeader.vue")
const VueFooter = () => import("./components/Footer")
const PP = () => import("./components/ParallaxProjector")
const Banner = () => import("./components/Banner.vue")
export default {
  name: "App",
  components: {
    Banner,
    VueFooter,
    PP,
    RoamHeader,
  },
  computed: {
    currentHeader() {
      return RoamHeader
    },
    showBanner() {
      const hiddenRoutes = ["/roam", "/roam/about", "/roam/affiliates"]
      return !hiddenRoutes.includes(this.$route.path)
    },
  },
  mounted() {
    M.AutoInit()
  },
  methods: {},
}
</script>
<style>
@import url("https://fonts.googleapis.com/icon?family=Material+Icons");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Russo+One&display=swap");
html,
body,
#app-container {
  height: 100%;
  margin: 0;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 64px;
}
</style>
