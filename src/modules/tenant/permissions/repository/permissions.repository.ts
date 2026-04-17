import { Permission } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

export class PermissionsRepository {
  async listAll(): Promise<Permission[]> {
    return prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
  }

  async findByCodes(codes: string[]): Promise<Permission[]> {
    return prisma.permission.findMany({
      where: { code: { in: codes } },
    });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return prisma.permission.findMany({
      where: { id: { in: ids } },
    });
  }
}

export const permissionsRepository = new PermissionsRepository();
