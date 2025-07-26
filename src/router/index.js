/* eslint-disable */
import Vue from "vue"
import VueRouter from "vue-router"

Vue.use(VueRouter)

const routes = [
  {
    path: "/about",
    name: "About",
    component: () => import("../views/roam/About.vue"),
  },
  {
    path: "/trips",
    name: "RoamTrips",
    component: () => import("../views/roam/RoamTripList.vue"),
  },
  {
    path: "/trips/:id",
    name: "RoamTripOverview",
    props: true,
    component: () => import("../views/roam/RoamTripOverview.vue"),
  },
  {
    path: "/gear",
    name: "Gear",
    component: () => import("../views/roam/Gear.vue"),
  },
  {
    path: "/",
    name: "Home",
    component: () => import("../views/roam/Home.vue"),
  },

  {
    path: "/affiliates",
    name: "affiliates",
    component: () => import("../views/roam/Affiliates.vue"),
  },
  {
    path: "*",
    name: "PageNotFound",
    component: () => import("../views/PageNotFound.vue"),
  },
]

const router = new VueRouter({
  mode: "history", // <-- This line enables clean URLs
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { x: 0, y: 0 }
    }
  },
})
export default router
