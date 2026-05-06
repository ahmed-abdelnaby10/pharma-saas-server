import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {
  AccessTokenPayload,
  AuthContext,
  isAccessTokenPayload,
  toAuthContext,
  PlatformRefreshTokenPayload,
  isPlatformRefreshTokenPayload,
} from "../../shared/types/auth.types";
import { UnauthorizedError } from "../../shared/errors/unauthorized-error";

export const signAccessToken = (payload: AuthContext) => {
  const accessTokenPayload: AccessTokenPayload = {
    ...payload,
    tokenType: "access",
  };

  return jwt.sign(accessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
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
export const signPlatformRefreshToken = (adminId: string): string => {
  const payload: PlatformRefreshTokenPayload = {
    adminId,
    tokenType: "platform_refresh",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
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
