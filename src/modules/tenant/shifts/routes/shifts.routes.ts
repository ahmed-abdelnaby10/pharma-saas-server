import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { shiftsController } from "../controller/shifts.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",      permissionMiddleware(["shifts:read"]),   asyncHandler(shiftsController.list));
router.get("/active",permissionMiddleware(["shifts:read"]),   asyncHandler(shiftsController.getActive));
router.post(
  "/",
  permissionMiddleware(["shifts:manage"]),
  asyncHandler(idempotencyMiddleware),
  asyncHandler(shiftsController.open),
);
router.get("/:shiftId",  permissionMiddleware(["shifts:read"]),   asyncHandler(shiftsController.get));
router.post(
  "/:shiftId/close",
  permissionMiddleware(["shifts:manage"]),
  asyncHandler(idempotencyMiddleware),
  asyncHandler(shiftsController.close),
);

// ── Cash adjustments ─────────────────────────────────────────────────────────
router.post(
  "/:shiftId/cash-adjustments",
  permissionMiddleware(["shifts:manage"]),
  asyncHandler(shiftsController.addCashAdjustment),
);
router.get(
  "/:shiftId/cash-adjustments",
  permissionMiddleware(["shifts:read"]),
  asyncHandler(shiftsController.listCashAdjustments),
);

export const shiftsRoutes = router;
