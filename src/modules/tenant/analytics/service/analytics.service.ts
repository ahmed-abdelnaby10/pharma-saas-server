import { Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import {
  TopItemsQueryDto,
  RevenueTrendQueryDto,
  PaymentMethodsQueryDto,
} from "../dto/query-analytics.dto";

// ─── Top Items ────────────────────────────────────────────────────────────────

export interface TopItemRow {
  rank: number;
  inventoryItemId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  totalQuantitySold: string;
  totalRevenue: string;
  transactionCount: number;
}

export interface TopItemsResult {
  branchId: string;
  from: Date;
  to: Date;
  rows: TopItemRow[];
}

// ─── Revenue Trend ────────────────────────────────────────────────────────────

export interface TrendRow {
  period: string; // YYYY-MM-DD for day, YYYY-Www for week
  saleCount: number;
  revenue: string;
  vatAmount: string;
}

export interface RevenueTrendResult {
  branchId: string;
  from: Date;
  to: Date;
  granularity: string;
  rows: TrendRow[];
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export interface PaymentMethodRow {
  paymentMethod: string;
  transactionCount: number;
  totalAmount: string;
  percentage: string; // % of grand total, 2dp
}

export interface PaymentMethodsResult {
  branchId: string;
  from: Date;
  to: Date;
  grandTotal: string;
  rows: PaymentMethodRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns ISO week label: YYYY-Www */
function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AnalyticsService {
  async getTopItems(
    tenantId: string,
    query: TopItemsQueryDto,
    t: Translator,
  ): Promise<TopItemsResult> {
    // Fetch all sale items for completed sales in the range
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: query.from, lte: query.to },
        },
      },
      include: {
        inventoryItem: {
          include: {
            catalogItem: { select: { id: true, nameEn: true, nameAr: true } },
          },
        },
      },
    });

    // Aggregate in-memory by inventoryItemId
    const map = new Map<
      string,
      {
        inventoryItemId: string;
        catalogItemId: string;
        catalogNameEn: string;
        catalogNameAr: string;
        totalQty: Prisma.Decimal;
        totalRevenue: Prisma.Decimal;
        txCount: number;
      }
    >();

    for (const item of saleItems) {
      const key = item.inventoryItemId;
      const existing = map.get(key);
      if (existing) {
        existing.totalQty = existing.totalQty.add(item.quantity);
        existing.totalRevenue = existing.totalRevenue.add(item.subtotal);
        existing.txCount += 1;
      } else {
        map.set(key, {
          inventoryItemId: item.inventoryItemId,
          catalogItemId: item.inventoryItem.catalogItem.id,
          catalogNameEn: item.inventoryItem.catalogItem.nameEn,
          catalogNameAr: item.inventoryItem.catalogItem.nameAr,
          totalQty: item.quantity,
          totalRevenue: item.subtotal,
          txCount: 1,
        });
      }
    }

    // Sort by quantity descending, take top N
    const sorted = Array.from(map.values())
      .sort((a, b) => (b.totalQty.gt(a.totalQty) ? 1 : -1))
      .slice(0, query.limit);

    const rows: TopItemRow[] = sorted.map((r, idx) => ({
      rank: idx + 1,
      inventoryItemId: r.inventoryItemId,
      catalogItemId: r.catalogItemId,
      catalogNameEn: r.catalogNameEn,
      catalogNameAr: r.catalogNameAr,
      totalQuantitySold: r.totalQty.toString(),
      totalRevenue: r.totalRevenue.toDecimalPlaces(2).toString(),
      transactionCount: r.txCount,
    }));

    return { branchId: query.branchId, from: query.from, to: query.to, rows };
  }

  async getRevenueTrend(
    tenantId: string,
    query: RevenueTrendQueryDto,
    t: Translator,
  ): Promise<RevenueTrendResult> {
    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: query.from, lte: query.to },
      },
      select: { createdAt: true, total: true, vatAmount: true },
      orderBy: [{ createdAt: "asc" }],
    });

    type Bucket = { count: number; revenue: Prisma.Decimal; vat: Prisma.Decimal };
    const buckets = new Map<string, Bucket>();

    for (const sale of sales) {
      const key =
        query.granularity === "week"
          ? isoWeekLabel(sale.createdAt)
          : sale.createdAt.toISOString().slice(0, 10);

      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
        existing.revenue = existing.revenue.add(sale.total);
        existing.vat = existing.vat.add(sale.vatAmount);
      } else {
        buckets.set(key, { count: 1, revenue: sale.total, vat: sale.vatAmount });
      }
    }

    const rows: TrendRow[] = Array.from(buckets.entries()).map(([period, b]) => ({
      period,
      saleCount: b.count,
      revenue: b.revenue.toDecimalPlaces(2).toString(),
      vatAmount: b.vat.toDecimalPlaces(2).toString(),
    }));

    return {
      branchId: query.branchId,
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      rows,
    };
  }

  async getPaymentMethods(
    tenantId: string,
    query: PaymentMethodsQueryDto,
    t: Translator,
  ): Promise<PaymentMethodsResult> {
    const payments = await prisma.payment.groupBy({
      by: ["paymentMethod"],
      where: {
        sale: {
          tenantId,
          branchId: query.branchId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: query.from, lte: query.to },
        },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    let grandTotal = new Prisma.Decimal(0);
    for (const p of payments) {
      grandTotal = grandTotal.add(p._sum.amount ?? new Prisma.Decimal(0));
    }

    const rows: PaymentMethodRow[] = payments.map((p) => {
      const amount = p._sum.amount ?? new Prisma.Decimal(0);
      const pct = grandTotal.gt(0)
        ? amount.div(grandTotal).mul(100).toDecimalPlaces(2)
        : new Prisma.Decimal(0);
      return {
        paymentMethod: p.paymentMethod,
        transactionCount: p._count.id,
        totalAmount: amount.toDecimalPlaces(2).toString(),
        percentage: pct.toString(),
      };
    });

    // Sort by amount descending
    rows.sort((a, b) =>
      new Prisma.Decimal(b.totalAmount).gt(new Prisma.Decimal(a.totalAmount)) ? 1 : -1,
    );

    return {
      branchId: query.branchId,
      from: query.from,
      to: query.to,
      grandTotal: grandTotal.toDecimalPlaces(2).toString(),
      rows,
    };
  }
}

export const analyticsService = new AnalyticsService();
