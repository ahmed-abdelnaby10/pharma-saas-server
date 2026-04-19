import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { purchasingController } from "../controller/purchasing.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Purchase orders
router.get("/orders", asyncHandler(purchasingController.listOrders));
router.post("/orders", asyncHandler(purchasingController.createOrder));
router.get("/orders/:orderId", asyncHandler(purchasingController.getOrder));
router.patch("/orders/:orderId", asyncHandler(purchasingController.updateOrder));
router.delete("/orders/:orderId", asyncHandler(purchasingController.cancelOrder));

// Line items (DRAFT only)
router.post("/orders/:orderId/items", asyncHandler(purchasingController.addItem));
router.patch("/orders/:orderId/items/:poItemId", asyncHandler(purchasingController.updateItem));
router.delete("/orders/:orderId/items/:poItemId", asyncHandler(purchasingController.removeItem));

// Receive
router.post("/orders/:orderId/receive", asyncHandler(purchasingController.receiveOrder));

export const purchasingRoutes = router;
