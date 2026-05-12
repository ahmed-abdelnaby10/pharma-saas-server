import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { posController } from "../controller/pos.controller";

const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/", permissionMiddleware(["sales:read"]), asyncHandler(posController.list));
router.post(
  "/",
  permissionMiddleware(["sales:create"]),
  asyncHandler(idempotencyMiddleware),
  asyncHandler(posController.create),
);
router.get("/:saleId/receipt", permissionMiddleware(["sales:read"]),   asyncHandler(posController.receipt));
router.post("/:saleId/return", permissionMiddleware(["sales:return"]), asyncHandler(posController.return));
router.get("/:saleId",         permissionMiddleware(["sales:read"]),   asyncHandler(posController.get));

export { router as posRoutes };
