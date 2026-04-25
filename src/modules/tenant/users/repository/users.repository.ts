import { PreferredLanguage } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryUsersDto } from "../dto/query-users.dto";
import { UserRecord } from "../mapper/users.mapper";

export class UsersRepository {
  async findById(tenantId: string, userId: string): Promise<UserRecord | null> {
    return prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    return prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }

  async list(tenantId: string, query: QueryUsersDto): Promise<UserRecord[]> {
    return prisma.tenantUser.findMany({
      where: {
        tenantId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      orderBy: [{ createdAt: "asc" }],
    });
  }

  async create(payload: {
    tenantId: string;
    email: string;
    passwordHash: string;
    fullName: string;
    branchId?: string;
    preferredLanguage?: PreferredLanguage;
  }): Promise<UserRecord> {
    return prisma.tenantUser.create({
      data: {
        tenantId: payload.tenantId,
        email: payload.email,
        passwordHash: payload.passwordHash,
        fullName: payload.fullName,
        ...(payload.branchId ? { branchId: payload.branchId } : {}),
        ...(payload.preferredLanguage
          ? { preferredLanguage: payload.preferredLanguage }
          : {}),
      },
    });
  }

  async update(
    tenantId: string,
    userId: string,
    payload: {
      fullName?: string;
      passwordHash?: string;
      branchId?: string | null;
      preferredLanguage?: PreferredLanguage | null;
    },
  ): Promise<UserRecord> {
    return prisma.tenantUser.update({
      where: { id: userId },
      data: {
        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
        ...(payload.passwordHash !== undefined
          ? { passwordHash: payload.passwordHash }
          : {}),
        ...(payload.branchId !== undefined ? { branchId: payload.branchId } : {}),
        ...(payload.preferredLanguage !== undefined
          ? { preferredLanguage: payload.preferredLanguage }
          : {}),
      },
    });
  }

  async countActive(tenantId: string): Promise<number> {
    return prisma.tenantUser.count({ where: { tenantId, isActive: true } });
  }

  async deactivate(tenantId: string, userId: string): Promise<UserRecord> {
    return prisma.tenantUser.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}

export const usersRepository = new UsersRepository();
