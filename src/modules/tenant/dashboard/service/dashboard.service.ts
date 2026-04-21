import { Prisma, SaleStatus, ShiftStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import { settingsRepository } from "../../settings/repository/settings.repository";
import { QueryDashboardDto } from "../dto/query-dashboard.dto";

export interface ActiveShiftSnapshot {
  shiftId: string;
  cashierName: string;
  openedAt: Date;
  openingBalance: string;
}

export interface DashboardData {
  branchId: string;
  generatedAt: Date;
  // Today
  todaySaleCount: number;
  todayRevenue: string;
  todayVatAmount: string;
  // Month to date
  monthSaleCount: number;
  monthRevenue: string;
  // Active shift
  activeShift: ActiveShiftSnapshot | null;
  // Operational alerts
  lowStockCount: number;
  expiringSoonCount: number; // within 30 days
}

export class DashboardService {
  async getDashboard(
    tenantId: string,
    query: QueryDashboardDto,
    t: Translator,
  ): Promise<DashboardData> {
    const now = new Date();

    // Today: midnight to end of day (UTC)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Month start (UTC)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Expiry look-ahead
    const expiryCutoff = new Date(now);
    expiryCutoff.setDate(expiryCutoff.getDate() + 30);

    const settings = await settingsRepository.findByTenant(tenantId);

    // Run all queries concurrently
    const [
      todayAgg,
      monthAgg,
      activeShift,
      inventoryItems,
      expiringCount,
    ] = await Promise.all([
      // Today's completed sales
      prisma.sale.aggregate({
        where: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _count: { id: true },
        _sum: { total: true, vatAmount: true },
      }),

      // Month-to-date completed sales
      prisma.sale.aggregate({
        where: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: monthStart },
        },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Active shift
      prisma.shift.findFirst({
        where: { tenantId, branchId: query.branchId, status: ShiftStatus.OPEN },
        include: { user: { select: { fullName: true } } },
      }),

      // Inventory items with reorderLevel for low-stock count
      settings?.lowStockAlerts
        ? prisma.inventoryItem.findMany({
            where: { tenantId, branchId: query.branchId, isActive: true, reorderLevel: { not: null } },
            select: { quantityOnHand: true, reorderLevel: true },
          })
        : Promise.resolve([]),

      // Expiring batch count
      settings?.expiryAlerts
        ? prisma.inventoryBatch.count({
            where: {
              tenantId,
              branchId: query.branchId,
              isActive: true,
              quantityOnHand: { gt: 0 },
              expiryDate: { lte: expiryCutoff },
            },
          })
        : Promise.resolve(0),
    ]);

    // Low-stock count — in-memory comparison
    const lowStockCount = (inventoryItems as Array<{ quantityOnHand: Prisma.Decimal; reorderLevel: Prisma.Decimal | null }>)
      .filter((item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel))
      .length;

    const activeShiftSnapshot: ActiveShiftSnapshot | null = activeShift
      ? {
          shiftId: activeShift.id,
          cashierName: activeShift.user.fullName,
          openedAt: activeShift.openedAt,
          openingBalance: activeShift.openingBalance.toString(),
        }
      : null;

    return {
      branchId: query.branchId,
      generatedAt: now,
      todaySaleCount: todayAgg._count.id,
      todayRevenue: (todayAgg._sum.total ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toString(),
      todayVatAmount: (todayAgg._sum.vatAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toString(),
      monthSaleCount: monthAgg._count.id,
      monthRevenue: (monthAgg._sum.total ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toString(),
      activeShift: activeShiftSnapshot,
      lowStockCount,
      expiringSoonCount: expiringCount as number,
    };
  }
}

export const dashboardService = new DashboardService();
