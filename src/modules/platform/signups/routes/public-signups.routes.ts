import { Router } from "express";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { signupsController } from "../controller/signups.controller";

const router = Router();

// No auth — publicly accessible for pharmacy owners to request an account
router.post("/", asyncHandler(signupsController.submit));

export const publicSignupsRoutes = router;
