import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { purchasingController } from "../controller/purchasing.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Purchase orders
router.get("/orders",     permissionMiddleware(["purchasing:read"]),   asyncHandler(purchasingController.listOrders));
router.post(
  "/orders",
  permissionMiddleware(["purchasing:create"]),
  asyncHandler(idempotencyMiddleware),
  asyncHandler(purchasingController.createOrder),
);
router.get("/orders/:orderId",    permissionMiddleware(["purchasing:read"]),   asyncHandler(purchasingController.getOrder));
router.patch("/orders/:orderId",  permissionMiddleware(["purchasing:update"]), asyncHandler(purchasingController.updateOrder));
router.delete("/orders/:orderId", permissionMiddleware(["purchasing:update"]), asyncHandler(purchasingController.cancelOrder));

// Line items (DRAFT only)
router.post("/orders/:orderId/items",              permissionMiddleware(["purchasing:create"]), asyncHandler(purchasingController.addItem));
router.patch("/orders/:orderId/items/:poItemId",   permissionMiddleware(["purchasing:update"]), asyncHandler(purchasingController.updateItem));
router.delete("/orders/:orderId/items/:poItemId",  permissionMiddleware(["purchasing:update"]), asyncHandler(purchasingController.removeItem));

// Receive
router.post("/orders/:orderId/receive", permissionMiddleware(["purchasing:update"]), asyncHandler(purchasingController.receiveOrder));

export const purchasingRoutes = router;
