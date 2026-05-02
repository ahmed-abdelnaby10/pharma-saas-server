/**
 * Canonical feature key strings used in PlanFeature.featureKey.
 *
 * Count-limited features use `limitValue` (Int). Feature flags use only
 * `enabled` (boolean) and have a null `limitValue`.
 */
export const FeatureKey = {
  // Count-limited
  MAX_BRANCHES: "max_branches",
  MAX_USERS: "max_users",

  // Feature flags
  OCR_ENABLED: "ocr_enabled",
  SALES_RETURNS_ENABLED: "sales_returns_enabled",
  ADVANCED_ANALYTICS_ENABLED: "advanced_analytics_enabled",

  // Offline mode — how many hours the desktop may operate offline before forcing re-auth (default: 24)
  MAX_OFFLINE_HOURS: "max_offline_hours",
} as const;

export type FeatureKeyValue = (typeof FeatureKey)[keyof typeof FeatureKey];

/** Feature keys that have a countable current usage (limitValue is meaningful). */
export const COUNT_LIMITED_KEYS = new Set<FeatureKeyValue>([
  FeatureKey.MAX_BRANCHES,
  FeatureKey.MAX_USERS,
]);
