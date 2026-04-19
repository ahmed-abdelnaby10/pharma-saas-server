import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { shiftsController } from "../controller/shifts.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(shiftsController.list));
router.get("/active", asyncHandler(shiftsController.getActive));
router.post("/", asyncHandler(shiftsController.open));
router.get("/:shiftId", asyncHandler(shiftsController.get));
router.post("/:shiftId/close", asyncHandler(shiftsController.close));

export const shiftsRoutes = router;
