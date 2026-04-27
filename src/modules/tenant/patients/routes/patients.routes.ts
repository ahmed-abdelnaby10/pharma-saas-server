import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { patientsController } from "../controller/patients.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",           asyncHandler(patientsController.list));
router.get("/:patientId", asyncHandler(patientsController.getById));
router.post("/",          asyncHandler(patientsController.create));
router.patch("/:patientId", asyncHandler(patientsController.update));
router.delete("/:patientId", asyncHandler(patientsController.deactivate));

export { router as patientsRoutes };
