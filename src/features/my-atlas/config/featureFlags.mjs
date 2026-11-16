export function isMyAtlasGeographicProofEnabled(environment = {}) {
  return environment.VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF === "true"
}
