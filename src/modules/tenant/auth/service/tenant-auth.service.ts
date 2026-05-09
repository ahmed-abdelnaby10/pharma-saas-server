import { comparePassword } from "../../../../core/security/password";
import {
  signAccessToken,
  signTenantRefreshToken,
  verifyTenantRefreshToken,
  REMEMBER_ME_EXPIRES_IN,
} from "../../../../core/security/jwt";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { Language } from "../../../../shared/types/locale.types";
import { SubscriptionClaim, TenantAuthContext } from "../../../../shared/types/auth.types";
import { rolesRepository } from "../../roles/repository/roles.repository";
import { subscriptionsRepository } from "../../../platform/subscriptions/repository/subscriptions.repository";
import { TenantLoginDto } from "../dto/tenant-login.dto";
import {
  tenantAuthRepository,
  TenantAuthRepository,
  TenantMeRecord,
} from "../repository/tenant-auth.repository";

export type TenantLoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    tenantId: string;
    preferredLanguage: Language;
  };
};

export type TenantRefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export type HeartbeatResult = {
  accessToken: string;
  subscription: SubscriptionClaim;
};

export type MeResult = {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    preferredLanguage: string | null;
    isActive: boolean;
    branchId: string | null;
    memberSince: string;
  };
  tenant: {
    id: string;
    name: string; // localized: nameEn or nameAr
    nameEn: string;
    nameAr: string;
    slug: string;
    status: string;
    isTrialActive: boolean;
    trialEndsAt: string | null;
    memberSince: string;
  };
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    trialEndsAt: string | null;
    plan: {
      id: string;
      code: string;
      name: string;
      billingInterval: string;
      price: string;
      currency: string;
    };
  } | null;
  accountStatus: "active" | "trialing" | "past_due" | "inactive" | "suspended";
};

function buildMeResult(record: TenantMeRecord, lang: Language): MeResult {
  const sub = record.tenant.subscriptions[0] ?? null;

  // Derive a single "accountStatus" the client can display directly
  let accountStatus: MeResult["accountStatus"];
  if (record.tenant.status !== "active") {
    accountStatus = "suspended";
  } else if (!record.isActive) {
    accountStatus = "inactive";
  } else if (sub?.status === "trialing") {
    accountStatus = "trialing";
  } else if (sub?.status === "past_due") {
    accountStatus = "past_due";
  } else {
    accountStatus = "active";
  }

  return {
    user: {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      phone: record.phone ?? null,
      preferredLanguage: record.preferredLanguage ?? null,
      isActive: record.isActive,
      branchId: record.branchId ?? null,
      memberSince: record.createdAt.toISOString(),
    },
    tenant: {
      id: record.tenant.id,
      name: lang === "ar" ? record.tenant.nameAr : record.tenant.nameEn,
      nameEn: record.tenant.nameEn,
      nameAr: record.tenant.nameAr,
      slug: record.tenant.slug,
      status: record.tenant.status,
      isTrialActive: record.tenant.isTrialActive,
      trialEndsAt: record.tenant.trialEndsAt?.toISOString() ?? null,
      memberSince: record.tenant.createdAt.toISOString(),
    },
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          startsAt: sub.startsAt.toISOString(),
          endsAt: sub.endsAt?.toISOString() ?? null,
          trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
          plan: {
            id: sub.plan.id,
            code: sub.plan.code,
            name: sub.plan.name,
            billingInterval: sub.plan.billingInterval,
            price: sub.plan.price.toString(),
            currency: sub.plan.currency,
          },
        }
      : null,
    accountStatus,
  };
}

export class TenantAuthService {
  constructor(private readonly repository: TenantAuthRepository) {}

  async login(payload: TenantLoginDto): Promise<TenantLoginResult> {
    const record = await this.repository.findUserBySlugAndEmail(
      payload.slug,
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

    const tokenExpiry = payload.rememberMe ? REMEMBER_ME_EXPIRES_IN : undefined;

    const accessToken = signAccessToken(
      {
        scope: "tenant",
        userId: record.id,
        tenantId: record.tenantId,
        roleCodes,
        permissions,
        preferredLanguage,
        subscription,
      },
      tokenExpiry,
    );

    const refreshToken = signTenantRefreshToken(
      record.id,
      record.tenantId,
      tokenExpiry,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: record.id,
        email: record.email,
        fullName: record.fullName,
        phone: record.phone ?? null,
        tenantId: record.tenantId,
        preferredLanguage,
      },
    };
  }

  /**
   * POST /refresh — validates the incoming refresh token, re-fetches the user
   * to confirm the account is still active, then issues a fresh access token
   * and a new refresh token (rotation).
   */
  async refresh(rawRefreshToken: string): Promise<TenantRefreshResult> {
    const tokenPayload = verifyTenantRefreshToken(rawRefreshToken);

    const user = await this.repository.findUserById(
      tokenPayload.userId,
      tokenPayload.tenantId,
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedError(
        "Refresh token is no longer valid",
        undefined,
        "auth.refresh_token_invalid",
      );
    }

    if (user.tenant.status !== "active") {
      throw new ForbiddenError(
        "Tenant account is suspended",
        undefined,
        "user.tenant_suspended",
      );
    }

    const { roleCodes, permissions } =
      await rolesRepository.resolveUserRolesAndPermissions(user.id);

    const preferredLanguage: Language =
      (user.preferredLanguage as Language | null) ??
      (user.tenant.preferredLanguage as Language);

    const currentSub = await subscriptionsRepository.findCurrentByTenant(user.tenantId);
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
      userId: user.id,
      tenantId: user.tenantId,
      roleCodes,
      permissions,
      preferredLanguage,
      subscription,
    });

    const refreshToken = signTenantRefreshToken(user.id, user.tenantId);

    return { accessToken, refreshToken };
  }

  /**
   * GET /me — returns the full profile of the currently logged-in tenant user.
   * One DB round-trip: TenantUser → Tenant + current Subscription + Plan.
   */
  async getMe(auth: TenantAuthContext, lang: Language): Promise<MeResult> {
    const record = await this.repository.findMeData(auth.userId, auth.tenantId);
    if (!record) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    return buildMeResult(record, lang);
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