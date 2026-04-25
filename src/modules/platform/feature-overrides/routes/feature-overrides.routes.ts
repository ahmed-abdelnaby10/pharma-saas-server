import { Router } from "express";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { featureOverridesController } from "../controller/feature-overrides.controller";

const router = Router({ mergeParams: true });

router.use(platformMiddleware);

router.get("/", asyncHandler(featureOverridesController.list));
router.put("/:featureKey", asyncHandler(featureOverridesController.upsert));
router.delete("/:featureKey", asyncHandler(featureOverridesController.remove));

export const featureOverridesRoutes = router;
