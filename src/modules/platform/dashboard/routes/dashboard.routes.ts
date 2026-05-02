import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { dashboardController } from "../controller/dashboard.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(dashboardController.get));

export { router as dashboardRoutes };
