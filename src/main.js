/* eslint-disable */
import Vue from "vue"
import App from "./App.vue"
import router from "./router"
import "@/styles/materialize.min.css"
import "@/styles/style.css"
Vue.config.productionTip = false
// 🧠 Detect current domain
const hostname = window.location.hostname
const isRoam = hostname.includes("roamwithjustin")
const isWebworks = hostname.includes("webworksmedia.club")

// 🌐 Make available to all components via prototype
Vue.prototype.$isRoam = isRoam
Vue.prototype.$isWebworks = isWebworks
new Vue({
  router,
  render: h => h(App),
}).$mount("#app")
