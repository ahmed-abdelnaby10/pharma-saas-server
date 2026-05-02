import { AppRelease } from "@prisma/client";

export type ReleaseRecord = AppRelease;

export function mapReleaseResponse(record: ReleaseRecord) {
  return {
    id: record.id,
    version: record.version,
    channel: record.channel,
    notes: record.notes,
    windowsUrl: record.windowsUrl,
    macUrl: record.macUrl,
    linuxUrl: record.linuxUrl,
    isActive: record.isActive,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
