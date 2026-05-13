export const PLATFORM_ROLES = {
  OWNER: "platform_owner",
} as const;

export const TENANT_ROLES = {
  OWNER: "tenant_owner",
  MANAGER: "tenant_manager",
  CASHIER: "cashier",
  PHARMACIST: "pharmacist",
  INVENTORY_CLERK: "inventory_clerk",
} as const;

/**
 * Default permission codes seeded for each well-known tenant role when that
 * role is first created.  tenant_owner is handled separately in the tenant
 * creation flow (receives ALL permissions).  Any role whose code is not listed
 * here starts with an empty permission set.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── Manager: broad access, no destructive or RBAC-management actions ────────
  [TENANT_ROLES.MANAGER]: [
    "branches:read", "branches:create", "branches:update",
    "users:read",    "users:create",    "users:update",
    "roles:read",
    "catalog:read",    "catalog:suggest",
    "inventory:read",   "inventory:create",   "inventory:update",
    "purchasing:read",  "purchasing:create",  "purchasing:update",
    "sales:read",       "sales:create",       "sales:return",
    "shifts:read",      "shifts:manage",
    "reports:read",
    "settings:read",    "settings:update",
    "suppliers:read",   "suppliers:create",   "suppliers:update",
  ],

  // ── Pharmacist: clinical + dispensing focus ──────────────────────────────────
  [TENANT_ROLES.PHARMACIST]: [
    "catalog:read",    "catalog:suggest",
    "inventory:read",  "inventory:create",  "inventory:update",
    "purchasing:read", "purchasing:create", "purchasing:update",
    "sales:read",      "sales:create",
    "shifts:read",     "shifts:manage",
    "reports:read",
    "suppliers:read",
  ],

  // ── Cashier: point-of-sale focus ─────────────────────────────────────────────
  [TENANT_ROLES.CASHIER]: [
    "catalog:read",
    "sales:read",   "sales:create",
    "shifts:read",  "shifts:manage",
    "inventory:read",
    "reports:read",
  ],

  // ── Inventory Clerk: stock and procurement focus ─────────────────────────────
  [TENANT_ROLES.INVENTORY_CLERK]: [
    "catalog:read",    "catalog:suggest",
    "inventory:read",  "inventory:create",  "inventory:update",
    "purchasing:read", "purchasing:create", "purchasing:update",
    "suppliers:read",  "suppliers:create",  "suppliers:update",
    "reports:read",
    "shifts:read",
  ],
};
