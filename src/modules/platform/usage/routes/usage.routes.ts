import { Router } from "express";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { usageController } from "../controller/usage.controller";

const router = Router({ mergeParams: true });

router.use(platformMiddleware);

router.get("/", asyncHandler(usageController.getTenantUsage));

export const usageRoutes = router;
