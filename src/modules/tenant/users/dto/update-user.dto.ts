import { PreferredLanguage } from "@prisma/client";

export type UpdateUserDto = {
  fullName?: string;
  password?: string;
  branchId?: string | null;
  preferredLanguage?: PreferredLanguage | null;
};
