import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { UpdateSettingsDto } from "../dto/update-settings.dto";
import {
  settingsRepository,
  SettingsRepository,
  SettingsRecord,
} from "../repository/settings.repository";

/** Flattened response that merges TenantSettings fields with Tenant nameEn/nameAr */
export type SettingsResponse = Omit<SettingsRecord, "tenant"> & {
  nameEn: string;
  nameAr: string;
};

function mapSettings(record: SettingsRecord): SettingsResponse {
  const { tenant, ...rest } = record;
  return {
    ...rest,
    nameEn: tenant.nameEn,
    nameAr: tenant.nameAr,
  };
}

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async getSettings(auth: TenantAuthContext): Promise<SettingsResponse> {
    const settings = await this.repository.findByTenant(auth.tenantId);
    if (!settings) {
      throw new NotFoundError("Settings not found", undefined, "settings.not_found");
    }
    return mapSettings(settings);
  }

  async updateSettings(
    auth: TenantAuthContext,
    payload: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    const existing = await this.repository.findByTenant(auth.tenantId);
    if (!existing) {
      throw new NotFoundError("Settings not found", undefined, "settings.not_found");
    }
    const updated = await this.repository.update(auth.tenantId, payload);
    return mapSettings(updated);
  }
}

export const settingsService = new SettingsService(settingsRepository);
