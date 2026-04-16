import { Language } from "./locale.types";

export type AuthScope = "platform" | "tenant";

export interface BaseAuthContext {
  userId: string;
  scope: AuthScope;
  roleCodes: string[];
  permissions: string[];
  preferredLanguage?: Language;
}

export interface PlatformAuthContext extends BaseAuthContext {
  scope: "platform";
  isPlatformAdmin: true;
}

export interface TenantAuthContext extends BaseAuthContext {
  scope: "tenant";
  tenantId: string;
  branchId?: string | null;
  isPlatformAdmin?: false;
}

export type AuthContext = PlatformAuthContext | TenantAuthContext;

export type AccessTokenPayload = AuthContext & {
  tokenType: "access";
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

export const isPlatformAuthContext = (
  value: unknown,
): value is PlatformAuthContext => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PlatformAuthContext>;

  return (
    candidate.scope === "platform" &&
    candidate.isPlatformAdmin === true &&
    typeof candidate.userId === "string" &&
    isStringArray(candidate.roleCodes) &&
    isStringArray(candidate.permissions)
  );
};

export const isTenantAuthContext = (
  value: unknown,
): value is TenantAuthContext => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TenantAuthContext>;

  return (
    candidate.scope === "tenant" &&
    typeof candidate.userId === "string" &&
    typeof candidate.tenantId === "string" &&
    isStringArray(candidate.roleCodes) &&
    isStringArray(candidate.permissions)
  );
};

export const isAccessTokenPayload = (
  value: unknown,
): value is AccessTokenPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AccessTokenPayload>;

  return (
    candidate.tokenType === "access" &&
    (isPlatformAuthContext(candidate) || isTenantAuthContext(candidate))
  );
};

export const toAuthContext = (payload: AccessTokenPayload): AuthContext => {
  const { tokenType: _tokenType, ...authContext } = payload;

  return authContext;
}
