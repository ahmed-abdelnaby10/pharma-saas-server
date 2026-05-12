import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { rolesController } from "../controller/roles.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Role CRUD
router.get("/",           permissionMiddleware(["roles:read"]),   asyncHandler(rolesController.list));
router.post("/",          permissionMiddleware(["roles:create"]), asyncHandler(rolesController.create));
router.get("/:roleId",    permissionMiddleware(["roles:read"]),   asyncHandler(rolesController.get));
router.patch("/:roleId",  permissionMiddleware(["roles:update"]), asyncHandler(rolesController.update));
router.delete("/:roleId", permissionMiddleware(["roles:delete"]), asyncHandler(rolesController.deactivate));

// Role ↔ Permission assignment
router.post("/:roleId/permissions",   permissionMiddleware(["roles:update"]), asyncHandler(rolesController.assignPermissions));
router.delete("/:roleId/permissions", permissionMiddleware(["roles:update"]), asyncHandler(rolesController.removePermissions));

export const rolesRoutes = router;
