import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { auditLogsController } from "../controller/audit-logs.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(auditLogsController.list));
router.get("/:logId", asyncHandler(auditLogsController.getById));

export { router as auditLogsRoutes };
