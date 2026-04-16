import { Prisma } from "@prisma/client";

export const tenantInclude = {
  settings: true,
  subscriptions: {
    include: { plan: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.TenantInclude;

export type TenantWithRelations = Prisma.TenantGetPayload<{
  include: typeof tenantInclude;
}>;

export const mapTenantResponse = (tenant: TenantWithRelations) => {
  const latestSubscription = tenant.subscriptions[0] ?? null;

  return {
    id: tenant.id,
    nameEn: tenant.nameEn,
    nameAr: tenant.nameAr,
    preferredLanguage: tenant.preferredLanguage,
    status: tenant.status,
    isTrialActive: tenant.isTrialActive,
    trialEndsAt: tenant.trialEndsAt,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    settings: tenant.settings
      ? {
          organizationName: tenant.settings.organizationName,
          taxId: tenant.settings.taxId,
          phone: tenant.settings.phone,
          email: tenant.settings.email,
          vatPercentage: tenant.settings.vatPercentage.toString(),
          defaultLanguage: tenant.settings.defaultLanguage,
          lowStockAlerts: tenant.settings.lowStockAlerts,
          expiryAlerts: tenant.settings.expiryAlerts,
          purchaseOrderUpdates: tenant.settings.purchaseOrderUpdates,
        }
      : null,
    subscription: latestSubscription
      ? {
          id: latestSubscription.id,
          status: latestSubscription.status,
          startsAt: latestSubscription.startsAt,
          endsAt: latestSubscription.endsAt,
          trialEndsAt: latestSubscription.trialEndsAt,
          plan: {
            id: latestSubscription.plan.id,
            code: latestSubscription.plan.code,
            name: latestSubscription.plan.name,
            billingInterval: latestSubscription.plan.billingInterval,
            price: latestSubscription.plan.price.toString(),
            currency: latestSubscription.plan.currency,
            trialDays: latestSubscription.plan.trialDays,
          },
        }
      : null,
  };
};
