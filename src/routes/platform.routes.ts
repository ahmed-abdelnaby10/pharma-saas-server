import { Router } from "express";
import { platformAuthRoutes } from "../modules/platform/auth";
import { plansRoutes } from "../modules/platform/plans";
import { subscriptionsRoutes } from "../modules/platform/subscriptions";
import { tenantsRoutes } from "../modules/platform/tenants";
import { platformCatalogRoutes } from "../modules/platform/catalog";
import { invoicesRoutes } from "../modules/platform/invoices";
import { platformSupportRoutes } from "../modules/platform/support";
import { metricsRoutes } from "../modules/platform/metrics";
import { auditLogsRoutes } from "../modules/platform/audit-logs";

const router = Router();

router.use("/auth", platformAuthRoutes);
router.use("/plans", plansRoutes);
router.use("/tenants", tenantsRoutes);
router.use("/tenants/:tenantId/subscriptions", subscriptionsRoutes);
router.use("/catalog", platformCatalogRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/support/tickets", platformSupportRoutes);
router.use("/metrics", metricsRoutes);
router.use("/audit", auditLogsRoutes);

export const platformRoutes = router;
