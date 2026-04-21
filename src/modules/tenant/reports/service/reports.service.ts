import { Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import {
  ShiftSummaryQueryDto,
  DailySalesQueryDto,
  StockValuationQueryDto,
} from "../dto/query-reports.dto";

// ─── Shift Summary ───────────────────────────────────────────────────────────

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  totalAmount: string;
  transactionCount: number;
}

export interface ShiftSummaryReport {
  shiftId: string;
  branchId: string;
  cashierName: string;
  openedAt: Date;
  closedAt: Date | null;
  status: string;
  openingBalance: string;
  closingBalance: string | null;
  saleCount: number;
  cancelledCount: number;
  subtotal: string;
  vatAmount: string;
  total: string;
  paymentBreakdown: PaymentMethodBreakdown[];
}

// ─── Daily Sales ─────────────────────────────────────────────────────────────

export interface DailySalesRow {
  date: string; // YYYY-MM-DD
  saleCount: number;
  subtotal: string;
  vatAmount: string;
  total: string;
}

export interface DailySalesReport {
  branchId: string;
  from: Date;
  to: Date;
  rows: DailySalesRow[];
  totals: {
    saleCount: number;
    subtotal: string;
    vatAmount: string;
    total: string;
  };
}

// ─── Stock Valuation ─────────────────────────────────────────────────────────

export interface StockValuationRow {
  inventoryItemId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  quantityOnHand: string;
  sellingPrice: string | null;
  lineValue: string | null; // quantityOnHand × sellingPrice; null if no sellingPrice
}

export interface StockValuationReport {
  branchId: string;
  totalValue: string; // sum of all lineValues where sellingPrice is set
  itemCount: number;
  rows: StockValuationRow[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ReportsService {
  async getShiftSummary(
    tenantId: string,
    query: ShiftSummaryQueryDto,
    t: Translator,
  ): Promise<ShiftSummaryReport> {
    const shift = await prisma.shift.findFirst({
      where: { id: query.shiftId, tenantId },
      include: { user: { select: { fullName: true } } },
    });
    if (!shift) {
      throw new NotFoundError(t("report.shift_not_found"));
    }

    // Aggregate completed sales for this shift
    const salesAgg = await prisma.sale.aggregate({
      where: { shiftId: query.shiftId, tenantId, status: SaleStatus.COMPLETED },
      _count: { id: true },
      _sum: { subtotal: true, vatAmount: true, total: true },
    });

    const cancelledCount = await prisma.sale.count({
      where: { shiftId: query.shiftId, tenantId, status: SaleStatus.CANCELLED },
    });

    // Payment breakdown by method for completed sales
    const payments = await prisma.payment.groupBy({
      by: ["paymentMethod"],
      where: {
        sale: { shiftId: query.shiftId, tenantId, status: SaleStatus.COMPLETED },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const paymentBreakdown: PaymentMethodBreakdown[] = payments.map((p) => ({
      paymentMethod: p.paymentMethod,
      totalAmount: (p._sum.amount ?? new Prisma.Decimal(0)).toString(),
      transactionCount: p._count.id,
    }));

    return {
      shiftId: shift.id,
      branchId: shift.branchId,
      cashierName: shift.user.fullName,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      openingBalance: shift.openingBalance.toString(),
      closingBalance: shift.closingBalance ? shift.closingBalance.toString() : null,
      saleCount: salesAgg._count.id,
      cancelledCount,
      subtotal: (salesAgg._sum.subtotal ?? new Prisma.Decimal(0)).toString(),
      vatAmount: (salesAgg._sum.vatAmount ?? new Prisma.Decimal(0)).toString(),
      total: (salesAgg._sum.total ?? new Prisma.Decimal(0)).toString(),
      paymentBreakdown,
    };
  }

  async getDailySales(
    tenantId: string,
    query: DailySalesQueryDto,
    t: Translator,
  ): Promise<DailySalesReport> {
    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: query.from, lte: query.to },
      },
      select: { createdAt: true, subtotal: true, vatAmount: true, total: true },
      orderBy: [{ createdAt: "asc" }],
    });

    // Group by date string YYYY-MM-DD in-memory
    const dayMap = new Map<
      string,
      { count: number; subtotal: Prisma.Decimal; vatAmount: Prisma.Decimal; total: Prisma.Decimal }
    >();

    for (const sale of sales) {
      const dateKey = sale.createdAt.toISOString().slice(0, 10);
      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.count += 1;
        existing.subtotal = existing.subtotal.add(sale.subtotal);
        existing.vatAmount = existing.vatAmount.add(sale.vatAmount);
        existing.total = existing.total.add(sale.total);
      } else {
        dayMap.set(dateKey, {
          count: 1,
          subtotal: sale.subtotal,
          vatAmount: sale.vatAmount,
          total: sale.total,
        });
      }
    }

    const rows: DailySalesRow[] = Array.from(dayMap.entries()).map(([date, agg]) => ({
      date,
      saleCount: agg.count,
      subtotal: agg.subtotal.toDecimalPlaces(2).toString(),
      vatAmount: agg.vatAmount.toDecimalPlaces(2).toString(),
      total: agg.total.toDecimalPlaces(2).toString(),
    }));

    // Totals
    let totalCount = 0;
    let totalSubtotal = new Prisma.Decimal(0);
    let totalVat = new Prisma.Decimal(0);
    let totalRevenue = new Prisma.Decimal(0);
    for (const row of rows) {
      totalCount += row.saleCount;
      totalSubtotal = totalSubtotal.add(new Prisma.Decimal(row.subtotal));
      totalVat = totalVat.add(new Prisma.Decimal(row.vatAmount));
      totalRevenue = totalRevenue.add(new Prisma.Decimal(row.total));
    }

    return {
      branchId: query.branchId,
      from: query.from,
      to: query.to,
      rows,
      totals: {
        saleCount: totalCount,
        subtotal: totalSubtotal.toDecimalPlaces(2).toString(),
        vatAmount: totalVat.toDecimalPlaces(2).toString(),
        total: totalRevenue.toDecimalPlaces(2).toString(),
      },
    };
  }

  async getStockValuation(
    tenantId: string,
    query: StockValuationQueryDto,
    t: Translator,
  ): Promise<StockValuationReport> {
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, branchId: query.branchId, isActive: true },
      include: {
        catalogItem: { select: { id: true, nameEn: true, nameAr: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    let totalValue = new Prisma.Decimal(0);

    const rows: StockValuationRow[] = items.map((item) => {
      let lineValue: string | null = null;
      if (item.sellingPrice !== null) {
        const lv = item.quantityOnHand.mul(item.sellingPrice).toDecimalPlaces(2);
        totalValue = totalValue.add(lv);
        lineValue = lv.toString();
      }
      return {
        inventoryItemId: item.id,
        catalogItemId: item.catalogItemId,
        catalogNameEn: item.catalogItem.nameEn,
        catalogNameAr: item.catalogItem.nameAr,
        quantityOnHand: item.quantityOnHand.toString(),
        sellingPrice: item.sellingPrice ? item.sellingPrice.toString() : null,
        lineValue,
      };
    });

    return {
      branchId: query.branchId,
      totalValue: totalValue.toDecimalPlaces(2).toString(),
      itemCount: items.length,
      rows,
    };
  }
}

export const reportsService = new ReportsService();
