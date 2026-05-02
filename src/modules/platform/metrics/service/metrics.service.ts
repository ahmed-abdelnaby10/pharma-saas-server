import {
  TenantStatus,
  SubscriptionStatus,
  PlatformInvoiceStatus,
  SupportTicketStatus,
} from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

export class MetricsService {
  async getOverview() {
    const [
      tenantCounts,
      subscriptionCounts,
      invoiceAgg,
      paidAgg,
      overdueAgg,
      supportCounts,
    ] = await Promise.all([
      // Tenant counts by status
      prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),

      // Subscription counts by status
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),

      // Invoice totals for ISSUED + OVERDUE (outstanding)
      prisma.platformInvoice.aggregate({
        where: { status: { in: [PlatformInvoiceStatus.ISSUED, PlatformInvoiceStatus.OVERDUE] } },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Total revenue (PAID invoices)
      prisma.platformInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.PAID },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Overdue invoice total
      prisma.platformInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.OVERDUE },
        _sum: { amount: true },
      }),

      // Support ticket counts by status
      prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const tenantByStatus = Object.fromEntries(
      tenantCounts.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<TenantStatus, number>>;

    const subByStatus = Object.fromEntries(
      subscriptionCounts.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<SubscriptionStatus, number>>;

    const supportByStatus = Object.fromEntries(
      supportCounts.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<SupportTicketStatus, number>>;

    return {
      tenants: {
        total: Object.values(tenantByStatus).reduce<number>((a, b) => a + (b ?? 0), 0),
        active: tenantByStatus.active ?? 0,
        suspended: tenantByStatus.suspended ?? 0,
        inactive: tenantByStatus.inactive ?? 0,
      },
      subscriptions: {
        total: Object.values(subByStatus).reduce<number>((a, b) => a + (b ?? 0), 0),
        active: subByStatus.active ?? 0,
        trialing: subByStatus.trialing ?? 0,
        pastDue: subByStatus.past_due ?? 0,
        canceled: subByStatus.canceled ?? 0,
        expired: subByStatus.expired ?? 0,
      },
      invoices: {
        totalPaid: paidAgg._count._all,
        totalRevenue: (paidAgg._sum.amount ?? 0).toString(),
        outstanding: (invoiceAgg._sum.amount ?? 0).toString(),
        overdueAmount: (overdueAgg._sum.amount ?? 0).toString(),
      },
      support: {
        open: supportByStatus.OPEN ?? 0,
        inProgress: supportByStatus.IN_PROGRESS ?? 0,
        resolved: supportByStatus.RESOLVED ?? 0,
        closed: supportByStatus.CLOSED ?? 0,
      },
    };
  }

  async getTenantMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [byStatus, newLast30Days, newLast7Days] = await Promise.all([
      prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.tenant.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<TenantStatus, number>>;

    return {
      byStatus: {
        active: statusMap.active ?? 0,
        suspended: statusMap.suspended ?? 0,
        inactive: statusMap.inactive ?? 0,
      },
      newLast30Days,
      newLast7Days,
    };
  }

  async getRevenueMetrics() {
    const [byStatus, paidAgg] = await Promise.all([
      prisma.platformInvoice.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.platformInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    const statusSummary = Object.fromEntries(
      byStatus.map((r) => [
        r.status,
        { count: r._count._all, total: (r._sum.amount ?? 0).toString() },
      ]),
    );

    const outstandingStatuses: string[] = [PlatformInvoiceStatus.ISSUED, PlatformInvoiceStatus.OVERDUE];
    const outstandingTotal = byStatus
      .filter((r) => outstandingStatuses.includes(r.status))
      .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

    return {
      byStatus: statusSummary,
      totalRevenue: (paidAgg._sum.amount ?? 0).toString(),
      outstandingAmount: outstandingTotal.toFixed(2),
    };
  }
}

export const metricsService = new MetricsService();
