import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {
  AccessTokenPayload,
  AuthContext,
  isAccessTokenPayload,
  toAuthContext,
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
