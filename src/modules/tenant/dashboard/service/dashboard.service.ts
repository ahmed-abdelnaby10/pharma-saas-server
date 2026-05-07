import { Prisma, SaleStatus, ShiftStatus, NotificationType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import { settingsRepository } from "../../settings/repository/settings.repository";
import { QueryDashboardDto } from "../dto/query-dashboard.dto";

// ── Snapshot types ──────────────────────────────────────────────────────────

export interface ActiveShiftSnapshot {
  shiftId: string;
  cashierName: string;
  openedAt: Date;
  openingBalance: string;
}

export interface SalesTrendPoint {
  date: string;      // "2026-05-05"
  dayLabel: string;  // "Mon"
  revenue: string;
}

export type ActivityType =
  | "sale"
  | "low_stock"
  | "expiry_alert"
  | "purchase_order_received"
  | "general";

export interface ActivityItem {
  type: ActivityType;
  title: string;
  body: string;
  amount: string | null;
  createdAt: Date;
}

export interface TopProduct {
  inventoryItemId: string;
  nameEn: string;
  nameAr: string;
  category: string | null;
  salesCount: number;          // units sold this month
  revenue: string;             // total subtotal this month
  trendPercent: number | null; // ((this - last) / last) * 100; null if no prior-month data
}

export interface DashboardData {
  branchId: string;
  generatedAt: Date;
  // ── Today ─────────────────────────────────────────────────────────────────
  todaySaleCount: number;
  todayRevenue: string;
  todayVatAmount: string;
  todayProfit: string;
  todayRevenueChangePercent: number | null; // vs yesterday; null when no yesterday data
  todayProfitChangePercent: number | null;
  // ── Month to date ─────────────────────────────────────────────────────────
  monthSaleCount: number;
  monthRevenue: string;
  // ── Active shift ──────────────────────────────────────────────────────────
  activeShift: ActiveShiftSnapshot | null;
  // ── Operational alerts ────────────────────────────────────────────────────
  lowStockCount: number;
  expiringSoonCount: number;      // within 30 days
  // ── Chart ─────────────────────────────────────────────────────────────────
  salesTrend: SalesTrendPoint[];  // last 7 days, oldest → newest
  // ── Activity feed ─────────────────────────────────────────────────────────
  recentActivity: ActivityItem[]; // up to 10 items, newest first
  // ── Top products ──────────────────────────────────────────────────────────
  topProducts: TopProduct[];      // top 10 by revenue this month
}

// ── Raw-query row shapes ────────────────────────────────────────────────────

interface ProfitRow  { profit: Prisma.Decimal }
interface TrendRow   { day: Date; revenue: Prisma.Decimal; sale_count: bigint }
interface TopProdRow {
  inventory_item_id: string;
  name_en: string;
  name_ar: string;
  category: string | null;
  sales_qty: Prisma.Decimal;
  revenue: Prisma.Decimal;
  last_revenue: Prisma.Decimal | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Returns ((current - previous) / previous) * 100 rounded to 1 dp, or null. */
function pctChange(current: Prisma.Decimal, previous: Prisma.Decimal): number | null {
  if (previous.isZero()) return null;
  return current.minus(previous).div(previous).times(100).toDecimalPlaces(1).toNumber();
}

function notifTypeToActivity(type: NotificationType): ActivityType {
  switch (type) {
    case NotificationType.LOW_STOCK:               return "low_stock";
    case NotificationType.EXPIRY_ALERT:            return "expiry_alert";
    case NotificationType.PURCHASE_ORDER_RECEIVED: return "purchase_order_received";
    default:                                       return "general";
  }
}

// ── Service ─────────────────────────────────────────────────────────────────

export class DashboardService {
  async getDashboard(
    tenantId: string,
    userId: string,
    query: QueryDashboardDto,
    t: Translator,
  ): Promise<DashboardData> {
    const now = new Date();

    // ── Time windows ──────────────────────────────────────────────────────────
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(todayStart.getTime() - 1); // 1ms before midnight

    const monthStart     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6); // 7 days incl. today

    const expiryCutoff = new Date(now);
    expiryCutoff.setDate(expiryCutoff.getDate() + 30);

    const settings = await settingsRepository.findByTenant(tenantId);

    // ── All queries in parallel ──────────────────────────────────────────────
    const [
      todayAgg,
      yesterdayAgg,
      monthAgg,
      activeShift,
      inventoryItems,
      expiringCount,
      todayProfitRows,
      yesterdayProfitRows,
      trendRows,
      recentSales,
      recentNotifications,
      topProductRows,
    ] = await Promise.all([

      // 1. Today's completed sales aggregate
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

      // 2. Yesterday's completed sales aggregate (for % change calculation)
      prisma.sale.aggregate({
        where: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
        _count: { id: true },
        _sum: { total: true },
      }),

      // 3. Month-to-date completed sales
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

      // 4. Active shift
      prisma.shift.findFirst({
        where: { tenantId, branchId: query.branchId, status: ShiftStatus.OPEN },
        include: { user: { select: { fullName: true } } },
      }),

      // 5. Inventory items for low-stock count (skipped when alerts off)
      settings?.lowStockAlerts
        ? prisma.inventoryItem.findMany({
            where: {
              tenantId,
              branchId: query.branchId,
              isActive: true,
              reorderLevel: { not: null },
            },
            select: { quantityOnHand: true, reorderLevel: true },
          })
        : Promise.resolve([]),

      // 6. Expiring batch count (skipped when alerts off)
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

      // 7. Today's profit — uses latest active batch cost per item as the cost proxy.
      //    DISTINCT ON picks the most recent costPrice per inventoryItemId.
      prisma.$queryRaw<ProfitRow[]>`
        WITH latest_costs AS (
          SELECT DISTINCT ON ("inventoryItemId")
            "inventoryItemId",
            "costPrice"
          FROM "InventoryBatch"
          WHERE "isActive" = true AND "costPrice" IS NOT NULL
          ORDER BY "inventoryItemId", "createdAt" DESC
        )
        SELECT COALESCE(
          SUM(si.subtotal - si.quantity * COALESCE(lc."costPrice", 0)),
          0
        ) AS profit
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        LEFT JOIN latest_costs lc ON lc."inventoryItemId" = si."inventoryItemId"
        WHERE s."tenantId"  = ${tenantId}
          AND s."branchId"  = ${query.branchId}
          AND s.status      = 'COMPLETED'
          AND s."createdAt" >= ${todayStart}
          AND s."createdAt" <= ${todayEnd}
      `,

      // 8. Yesterday's profit (same query, different window)
      prisma.$queryRaw<ProfitRow[]>`
        WITH latest_costs AS (
          SELECT DISTINCT ON ("inventoryItemId")
            "inventoryItemId",
            "costPrice"
          FROM "InventoryBatch"
          WHERE "isActive" = true AND "costPrice" IS NOT NULL
          ORDER BY "inventoryItemId", "createdAt" DESC
        )
        SELECT COALESCE(
          SUM(si.subtotal - si.quantity * COALESCE(lc."costPrice", 0)),
          0
        ) AS profit
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        LEFT JOIN latest_costs lc ON lc."inventoryItemId" = si."inventoryItemId"
        WHERE s."tenantId"  = ${tenantId}
          AND s."branchId"  = ${query.branchId}
          AND s.status      = 'COMPLETED'
          AND s."createdAt" >= ${yesterdayStart}
          AND s."createdAt" <= ${yesterdayEnd}
      `,

      // 9. Sales trend — last 7 days grouped by UTC day
      prisma.$queryRaw<TrendRow[]>`
        SELECT
          date_trunc('day', "createdAt") AS day,
          COALESCE(SUM(total), 0)        AS revenue,
          COUNT(*)                       AS sale_count
        FROM "Sale"
        WHERE "tenantId"  = ${tenantId}
          AND "branchId"  = ${query.branchId}
          AND status      = 'COMPLETED'
          AND "createdAt" >= ${sevenDaysAgo}
          AND "createdAt" <= ${todayEnd}
        GROUP BY day
        ORDER BY day ASC
      `,

      // 10. Last 10 completed sales for activity feed
      prisma.sale.findMany({
        where: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
        },
        select: { id: true, saleNumber: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 11. Last 10 notifications for this user (for activity feed)
      prisma.notification.findMany({
        where: {
          tenantId,
          userId,
          type: {
            in: [
              NotificationType.LOW_STOCK,
              NotificationType.EXPIRY_ALERT,
              NotificationType.PURCHASE_ORDER_RECEIVED,
              NotificationType.GENERAL,
            ],
          },
        },
        select: { id: true, type: true, title: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 12. Top 10 products by revenue this month, with last-month comparison for trend
      prisma.$queryRaw<TopProdRow[]>`
        WITH this_month AS (
          SELECT
            si."inventoryItemId",
            SUM(si.quantity) AS sales_qty,
            SUM(si.subtotal) AS revenue
          FROM "SaleItem" si
          JOIN "Sale" s ON si."saleId" = s.id
          WHERE s."tenantId"  = ${tenantId}
            AND s."branchId"  = ${query.branchId}
            AND s.status      = 'COMPLETED'
            AND s."createdAt" >= ${monthStart}
          GROUP BY si."inventoryItemId"
        ),
        last_month AS (
          SELECT
            si."inventoryItemId",
            SUM(si.subtotal) AS revenue
          FROM "SaleItem" si
          JOIN "Sale" s ON si."saleId" = s.id
          WHERE s."tenantId"  = ${tenantId}
            AND s."branchId"  = ${query.branchId}
            AND s.status      = 'COMPLETED'
            AND s."createdAt" >= ${lastMonthStart}
            AND s."createdAt" <  ${monthStart}
          GROUP BY si."inventoryItemId"
        )
        SELECT
          tm."inventoryItemId"  AS inventory_item_id,
          ci."nameEn"           AS name_en,
          ci."nameAr"           AS name_ar,
          ci.category,
          tm.sales_qty,
          tm.revenue,
          lm.revenue            AS last_revenue
        FROM this_month tm
        JOIN "InventoryItem" ii ON ii.id = tm."inventoryItemId"
        JOIN "CatalogItem"   ci ON ci.id = ii."catalogItemId"
        LEFT JOIN last_month lm ON lm."inventoryItemId" = tm."inventoryItemId"
        ORDER BY tm.revenue DESC
        LIMIT 10
      `,
    ]);

    // ── Post-processing ────────────────────────────────────────────────────────

    // Low-stock: in-memory column-vs-column comparison
    const lowStockCount = (
      inventoryItems as Array<{
        quantityOnHand: Prisma.Decimal;
        reorderLevel: Prisma.Decimal | null;
      }>
    ).filter(
      (item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel),
    ).length;

    // Active shift snapshot
    const activeShiftSnapshot: ActiveShiftSnapshot | null = activeShift
      ? {
          shiftId: activeShift.id,
          cashierName: activeShift.user.fullName,
          openedAt: activeShift.openedAt,
          openingBalance: activeShift.openingBalance.toString(),
        }
      : null;

    // Revenue / profit Decimal values
    const todayRev     = todayAgg._sum.total     ?? new Prisma.Decimal(0);
    const yesterdayRev = yesterdayAgg._sum.total ?? new Prisma.Decimal(0);
    const todayPft     = new Prisma.Decimal(todayProfitRows[0]?.profit     ?? 0);
    const yesterdayPft = new Prisma.Decimal(yesterdayProfitRows[0]?.profit ?? 0);

    // Sales trend — fill in days with 0 revenue when no sales that day
    const trendMap = new Map<string, string>();
    for (const row of trendRows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      trendMap.set(key, new Prisma.Decimal(row.revenue).toDecimalPlaces(2).toString());
    }
    const salesTrend: SalesTrendPoint[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      return {
        date: dateStr,
        dayLabel: DAY_LABELS[d.getUTCDay()],
        revenue: trendMap.get(dateStr) ?? "0.00",
      };
    });

    // Recent activity — merge completed sales + notifications, sort newest first
    const salesActivity: ActivityItem[] = recentSales.map((s) => ({
      type: "sale" as ActivityType,
      title: `Sale completed - Invoice #${s.saleNumber}`,
      body: "",
      amount: new Prisma.Decimal(s.total).toDecimalPlaces(2).toString(),
      createdAt: s.createdAt,
    }));

    const notifActivity: ActivityItem[] = recentNotifications.map((n) => ({
      type: notifTypeToActivity(n.type),
      title: n.title,
      body: n.body,
      amount: null,
      createdAt: n.createdAt,
    }));

    const recentActivity = [...salesActivity, ...notifActivity]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Top products with trend
    const topProducts: TopProduct[] = topProductRows.map((row) => {
      const thisRev = new Prisma.Decimal(row.revenue);
      const lastRev = row.last_revenue ? new Prisma.Decimal(row.last_revenue) : null;
      return {
        inventoryItemId: row.inventory_item_id,
        nameEn:          row.name_en,
        nameAr:          row.name_ar,
        category:        row.category,
        salesCount:      Number(row.sales_qty),
        revenue:         thisRev.toDecimalPlaces(2).toString(),
        trendPercent:    lastRev ? pctChange(thisRev, lastRev) : null,
      };
    });

    return {
      branchId:    query.branchId,
      generatedAt: now,

      todaySaleCount:            todayAgg._count.id,
      todayRevenue:              todayRev.toDecimalPlaces(2).toString(),
      todayVatAmount:            (todayAgg._sum.vatAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toString(),
      todayProfit:               todayPft.toDecimalPlaces(2).toString(),
      todayRevenueChangePercent: pctChange(todayRev, yesterdayRev),
      todayProfitChangePercent:  pctChange(todayPft, yesterdayPft),

      monthSaleCount: monthAgg._count.id,
      monthRevenue:   (monthAgg._sum.total ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toString(),

      activeShift: activeShiftSnapshot,

      lowStockCount,
      expiringSoonCount: expiringCount as number,

      salesTrend,
      recentActivity,
      topProducts,
    };
  }
}

export const dashboardService = new DashboardService();
