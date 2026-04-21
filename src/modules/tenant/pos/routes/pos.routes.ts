import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { posController } from "../controller/pos.controller";

const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(posController.list));
router.post("/", asyncHandler(posController.create));
router.get("/:saleId/receipt", asyncHandler(posController.receipt));
router.post("/:saleId/return", asyncHandler(posController.return));
router.get("/:saleId", asyncHandler(posController.get));

export { router as posRoutes };
