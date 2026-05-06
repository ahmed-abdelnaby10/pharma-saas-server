import { Router } from "express";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { plansController } from "../controller/plans.controller";

const router = Router();

// Public plans listing for pricing/marketing flows
router.get("/", asyncHandler(plansController.list));

export const publicPlansRoutes = router;
