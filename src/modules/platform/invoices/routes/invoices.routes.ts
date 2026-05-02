import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { invoicesController } from "../controller/invoices.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(invoicesController.list));
router.post("/", asyncHandler(invoicesController.create));
router.patch("/:invoiceId/issue", asyncHandler(invoicesController.issue));
router.patch("/:invoiceId/mark-paid", asyncHandler(invoicesController.markPaid));
router.patch("/:invoiceId/void", asyncHandler(invoicesController.void));
router.get("/:invoiceId", asyncHandler(invoicesController.getById));

export { router as invoicesRoutes };
