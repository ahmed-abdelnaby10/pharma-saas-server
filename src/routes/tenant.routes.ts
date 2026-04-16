import { Router } from "express";
import { tenantAuthRoutes } from "../modules/tenant/auth";
import { branchesRoutes } from "../modules/tenant/branches";

const router = Router();

router.use("/auth", tenantAuthRoutes);
router.use("/branches", branchesRoutes);

export const tenantRoutes = router;
