/**
 * User-role sub-router.
 * Mounted at: /tenant/users/:userId/roles
 * Uses mergeParams so :userId is available.
 */
import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { rolesController } from "../controller/roles.controller";

const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(rolesController.getUserRoles));
router.post("/", asyncHandler(rolesController.assignRolesToUser));
router.delete("/", asyncHandler(rolesController.removeRolesFromUser));

export const userRolesRoutes = router;
