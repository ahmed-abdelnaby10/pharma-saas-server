import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { tenantSubscriptionController } from "../controller/tenant-subscription.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/",                           asyncHandler(tenantSubscriptionController.getCurrent));
router.get("/invoices",                   asyncHandler(tenantSubscriptionController.listInvoices));
router.get("/invoices/:invoiceId",        asyncHandler(tenantSubscriptionController.getInvoice));

export const tenantSubscriptionRoutes = router;
