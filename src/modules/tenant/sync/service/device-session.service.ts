import crypto from "crypto";
import { prisma } from "../../../../core/db/prisma";
import { signAccessToken } from "../../../../core/security/jwt";
import { rolesRepository } from "../../roles/repository/roles.repository";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { UnauthorizedError } from "../../../../shared/errors/unauthorized-error";
import { Language } from "../../../../shared/types/locale.types";

const TOKEN_BYTES = 32; // 256-bit token

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export interface IssueSessionResult {
  /** Plaintext token — shown ONCE. Desktop must store it securely. */
  deviceToken: string;
  expiresAt: Date;
}

export class DeviceSessionService {
  /**
   * Issue a long-lived device session token for the given device.
   * The token's expiry is set to `validUntil` from the current license envelope
   * (i.e. how many hours offline this plan allows).
   *
   * The plaintext token is returned once and never stored — only the SHA-256 hash is kept.
   */
  async issueSession(
    auth: TenantAuthContext,
    deviceId: string,
    validUntil: Date,
  ): Promise<IssueSessionResult> {
    // Verify device belongs to this tenant and is active
    const device = await prisma.device.findFirst({
      where: { id: deviceId, tenantId: auth.tenantId, isActive: true },
    });
    if (!device) {
      throw new NotFoundError("Device not found", undefined, "device.not_found");
    }

    const plaintext = generateToken();
    const tokenHash = hashToken(plaintext);

    // Invalidate any previous sessions for this device+user to avoid accumulation
    await prisma.deviceSession.updateMany({
      where: { deviceId, userId: auth.userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await prisma.deviceSession.create({
      data: {
        deviceId,
        tenantId: auth.tenantId,
        userId: auth.userId,
        tokenHash,
        expiresAt: validUntil,
      },
    });

    return { deviceToken: plaintext, expiresAt: validUntil };
  }

  /**
   * Exchange a valid device token for a fresh JWT access token.
   * Called by the desktop when its JWT has expired while offline — it comes back
   * online and calls this before trying any other API call.
   */
  async refreshFromDeviceToken(plaintext: string): Promise<{ accessToken: string }> {
    const tokenHash = hashToken(plaintext);

    const session = await prisma.deviceSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            tenantId: true,
            isActive: true,
            preferredLanguage: true,
            tenant: { select: { status: true, preferredLanguage: true } },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedError(
        "Invalid device token",
        undefined,
        "auth.device_token_invalid",
      );
    }
    if (session.isRevoked) {
      throw new UnauthorizedError(
        "Device token has been revoked",
        undefined,
        "auth.device_token_revoked",
      );
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError(
        "Device token has expired — please log in again",
        undefined,
        "auth.device_token_expired",
      );
    }
    if (!session.user.isActive) {
      throw new UnauthorizedError(
        "User account is inactive",
        undefined,
        "auth.user_inactive",
      );
    }
    if (session.user.tenant.status !== "active") {
      throw new UnauthorizedError(
        "Tenant account is suspended",
        undefined,
        "auth.tenant_suspended",
      );
    }

    const { roleCodes, permissions } =
      await rolesRepository.resolveUserRolesAndPermissions(session.user.id);

    const preferredLanguage: Language =
      (session.user.preferredLanguage as Language | null) ??
      (session.user.tenant.preferredLanguage as Language);

    const accessToken = signAccessToken({
      scope: "tenant",
      userId: session.user.id,
      tenantId: session.user.tenantId,
      roleCodes,
      permissions,
      preferredLanguage,
    });

    // Touch device lastSyncAt
    await prisma.device.update({
      where: { id: session.deviceId },
      data: { lastSyncAt: new Date() },
    }).catch(() => {/* best-effort */});

    return { accessToken };
  }

  /** Revoke all active sessions for a device. */
  async revokeAllForDevice(deviceId: string): Promise<void> {
    await prisma.deviceSession.updateMany({
      where: { deviceId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}

export const deviceSessionService = new DeviceSessionService();
