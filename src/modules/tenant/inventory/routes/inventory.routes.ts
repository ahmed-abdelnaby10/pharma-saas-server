import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { inventoryController } from "../controller/inventory.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(inventoryController.list));
router.post("/", asyncHandler(inventoryController.create));
router.get("/:itemId", asyncHandler(inventoryController.get));
router.patch("/:itemId", asyncHandler(inventoryController.update));
router.delete("/:itemId", asyncHandler(inventoryController.deactivate));

export const inventoryRoutes = router;
