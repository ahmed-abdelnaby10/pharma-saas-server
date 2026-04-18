import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { settingsController } from "../controller/settings.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(settingsController.get));
router.patch("/", asyncHandler(settingsController.update));

export const settingsRoutes = router;
