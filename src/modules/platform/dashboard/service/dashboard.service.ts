import {
  PlatformInvoiceStatus,
  SubscriptionStatus,
  TenantStatus,
  SupportTicketStatus,
  ActorType,
} from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

interface MonthBucket {
  month: string; // "YYYY-MM"
  value: number;
}

function buildMonthBuckets(monthsBack: number): Map<string, number> {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, 0);
  }
  return map;
}

export class DashboardService {
  async getDashboard() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      tenantStatusCounts,
      subStatusCounts,
      paidRevAgg,
      overdueAgg,
      openTicketCount,
      urgentTicketCount,
      recentTenants,
      recentPaidInvoices,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),

      // Total revenue
      prisma.platformInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.PAID },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Overdue receivables
      prisma.platformInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.OVERDUE },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Open support tickets
      prisma.supportTicket.count({
        where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } },
      }),

      // Urgent open tickets
      prisma.supportTicket.count({
        where: {
          status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
          priority: "URGENT",
        },
      }),

      // New tenants last 30 days (for growth signal)
      prisma.tenant.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),

      // Paid invoices last 6 months (for revenue trend)
      prisma.platformInvoice.findMany({
        where: { status: PlatformInvoiceStatus.PAID, paidAt: { gte: sixMonthsAgo } },
        select: { paidAt: true, amount: true },
        orderBy: { paidAt: "asc" },
      }),

      // Recent audit activity
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tenantId: true,
          actorId: true,
          actorType: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    // --- KPIs ---
    const tenantByStatus = Object.fromEntries(
      tenantStatusCounts.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<TenantStatus, number>>;

    const subByStatus = Object.fromEntries(
      subStatusCounts.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<SubscriptionStatus, number>>;

    const kpis = {
      totalTenants: Object.values(tenantByStatus).reduce<number>((a, b) => a + (b ?? 0), 0),
      activeTenants: tenantByStatus.active ?? 0,
      newTenantsLast30Days: recentTenants.length,
      newTenantsLast7Days: recentTenants.filter((t) => t.createdAt >= sevenDaysAgo).length,
      totalRevenue: (paidRevAgg._sum.amount ?? 0).toString(),
      overdueAmount: (overdueAgg._sum.amount ?? 0).toString(),
      overdueCount: overdueAgg._count._all,
      openTickets: openTicketCount,
      urgentTickets: urgentTicketCount,
    };

    // --- Subscription health ---
    const subscriptionHealth = {
      active:   subByStatus.active    ?? 0,
      trialing: subByStatus.trialing  ?? 0,
      pastDue:  subByStatus.past_due  ?? 0,
      canceled: subByStatus.canceled  ?? 0,
      expired:  subByStatus.expired   ?? 0,
    };

    // --- Revenue trend (last 6 months, grouped by paidAt month) ---
    const revBuckets = buildMonthBuckets(6);
    for (const inv of recentPaidInvoices) {
      if (!inv.paidAt) continue;
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, "0")}`;
      if (revBuckets.has(key)) {
        revBuckets.set(key, (revBuckets.get(key) ?? 0) + Number(inv.amount));
      }
    }
    const revenueTrend: MonthBucket[] = Array.from(revBuckets.entries()).map(
      ([month, value]) => ({ month, value: parseFloat(value.toFixed(2)) }),
    );

    // --- Tenant growth trend (last 6 months, grouped by createdAt month) ---
    const allRecentTenants = await prisma.tenant.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });
    const growthBuckets = buildMonthBuckets(6);
    for (const t of allRecentTenants) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (growthBuckets.has(key)) {
        growthBuckets.set(key, (growthBuckets.get(key) ?? 0) + 1);
      }
    }
    const tenantGrowthTrend: MonthBucket[] = Array.from(growthBuckets.entries()).map(
      ([month, value]) => ({ month, value }),
    );

    return {
      kpis,
      subscriptionHealth,
      revenueTrend,
      tenantGrowthTrend,
      recentActivity: recentAuditLogs,
    };
  }
}

export const dashboardService = new DashboardService();
