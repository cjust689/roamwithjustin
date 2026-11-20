<template>
  <div id="app-container">
    <!-- Standalone routes render without legacy site chrome. -->
    <router-view v-if="$route.meta.standalone" />
    <!-- Else, render layout + view -->
    <template v-else>
      <!-- Show different headers depending on the route -->
      <component :is="currentHeader" />
      <div id="main-content">
        <!-- Keep the route mounted directly so the footer does not jump while
             lazy route chunks exchange during navigation. -->
        <router-view />
      </div>
      <VueFooter />
    </template>
  </div>
</template>

<script>
import VueFooter from "./components/Footer.vue"
import RoamHeader from "./components/RoamHeader.vue"
export default {
  name: "App",
  components: {
    VueFooter,
    RoamHeader,
  },
  computed: {
    currentHeader() {
      return RoamHeader
    },
  },
}
</script>
<style>
@import url("https://fonts.googleapis.com/icon?family=Material+Icons");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap");
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
  background: var(--color-page, #0b1114);
  color: var(--color-text, #fff);
  isolation: isolate;
}
</style>
