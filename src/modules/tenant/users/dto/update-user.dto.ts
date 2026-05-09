import { PreferredLanguage } from "@prisma/client";

export type UpdateUserDto = {
  fullName?: string;
  password?: string;
  branchId?: string | null;
  preferredLanguage?: PreferredLanguage | null;
  /** Replace the user's current role with this role code */
  role?: string | null;
};
