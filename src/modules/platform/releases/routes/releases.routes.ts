import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { releasesController } from "../controller/releases.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(releasesController.list));
router.get("/:id", asyncHandler(releasesController.getById));
router.post("/", asyncHandler(releasesController.create));
router.patch("/:id", asyncHandler(releasesController.update));
router.delete("/:id", asyncHandler(releasesController.remove));

export const releasesRoutes = router;
