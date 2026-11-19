/* eslint-disable */
import Vue from "vue"
import VueRouter from "vue-router"
import { atlasRoutes } from "../features/atlas/routes"
import { myAtlasRoutes } from "../features/my-atlas/routes"

Vue.use(VueRouter)

const routes = [
  ...atlasRoutes,
  ...myAtlasRoutes,
  {
    path: "/about",
    name: "About",
    meta: {
      analyticsTitle: "About | Roam With Justin",
    },
    component: () => import("../views/roam/About.vue"),
  },
  {
    path: "/privacy",
    name: "Privacy",
    meta: {
      analyticsTitle: "Privacy | Roam With Justin",
    },
    component: () => import("../views/roam/Privacy.vue"),
  },
  {
    path: "/trips",
    name: "RoamTrips",
    meta: {
      analyticsTitle: "Travel Stories | Roam With Justin",
    },
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
    meta: {
      analyticsTitle: "Travel and Photography Gear | Roam With Justin",
    },
    component: () => import("../views/roam/Gear.vue"),
  },
  {
    path: "/affiliates",
    name: "affiliates",
    meta: {
      analyticsTitle: "Affiliates | Roam With Justin",
    },
    component: () => import("../views/roam/Affiliates.vue"),
  },
  {
    path: "*",
    name: "PageNotFound",
    meta: {
      analyticsTitle: "Page not found | Roam With Justin",
    },
    component: () => import("../views/PageNotFound.vue"),
  },
]

const router = new VueRouter({
  mode: "history", // <-- This line enables clean URLs
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { selector: to.hash }
    } else {
      return { x: 0, y: 0 }
    }
  },
})
export default router
