import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { suppliersController } from "../controller/suppliers.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",              permissionMiddleware(["suppliers:read"]),   asyncHandler(suppliersController.list));
router.post("/",             permissionMiddleware(["suppliers:create"]), asyncHandler(suppliersController.create));
router.get("/:supplierId",   permissionMiddleware(["suppliers:read"]),   asyncHandler(suppliersController.get));
router.patch("/:supplierId", permissionMiddleware(["suppliers:update"]), asyncHandler(suppliersController.update));
router.delete("/:supplierId",permissionMiddleware(["suppliers:update"]), asyncHandler(suppliersController.deactivate));

export const suppliersRoutes = router;
