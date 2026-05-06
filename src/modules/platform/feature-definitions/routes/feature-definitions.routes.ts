import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { featureDefinitionsController } from "../controller/feature-definitions.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(featureDefinitionsController.list));

export const featureDefinitionsRoutes = router;
