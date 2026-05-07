import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {
  AccessTokenPayload,
  AuthContext,
  isAccessTokenPayload,
  toAuthContext,
  PlatformRefreshTokenPayload,
  isPlatformRefreshTokenPayload,
  TenantRefreshTokenPayload,
  isTenantRefreshTokenPayload,
} from "../../shared/types/auth.types";
import { UnauthorizedError } from "../../shared/errors/unauthorized-error";

export const REMEMBER_ME_EXPIRES_IN = "30d";

export const signAccessToken = (
  payload: AuthContext,
  expiresIn?: string | number,
) => {
  const accessTokenPayload: AccessTokenPayload = {
    ...payload,
    tokenType: "access",
  };

  return jwt.sign(accessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: (expiresIn ?? env.JWT_ACCESS_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AuthContext => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (!isAccessTokenPayload(payload)) {
    throw new UnauthorizedError(
      "Invalid or expired token",
      undefined,
      "auth.token_invalid",
    );
  }

  return toAuthContext(payload);
};

/** Issues a long-lived refresh token carrying only the admin ID. */
export const signPlatformRefreshToken = (
  adminId: string,
  expiresIn?: string | number,
): string => {
  const payload: PlatformRefreshTokenPayload = {
    adminId,
    tokenType: "platform_refresh",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: (expiresIn ?? env.JWT_REFRESH_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Verifies a platform refresh token and returns its payload.
 * Throws `UnauthorizedError` for any failure — expired, tampered, wrong type.
 */
export const verifyPlatformRefreshToken = (
  token: string,
): PlatformRefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (!isPlatformRefreshTokenPayload(payload)) {
      throw new UnauthorizedError(
        "Invalid refresh token",
        undefined,
        "auth.token_invalid",
      );
    }

    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;

    throw new UnauthorizedError(
      "Refresh token is invalid or expired",
      undefined,
      "auth.refresh_token_invalid",
    );
  }
};

/** Issues a long-lived refresh token for a tenant user. */
export const signTenantRefreshToken = (
  userId: string,
  tenantId: string,
  expiresIn?: string | number,
): string => {
  const payload: TenantRefreshTokenPayload = {
    userId,
    tenantId,
    tokenType: "tenant_refresh",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: (expiresIn ?? env.JWT_REFRESH_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Verifies a tenant refresh token and returns its payload.
 * Throws `UnauthorizedError` for any failure — expired, tampered, wrong type.
 */
export const verifyTenantRefreshToken = (
  token: string,
): TenantRefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (!isTenantRefreshTokenPayload(payload)) {
      throw new UnauthorizedError(
        "Invalid refresh token",
        undefined,
        "auth.token_invalid",
      );
    }

    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;

    throw new UnauthorizedError(
      "Refresh token is invalid or expired",
      undefined,
      "auth.refresh_token_invalid",
    );
  }
};
