/**
 * Tenant-facing catalog routes — read-only.
 * Reuses the platform catalog service and validator; no tenant scoping needed
 * because the catalog is global.
 */
import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { catalogController } from "../../../platform/catalog/controller/catalog.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Tenants may only search active items
router.get("/", asyncHandler(catalogController.list));
router.get("/:itemId", asyncHandler(catalogController.get));

export const tenantCatalogRoutes = router;
