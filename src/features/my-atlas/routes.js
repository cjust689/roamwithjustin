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
