import { comparePassword } from "../../../../core/security/password";
import { signAccessToken } from "../../../../core/security/jwt";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { PlatformLoginDto } from "../dto/platform-login.dto";
import {
  platformAuthRepository,
  PlatformAuthRepository,
} from "../repository/platform-auth.repository";

export type PlatformLoginResult = {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
  };
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

    const accessToken = signAccessToken({
      userId: admin.id,
      scope: "platform",
      isPlatformAdmin: true,
      roleCodes: ["platform_admin"],
      permissions: [],
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      },
    };
  }
}

export const platformAuthService = new PlatformAuthService(
  platformAuthRepository,
);
