import { comparePassword } from "../../../../core/security/password";
import {
  signAccessToken,
  signPlatformRefreshToken,
  verifyPlatformRefreshToken,
} from "../../../../core/security/jwt";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { PlatformLoginDto } from "../dto/platform-login.dto";
import {
  platformAuthRepository,
  PlatformAuthRepository,
} from "../repository/platform-auth.repository";

export type PlatformLoginResult = {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
  };
};

export type PlatformRefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export class PlatformAuthService {
  constructor(private readonly repository: PlatformAuthRepository) {}

  async login(payload: PlatformLoginDto): Promise<PlatformLoginResult> {
    const admin = await this.repository.findAdminByEmail(payload.email);

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError(
        "Invalid credentials",
        undefined,
        "auth.invalid_credentials",
      );
    }

    const passwordMatches = await comparePassword(
      payload.password,
      admin.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedError(
        "Invalid credentials",
        undefined,
        "auth.invalid_credentials",
      );
    }

    const accessToken = this.buildAccessToken(admin.id);
    const refreshToken = signPlatformRefreshToken(admin.id);

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      },
    };
  }

  /**
   * Validates the incoming refresh token, re-fetches the admin to confirm the
   * account is still active, then issues a fresh access token **and** a new
   * refresh token (rotation).
   *
   * Rotation means a stolen refresh token can only be used once — the next
   * legitimate call will fail because the old token is no longer valid (it was
   * replaced). The client must store and send the latest refresh token.
   */
  async refresh(rawRefreshToken: string): Promise<PlatformRefreshResult> {
    const payload = verifyPlatformRefreshToken(rawRefreshToken);

    const admin = await this.repository.findAdminById(payload.adminId);

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError(
        "Refresh token is no longer valid",
        undefined,
        "auth.refresh_token_invalid",
      );
    }

    const accessToken = this.buildAccessToken(admin.id);
    const refreshToken = signPlatformRefreshToken(admin.id);

    return { accessToken, refreshToken };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildAccessToken(adminId: string): string {
    return signAccessToken({
      userId: adminId,
      scope: "platform",
      isPlatformAdmin: true,
      roleCodes: ["platform_admin"],
      permissions: [],
    });
  }
}

export const platformAuthService = new PlatformAuthService(
  platformAuthRepository,
);
