import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { plansController } from "../controller/plans.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.post("/", asyncHandler(plansController.create));
router.get("/", asyncHandler(plansController.list));
router.get("/:planId", asyncHandler(plansController.getById));
router.patch("/:planId", asyncHandler(plansController.update));

export const plansRoutes = router;
