import { comparePassword } from "../../../../core/security/password";
import { signAccessToken } from "../../../../core/security/jwt";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { Language } from "../../../../shared/types/locale.types";
import { SubscriptionClaim, TenantAuthContext } from "../../../../shared/types/auth.types";
import { rolesRepository } from "../../roles/repository/roles.repository";
import { subscriptionsRepository } from "../../../platform/subscriptions/repository/subscriptions.repository";
import { TenantLoginDto } from "../dto/tenant-login.dto";
import {
  tenantAuthRepository,
  TenantAuthRepository,
} from "../repository/tenant-auth.repository";

export type TenantLoginResult = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    tenantId: string;
    preferredLanguage: Language;
  };
};

export type HeartbeatResult = {
  accessToken: string;
  subscription: SubscriptionClaim;
};

export class TenantAuthService {
  constructor(private readonly repository: TenantAuthRepository) {}

  async login(payload: TenantLoginDto): Promise<TenantLoginResult> {
    const record = await this.repository.findUserByTenantAndEmail(
      payload.tenantId,
      payload.email,
    );

    // Unknown user — keep message generic to avoid user enumeration
    if (!record) {
      throw new UnauthorizedError(
        "Invalid credentials",
        undefined,
        "auth.invalid_credentials",
      );
    }

    // Tenant must be active before checking anything else
    if (record.tenant.status !== "active") {
      throw new ForbiddenError(
        "Tenant account is suspended",
        undefined,
        "user.tenant_suspended",
      );
    }

    // Inactive user — same generic message to avoid enumeration
    if (!record.isActive) {
      throw new UnauthorizedError(
        "Invalid credentials",
        undefined,
        "auth.invalid_credentials",
      );
    }

    const passwordMatches = await comparePassword(
      payload.password,
      record.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedError(
        "Invalid credentials",
        undefined,
        "auth.invalid_credentials",
      );
    }

    // Language resolution: user pref → tenant pref → (caller's fallback)
    const preferredLanguage: Language =
      (record.preferredLanguage as Language | null) ??
      (record.tenant.preferredLanguage as Language);

    // Resolve roles and permissions for JWT
    const { roleCodes, permissions } =
      await rolesRepository.resolveUserRolesAndPermissions(record.id);

    // Embed lightweight subscription claim so clients can enforce hard-lock
    // without a round-trip on every action.
    const currentSub = await subscriptionsRepository.findCurrentByTenant(record.tenantId);
    const offlineValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const subscription: SubscriptionClaim = currentSub
      ? {
          status: currentSub.status,
          trialEndsAt: currentSub.trialEndsAt?.toISOString() ?? null,
          offlineValidUntil,
        }
      : { status: "none", trialEndsAt: null, offlineValidUntil };

    const accessToken = signAccessToken({
      scope: "tenant",
      userId: record.id,
      tenantId: record.tenantId,
      roleCodes,
      permissions,
      preferredLanguage,
      subscription,
    });

    return {
      accessToken,
      user: {
        id: record.id,
        email: record.email,
        fullName: record.fullName,
        tenantId: record.tenantId,
        preferredLanguage,
      },
    };
  }

  /**
   * Heartbeat — refreshes the subscription claim inside the JWT without a
   * full re-login. Called by the desktop client every ~15 min while online.
   * Returns a fresh access token so the offline window stays current.
   */
  async heartbeat(auth: TenantAuthContext): Promise<HeartbeatResult> {
    const currentSub = await subscriptionsRepository.findCurrentByTenant(auth.tenantId);
    const offlineValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const subscription: SubscriptionClaim = currentSub
      ? {
          status: currentSub.status,
          trialEndsAt: currentSub.trialEndsAt?.toISOString() ?? null,
          offlineValidUntil,
        }
      : { status: "none", trialEndsAt: null, offlineValidUntil };

    const accessToken = signAccessToken({
      scope: "tenant",
      userId: auth.userId,
      tenantId: auth.tenantId,
      roleCodes: auth.roleCodes,
      permissions: auth.permissions,
      preferredLanguage: auth.preferredLanguage,
      branchId: auth.branchId,
      subscription,
    });

    return { accessToken, subscription };
  }
}

export const tenantAuthService = new TenantAuthService(tenantAuthRepository);