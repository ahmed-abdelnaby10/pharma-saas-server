import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { ocrController } from "../controller/ocr.controller";
import { ocrUpload } from "../upload/multer.config";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(ocrController.listDocuments));
router.post("/", ocrUpload.single("file"), asyncHandler(ocrController.uploadDocument));
router.post("/:documentId/process", asyncHandler(ocrController.processDocument));
router.get("/:documentId", asyncHandler(ocrController.getDocument));

export { router as ocrRoutes };
