import { isMyAtlasGeographicProofEnabled } from "./config/featureFlags.mjs"

const geographicProofEnabled = isMyAtlasGeographicProofEnabled(process.env)

export const myAtlasRoutes = geographicProofEnabled
  ? [
      {
        path: "/my-atlas",
        name: "MyAtlasGeographicProof",
        meta: {
          standalone: true,
        },
        component: () => import("./views/MyAtlasGeographicProof.vue"),
      },
    ]
  : []
