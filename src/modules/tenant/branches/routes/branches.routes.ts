import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { branchesController } from "../controller/branches.controller";

const router = Router();

// All branch routes require a valid tenant JWT
router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(branchesController.list));
router.post("/", asyncHandler(branchesController.create));
router.get("/:branchId", asyncHandler(branchesController.get));
router.patch("/:branchId", asyncHandler(branchesController.update));
router.delete("/:branchId", asyncHandler(branchesController.deactivate));

export const branchesRoutes = router;
