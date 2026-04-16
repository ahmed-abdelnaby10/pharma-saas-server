import { comparePassword } from "../../../../core/security/password";
import { signAccessToken } from "../../../../core/security/jwt";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { Language } from "../../../../shared/types/locale.types";
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

    const accessToken = signAccessToken({
      scope: "tenant",
      userId: record.id,
      tenantId: record.tenantId,
      roleCodes: [],
      permissions: [],
      preferredLanguage,
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
}

export const tenantAuthService = new TenantAuthService(tenantAuthRepository);