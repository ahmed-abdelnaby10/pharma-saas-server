import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { settingsController } from "../controller/settings.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",   permissionMiddleware(["settings:read"]),   asyncHandler(settingsController.get));
router.patch("/", permissionMiddleware(["settings:update"]), asyncHandler(settingsController.update));

export const settingsRoutes = router;
