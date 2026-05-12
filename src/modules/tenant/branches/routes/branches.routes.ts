import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { branchesController } from "../controller/branches.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",             permissionMiddleware(["branches:read"]),   asyncHandler(branchesController.list));
router.post("/",            permissionMiddleware(["branches:create"]), asyncHandler(branchesController.create));
router.get("/:branchId",    permissionMiddleware(["branches:read"]),   asyncHandler(branchesController.get));
router.patch("/:branchId",  permissionMiddleware(["branches:update"]), asyncHandler(branchesController.update));
router.delete("/:branchId", permissionMiddleware(["branches:delete"]), asyncHandler(branchesController.deactivate));

export const branchesRoutes = router;
