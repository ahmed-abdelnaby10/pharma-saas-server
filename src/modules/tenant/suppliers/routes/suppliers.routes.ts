import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { suppliersController } from "../controller/suppliers.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(suppliersController.list));
router.post("/", asyncHandler(suppliersController.create));
router.get("/:supplierId", asyncHandler(suppliersController.get));
router.patch("/:supplierId", asyncHandler(suppliersController.update));
router.delete("/:supplierId", asyncHandler(suppliersController.deactivate));

export const suppliersRoutes = router;
