import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { inventoryController } from "../controller/inventory.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",          permissionMiddleware(["inventory:read"]),   asyncHandler(inventoryController.list));
router.post("/",         permissionMiddleware(["inventory:create"]), asyncHandler(inventoryController.create));
router.get("/:itemId",   permissionMiddleware(["inventory:read"]),   asyncHandler(inventoryController.get));
router.patch("/:itemId", permissionMiddleware(["inventory:update"]), asyncHandler(inventoryController.update));
router.delete("/:itemId",permissionMiddleware(["inventory:update"]), asyncHandler(inventoryController.deactivate));

export const inventoryRoutes = router;
