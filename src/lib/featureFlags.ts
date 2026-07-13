// Central feature flags. Toggle to hide features whose backend/RPAs
// are not yet available in production. Code for disabled features
// remains in the repo and is simply gated by the flag.
export const FEATURES = {
  // Multicálculo depende dos RPAs na nuvem (em desenvolvimento).
  multicalc: false,
} as const;
