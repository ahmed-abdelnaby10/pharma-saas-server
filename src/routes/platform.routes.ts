import { Router } from "express";
import { platformAuthRoutes } from "../modules/platform/auth";
import { plansRoutes } from "../modules/platform/plans";

const router = Router();

router.use("/auth", platformAuthRoutes);
router.use("/plans", plansRoutes);

export const platformRoutes = router;
