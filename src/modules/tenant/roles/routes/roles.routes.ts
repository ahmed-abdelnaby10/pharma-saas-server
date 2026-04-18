import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { rolesController } from "../controller/roles.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Role CRUD
router.get("/", asyncHandler(rolesController.list));
router.post("/", asyncHandler(rolesController.create));
router.get("/:roleId", asyncHandler(rolesController.get));
router.patch("/:roleId", asyncHandler(rolesController.update));
router.delete("/:roleId", asyncHandler(rolesController.deactivate));

// Role ↔ Permission assignment
router.post("/:roleId/permissions", asyncHandler(rolesController.assignPermissions));
router.delete("/:roleId/permissions", asyncHandler(rolesController.removePermissions));

export const rolesRoutes = router;
