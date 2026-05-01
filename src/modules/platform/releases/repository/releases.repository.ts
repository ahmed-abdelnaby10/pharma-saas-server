import { prisma } from "../../../../core/db/prisma";
import { CreateReleaseDto } from "../dto/create-release.dto";
import { UpdateReleaseDto } from "../dto/update-release.dto";
import { QueryReleasesDto } from "../dto/query-releases.dto";
import { ReleaseRecord } from "../mapper/releases.mapper";

export class ReleasesRepository {
  async findById(id: string): Promise<ReleaseRecord | null> {
    return prisma.appRelease.findUnique({ where: { id } });
  }

  async findLatestByChannel(channel: "STABLE" | "BETA"): Promise<ReleaseRecord | null> {
    return prisma.appRelease.findFirst({
      where: { channel, isActive: true, publishedAt: { not: null } },
      orderBy: [{ publishedAt: "desc" }],
    });
  }

  async list(query: QueryReleasesDto): Promise<ReleaseRecord[]> {
    return prisma.appRelease.findMany({
      where: {
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async create(data: CreateReleaseDto): Promise<ReleaseRecord> {
    return prisma.appRelease.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    });
  }

  async update(id: string, data: UpdateReleaseDto): Promise<ReleaseRecord> {
    return prisma.appRelease.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.appRelease.delete({ where: { id } });
  }
}

export const releasesRepository = new ReleasesRepository();
