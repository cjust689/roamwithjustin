const atlasView = () => import("./views/AtlasView.vue")

function atlasProps(route) {
  return {
    nodeId: route.params.nodeId || "",
    storyMode: route.query.story === "1",
  }
}

export const atlasRoutes = [
  {
    path: "/",
    name: "Home",
    props: atlasProps,
    meta: {
      standalone: true,
      analyticsTitle: "Interactive Travel Atlas | Roam With Justin",
    },
    component: atlasView,
  },
  {
    path: "/atlas/:nodeId?",
    name: "TravelAtlas",
    props: atlasProps,
    meta: {
      standalone: true,
    },
    component: atlasView,
  },
]
