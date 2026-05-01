import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { signupsController } from "../controller/signups.controller";

const router = Router();

// Admin-only routes (platform auth required)
router.get("/", authMiddleware, platformMiddleware, asyncHandler(signupsController.list));
router.get("/:id", authMiddleware, platformMiddleware, asyncHandler(signupsController.getById));
router.post("/:id/approve", authMiddleware, platformMiddleware, asyncHandler(signupsController.approve));
router.post("/:id/reject", authMiddleware, platformMiddleware, asyncHandler(signupsController.reject));

export const signupsRoutes = router;
