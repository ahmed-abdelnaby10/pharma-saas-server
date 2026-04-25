import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { patientsController } from "../controller/patients.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(patientsController.list));
router.post("/", asyncHandler(patientsController.create));
router.get("/:patientId", asyncHandler(patientsController.get));
router.patch("/:patientId", asyncHandler(patientsController.update));
router.delete("/:patientId", asyncHandler(patientsController.deactivate));

export const patientsRoutes = router;
