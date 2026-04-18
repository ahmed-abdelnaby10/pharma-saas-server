import { PreferredLanguage } from "@prisma/client";

export type CreateUserDto = {
  email: string;
  password: string;
  fullName: string;
  branchId?: string;
  preferredLanguage?: PreferredLanguage;
};
