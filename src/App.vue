<template>
  <div id="app-container">
    <!-- Root and explicitly standalone routes render without legacy site chrome. -->
    <router-view v-if="$route.path === '/' || $route.meta.standalone" />
    <!-- Else, render layout + view -->
    <template v-else>
      <!-- Show different headers depending on the route -->
      <component :is="currentHeader" />
      <div id="main-content">
        <!-- Only show banner if not on root or about -->
        <Banner v-if="showBanner" />
        <!-- Keep the route mounted directly so the footer does not jump while
             lazy route chunks exchange during navigation. -->
        <router-view />
      </div>
      <VueFooter />
    </template>
  </div>
</template>

<script>
import Banner from "./components/Banner.vue"
import VueFooter from "./components/Footer.vue"
import RoamHeader from "./components/RoamHeader.vue"
export default {
  name: "App",
  components: {
    Banner,
    VueFooter,
    RoamHeader,
  },
  computed: {
    currentHeader() {
      return RoamHeader
    },
    showBanner() {
      const hiddenRoutes = ["/", "/about", "/affiliates"]
      return (
        !hiddenRoutes.includes(this.$route.path) &&
        !this.$route.path.startsWith("/trips")
      )
    },
  },
}
</script>
<style>
@import url("https://fonts.googleapis.com/icon?family=Material+Icons");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Russo+One&display=swap");
html,
body,
#app,
#app-container {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

#app-container {
  display: flex;
  min-width: 0;
  flex-direction: column;
  min-height: 100dvh;
  overflow-x: clip;
}

#main-content {
  position: relative;
  flex: 1 0 auto;
  display: flex;
  min-width: 0;
  width: 100%;
  flex-direction: column;
  min-height: 100dvh;
  overflow-x: clip;
  padding-top: 72px;
  background: #0b1114;
  color: #fff;
  isolation: isolate;
}
</style>
