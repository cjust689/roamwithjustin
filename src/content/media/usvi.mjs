// Controlled USVI assets. The three R2 videos are creator-confirmed Journey
// media; location-specific Lightroom photographs will be added separately.
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
  {
    id: "video-usvi-arrival-ferry-001",
    kind: "video",
    source: {
      provider: "r2",
      // Keep the exact R2 object key here. The shared resolver safely encodes
      // spaces when it creates the public media.roamwithjustin.com URL.
      objectKey: "videos/usa/usvi/This Is Saint John.mp4",
    },
    intrinsic: {
      mimeType: "video/mp4",
      durationSeconds: null,
      width: null,
      height: null,
    },
    posterAssetId: "image-usvi-usvi",
    rights: {
      owner: "roam-with-justin",
      status: "owned",
    },
    capture: {
      // The film spans St. Thomas arrival and the ferry into St. John, so a
      // single capture Place would be less accurate than its Journey usage.
      placeId: null,
      capturedAt: null,
    },
    defaultAlt: "Arrival on St. Thomas and the ferry crossing to St. John",
  },
  {
    id: "video-usvi-nates-charters-001",
    kind: "video",
    source: {
      provider: "r2",
      objectKey: "videos/usa/usvi/NatesCharters_Edit-30k.mp4",
    },
    intrinsic: {
      mimeType: "video/mp4",
      durationSeconds: null,
      width: null,
      height: null,
    },
    posterAssetId: "image-usvi-usvi",
    rights: {
      owner: "roam-with-justin",
      status: "owned",
    },
    capture: {
      // The charter edit covers a multi-stop day rather than one exact cay.
      placeId: null,
      capturedAt: null,
    },
    defaultAlt: "Boat day with Nate's Custom Charters around St. John",
  },
  {
    id: "video-usvi-waterlemon-001",
    kind: "video",
    source: {
      provider: "r2",
      objectKey: "videos/usa/usvi/roam_waterlemon_1.mp4",
    },
    intrinsic: {
      mimeType: "video/mp4",
      durationSeconds: null,
      width: null,
      height: null,
    },
    posterAssetId: "image-usvi-usvi",
    rights: {
      owner: "roam-with-justin",
      status: "owned",
    },
    capture: {
      placeId: "waterlemon-cay",
      capturedAt: null,
    },
    defaultAlt: "Waterlemon Cay coastal and water travel video",
  },
])
