/**
 * Tenant-facing catalog routes.
 *
 * GET  /  — list ACTIVE items + own PENDING_REVIEW suggestions
 * POST /suggest — submit a new item for platform review (crowdsource)
 * GET  /:itemId — get a single active item (reuses platform controller)
 */
import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { tenantCatalogController } from "../controller/tenant-catalog.controller";
import { catalogController } from "../../../platform/catalog/controller/catalog.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Search/list — scoped to ACTIVE + own PENDING_REVIEW
router.get(
  "/",
  permissionMiddleware(["catalog:read"]),
  asyncHandler(tenantCatalogController.list),
);

// Submit a suggestion
router.post(
  "/suggest",
  permissionMiddleware(["catalog:suggest"]),
  asyncHandler(tenantCatalogController.suggest),
);

// Read a specific item (reuse platform controller — globally visible)
router.get(
  "/:itemId",
  permissionMiddleware(["catalog:read"]),
  asyncHandler(catalogController.get),
);

export const tenantCatalogRoutes = router;
