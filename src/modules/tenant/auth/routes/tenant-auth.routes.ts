import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { tenantAuthController } from "../controller/tenant-auth.controller";

const router = Router();

// Public
router.post("/login", asyncHandler(tenantAuthController.login));

// Protected — tenant JWT required
router.get(
  "/me",
  authMiddleware,
  tenantMiddleware,
  asyncHandler(tenantAuthController.me),
);

export const tenantAuthRoutes = router;