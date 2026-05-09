import { PreferredLanguage } from "@prisma/client";

export type CreateUserDto = {
  email: string;
  password: string;
  fullName: string;
  branchId?: string;
  preferredLanguage?: PreferredLanguage;
  /** Optional role code to assign immediately on creation (e.g. "pharmacist") */
  role?: string;
};
