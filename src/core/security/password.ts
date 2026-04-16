import bcrypt from "bcrypt";
import { env } from "../config/env";
import { BadRequestError } from "../../shared/errors/bad-request-error";

const normalizePasswordInput = (plainText: string): string => {
  const normalized = plainText.trim();

  if (!normalized) {
    throw new BadRequestError("Password is required", {
      field: "password",
    });
  }

  return normalized;
};

export const hashPassword = async (plainText: string) => {
  return bcrypt.hash(normalizePasswordInput(plainText), env.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (plainText: string, hash: string) => {
  return bcrypt.compare(normalizePasswordInput(plainText), hash);
};
