import { PlatformAdmin } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

export type PlatformAdminAuthRecord = Pick<
  PlatformAdmin,
  "id" | "email" | "passwordHash" | "fullName" | "isActive"
>;

export class PlatformAuthRepository {
  async findAdminByEmail(
    email: string,
  ): Promise<PlatformAdminAuthRecord | null> {
    return prisma.platformAdmin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isActive: true,
      },
    });
  }

  async findAdminById(id: string): Promise<PlatformAdminAuthRecord | null> {
    return prisma.platformAdmin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isActive: true,
      },
    });
  }
}

export const platformAuthRepository = new PlatformAuthRepository();
