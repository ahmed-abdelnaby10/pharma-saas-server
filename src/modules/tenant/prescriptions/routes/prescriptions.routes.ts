import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { prescriptionsController } from "../controller/prescriptions.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(prescriptionsController.list));
router.post("/", asyncHandler(prescriptionsController.create));
router.get("/:prescriptionId", asyncHandler(prescriptionsController.get));
router.patch("/:prescriptionId", asyncHandler(prescriptionsController.update));
router.post("/:prescriptionId/dispense", asyncHandler(prescriptionsController.dispense));
router.delete("/:prescriptionId", asyncHandler(prescriptionsController.cancel));

export const prescriptionsRoutes = router;
