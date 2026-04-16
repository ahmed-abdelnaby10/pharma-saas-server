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
