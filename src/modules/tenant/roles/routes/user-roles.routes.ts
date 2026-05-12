/**
 * User-role sub-router.
 * Mounted at: /tenant/users/:userId/roles
 * Uses mergeParams so :userId is available.
 */
import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { rolesController } from "../controller/roles.controller";

const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/",    permissionMiddleware(["users:read"]),   asyncHandler(rolesController.getUserRoles));
router.post("/",   permissionMiddleware(["users:update"]), asyncHandler(rolesController.assignRolesToUser));
router.delete("/", permissionMiddleware(["users:update"]), asyncHandler(rolesController.removeRolesFromUser));

export const userRolesRoutes = router;
