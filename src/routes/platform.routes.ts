import { Router } from "express";
import { platformAuthRoutes } from "../modules/platform/auth";
import { plansRoutes } from "../modules/platform/plans";
import { tenantsRoutes } from "../modules/platform/tenants";

const router = Router();

router.use("/auth", platformAuthRoutes);
router.use("/plans", plansRoutes);
router.use("/tenants", tenantsRoutes);

export const platformRoutes = router;
