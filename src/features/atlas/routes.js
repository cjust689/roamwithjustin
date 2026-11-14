export const atlasRoutes = [
  {
    path: "/atlas/:nodeId?",
    name: "TravelAtlas",
    props: true,
    meta: {
      standalone: true,
    },
    component: () => import("./views/AtlasView.vue"),
  },
]
