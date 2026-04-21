import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import { settingsRepository } from "../../settings/repository/settings.repository";
import { QueryLowStockDto, QueryExpiringDto } from "../dto/query-alerts.dto";

export interface LowStockAlert {
  inventoryItemId: string;
  branchId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  quantityOnHand: string;
  reorderLevel: string;
}

export interface ExpiryAlert {
  batchId: string;
  inventoryItemId: string;
  branchId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  batchNumber: string;
  expiryDate: Date;
  quantityOnHand: string;
  daysUntilExpiry: number;
}

export class AlertsService {
  async getLowStockAlerts(
    tenantId: string,
    query: QueryLowStockDto,
    t: Translator,
  ): Promise<LowStockAlert[]> {
    const settings = await settingsRepository.findByTenant(tenantId);
    if (!settings?.lowStockAlerts) {
      return [];
    }

    // Fetch all active items that have a reorderLevel set
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        isActive: true,
        reorderLevel: { not: null },
      },
      include: {
        catalogItem: { select: { nameEn: true, nameAr: true } },
      },
    });

    // Filter in-memory: quantityOnHand <= reorderLevel
    return items
      .filter((item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel))
      .map((item) => ({
        inventoryItemId: item.id,
        branchId: item.branchId,
        catalogItemId: item.catalogItemId,
        catalogNameEn: item.catalogItem.nameEn,
        catalogNameAr: item.catalogItem.nameAr,
        quantityOnHand: item.quantityOnHand.toString(),
        reorderLevel: item.reorderLevel!.toString(),
      }));
  }

  async getExpiringAlerts(
    tenantId: string,
    query: QueryExpiringDto,
    t: Translator,
  ): Promise<ExpiryAlert[]> {
    const settings = await settingsRepository.findByTenant(tenantId);
    if (!settings?.expiryAlerts) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + query.days);
    const now = new Date();

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        isActive: true,
        quantityOnHand: { gt: 0 },
        expiryDate: { lte: cutoff },
      },
      include: {
        inventoryItem: {
          include: {
            catalogItem: { select: { nameEn: true, nameAr: true, id: true } },
          },
        },
      },
      orderBy: [{ expiryDate: "asc" }],
    });

    return batches.map((batch) => {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / msPerDay,
      );
      return {
        batchId: batch.id,
        inventoryItemId: batch.inventoryItemId,
        branchId: batch.branchId,
        catalogItemId: batch.inventoryItem.catalogItem.id,
        catalogNameEn: batch.inventoryItem.catalogItem.nameEn,
        catalogNameAr: batch.inventoryItem.catalogItem.nameAr,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityOnHand: batch.quantityOnHand.toString(),
        daysUntilExpiry,
      };
    });
  }
}

export const alertsService = new AlertsService();
