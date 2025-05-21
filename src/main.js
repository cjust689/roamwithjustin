/* eslint-disable */
import Vue from "vue"
import App from "./App.vue"
import router from "./router"
import "@/styles/materialize.min.css"
import "@/styles/style.css"
import M from "./js/materialize.js"
let x = 0
Vue.config.productionTip = false
// 🧠 Detect current domain
const hostname = window.location.hostname
const isRoam = hostname.includes("roam.with.justin")
const isWebworks = hostname.includes("webworksmedia.club")

// 🌐 Make available to all components via prototype
Vue.prototype.$isRoam = isRoam
Vue.prototype.$isWebworks = isWebworks
if (isRoam && window.location.pathname === "/") {
  window.location.href = "/roam"
}
new Vue({
  router,
  render: h => h(App),
  data: {
    nav: "",
    sideNav: "",
    homeImage: '<img src="img/background.png">',
  },
  methods: {},
  mounted: function() {
    //randomQuote(this)
    M.AutoInit()
  },
}).$mount("#app")
