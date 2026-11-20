import { isMyAtlasGeographicProofEnabled } from "./config/featureFlags.mjs"

const geographicProofEnabled = isMyAtlasGeographicProofEnabled(process.env)

export const myAtlasRoutes = geographicProofEnabled
  ? [
      {
        path: "/my-atlas/callback",
        name: "MyAtlasAuthCallback",
        meta: {
          standalone: true,
        },
        component: () => import("./views/MyAtlasAuthCallback.vue"),
      },
      {
        path: "/my-atlas",
        name: "MyAtlasGeographicProof",
        meta: {
          standalone: true,
        },
        component: () => import("./views/MyAtlasGeographicProof.vue"),
      },
      {
        path: "/my-atlas/trip/:snapshot",
        name: "MyAtlasSharedTrip",
        props: true,
        meta: {
          standalone: true,
          analyticsTitle: "Shared trip | My Atlas",
        },
        component: () => import("./views/MyAtlasSharedTripView.vue"),
      },
      {
        path: "/my-atlas/explore",
        name: "MyAtlasExplore",
        meta: {
          standalone: true,
          analyticsTitle: "Explore Atlases",
        },
        component: () => import("./views/MyAtlasExploreView.vue"),
      },
      {
        path: "/my-atlas/:handle",
        name: "MyAtlasPublic",
        props: true,
        meta: {
          standalone: true,
        },
        component: () => import("./views/MyAtlasPublicView.vue"),
      },
    ]
  : []
