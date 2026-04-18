import { Router } from "express";
import { platformAuthRoutes } from "../modules/platform/auth";
import { plansRoutes } from "../modules/platform/plans";
import { subscriptionsRoutes } from "../modules/platform/subscriptions";
import { tenantsRoutes } from "../modules/platform/tenants";
import { platformCatalogRoutes } from "../modules/platform/catalog";

const router = Router();

router.use("/auth", platformAuthRoutes);
router.use("/plans", plansRoutes);
router.use("/tenants", tenantsRoutes);
router.use("/tenants/:tenantId/subscriptions", subscriptionsRoutes);
router.use("/catalog", platformCatalogRoutes);

export const platformRoutes = router;
