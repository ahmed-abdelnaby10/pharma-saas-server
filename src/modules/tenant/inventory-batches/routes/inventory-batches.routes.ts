import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { inventoryBatchesController } from "../controller/inventory-batches.controller";

// mergeParams: true so :itemId from the parent route is available
const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/",           permissionMiddleware(["inventory:read"]),   asyncHandler(inventoryBatchesController.list));
router.post("/",          permissionMiddleware(["inventory:create"]), asyncHandler(inventoryBatchesController.create));
router.get("/:batchId",   permissionMiddleware(["inventory:read"]),   asyncHandler(inventoryBatchesController.get));
router.patch("/:batchId", permissionMiddleware(["inventory:update"]), asyncHandler(inventoryBatchesController.update));
router.delete("/:batchId",permissionMiddleware(["inventory:update"]), asyncHandler(inventoryBatchesController.deactivate));

export const inventoryBatchesRoutes = router;
