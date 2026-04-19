import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { inventoryBatchesController } from "../controller/inventory-batches.controller";

// mergeParams: true so :itemId from the parent route is available
const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(inventoryBatchesController.list));
router.post("/", asyncHandler(inventoryBatchesController.create));
router.get("/:batchId", asyncHandler(inventoryBatchesController.get));
router.patch("/:batchId", asyncHandler(inventoryBatchesController.update));
router.delete("/:batchId", asyncHandler(inventoryBatchesController.deactivate));

export const inventoryBatchesRoutes = router;
