import { Router } from "express";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { platformAuthController } from "../controller/platform-auth.controller";

const router = Router();

router.post("/login", asyncHandler(platformAuthController.login));
router.post("/refresh", asyncHandler(platformAuthController.refresh));

export const platformAuthRoutes = router;
