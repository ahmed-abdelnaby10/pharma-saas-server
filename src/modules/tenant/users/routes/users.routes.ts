import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { usersController } from "../controller/users.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",           permissionMiddleware(["users:read"]),   asyncHandler(usersController.list));
router.post("/",          permissionMiddleware(["users:create"]), asyncHandler(usersController.create));
router.get("/:userId",    permissionMiddleware(["users:read"]),   asyncHandler(usersController.get));
router.patch("/:userId",  permissionMiddleware(["users:update"]), asyncHandler(usersController.update));
router.delete("/:userId", permissionMiddleware(["users:delete"]), asyncHandler(usersController.deactivate));

export const usersRoutes = router;
