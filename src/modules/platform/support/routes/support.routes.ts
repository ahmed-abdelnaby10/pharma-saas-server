import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { platformSupportController } from "../controller/support.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(platformSupportController.list));
router.patch("/:ticketId/status", asyncHandler(platformSupportController.updateStatus));
router.patch("/:ticketId/assign", asyncHandler(platformSupportController.assign));
router.get("/:ticketId", asyncHandler(platformSupportController.getById));

export { router as platformSupportRoutes };
