// Existing journey-level USVI artwork. Location-specific media will be added
// here after the creator's Lightroom selections are reviewed and delivered.
export const usviMedia = Object.freeze([
  {
    id: "image-usvi-usvi-full",
    kind: "image",
    source: {
      provider: "local",
      path: "/img/locations/usvi/usvi-full.jpg",
    },
    intrinsic: {
      mimeType: "image/jpeg",
      width: 2560,
      height: 1707,
    },
    rights: {
      owner: "roam-with-justin",
      status: "owned",
    },
    capture: {
      // The island is confirmed; a more specific capture place is not.
      placeId: "st-john",
      capturedAt: null,
    },
    defaultAlt: "St. John destination photograph",
  },
  {
    id: "image-usvi-usvi",
    kind: "image",
    source: {
      provider: "local",
      path: "/img/locations/usvi/usvi.jpg",
    },
    intrinsic: {
      mimeType: "image/jpeg",
      width: 2560,
      height: 1707,
    },
    rights: {
      owner: "roam-with-justin",
      status: "owned",
    },
    capture: {
      // This duplicate cover usage remains journey-scoped until replacement.
      placeId: "st-john",
      capturedAt: null,
    },
    defaultAlt: "St. John journey cover photograph",
  },
])
