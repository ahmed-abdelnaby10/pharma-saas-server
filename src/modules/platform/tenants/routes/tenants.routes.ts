import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { tenantsController } from "../controller/tenants.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.post("/", asyncHandler(tenantsController.create));
router.get("/", asyncHandler(tenantsController.list));
router.get("/:tenantId", asyncHandler(tenantsController.getById));
router.patch("/:tenantId", asyncHandler(tenantsController.update));

export const tenantsRoutes = router;
