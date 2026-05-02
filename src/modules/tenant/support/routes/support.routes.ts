import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { tenantSupportController } from "../controller/support.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post("/", asyncHandler(tenantSupportController.create));
router.get("/", asyncHandler(tenantSupportController.list));
router.get("/:ticketId", asyncHandler(tenantSupportController.getById));

export { router as tenantSupportRoutes };
