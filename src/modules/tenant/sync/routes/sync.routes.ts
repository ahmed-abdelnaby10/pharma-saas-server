import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { syncController } from "../controller/sync.controller";

const router = Router();

// Schema version is public (no auth needed — desktop checks before logging in)
router.get("/schema-version", asyncHandler(syncController.schemaVersion));

router.use(authMiddleware, tenantMiddleware);

router.get("/bootstrap", asyncHandler(syncController.bootstrap));
router.get("/delta", asyncHandler(syncController.delta));
router.post("/push", asyncHandler(syncController.push));

// Device management
router.get("/devices", asyncHandler(syncController.listDevices));
router.post("/devices", asyncHandler(syncController.registerDevice));
router.delete("/devices/:deviceId", asyncHandler(syncController.revokeDevice));
router.post("/devices/:deviceId/session", asyncHandler(syncController.issueDeviceSession));

export const syncRoutes = router;
