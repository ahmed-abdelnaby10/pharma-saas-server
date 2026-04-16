import { Router } from "express";
import { tenantAuthRoutes } from "../modules/tenant/auth";

const router = Router();

router.use("/auth", tenantAuthRoutes);

export const tenantRoutes = router;
