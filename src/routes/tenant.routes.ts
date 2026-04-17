import { Router } from "express";
import { tenantAuthRoutes } from "../modules/tenant/auth";
import { branchesRoutes } from "../modules/tenant/branches";
import { usersRoutes } from "../modules/tenant/users";

const router = Router();

router.use("/auth", tenantAuthRoutes);
router.use("/branches", branchesRoutes);
router.use("/users", usersRoutes);

export const tenantRoutes = router;
