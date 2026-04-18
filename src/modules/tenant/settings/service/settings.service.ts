import { TenantSettings } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { UpdateSettingsDto } from "../dto/update-settings.dto";
import {
  settingsRepository,
  SettingsRepository,
} from "../repository/settings.repository";

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async getSettings(auth: TenantAuthContext): Promise<TenantSettings> {
    const settings = await this.repository.findByTenant(auth.tenantId);
    if (!settings) {
      throw new NotFoundError(
        "Settings not found",
        undefined,
        "settings.not_found",
      );
    }
    return settings;
  }

  async updateSettings(
    auth: TenantAuthContext,
    payload: UpdateSettingsDto,
  ): Promise<TenantSettings> {
    // Ensure settings exist for this tenant before updating
    const existing = await this.repository.findByTenant(auth.tenantId);
    if (!existing) {
      throw new NotFoundError(
        "Settings not found",
        undefined,
        "settings.not_found",
      );
    }
    return this.repository.update(auth.tenantId, payload);
  }
}

export const settingsService = new SettingsService(settingsRepository);
