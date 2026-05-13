import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { catalogController } from "../controller/catalog.controller";
import { catalogSyncController } from "../controller/catalog-sync.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get("/",           asyncHandler(catalogController.list));
router.post("/",          asyncHandler(catalogController.create));
router.get("/pending",    asyncHandler(catalogController.listPending));
router.get("/:itemId",    asyncHandler(catalogController.get));
router.patch("/:itemId",  asyncHandler(catalogController.update));
router.delete("/:itemId", asyncHandler(catalogController.deactivate));

// ── Crowdsource review ────────────────────────────────────────────────────────
router.post("/:itemId/approve", asyncHandler(catalogController.approve));
router.post("/:itemId/reject",  asyncHandler(catalogController.reject));

// ── External sync (manually triggered, admin only) ────────────────────────────
router.post("/sync/openfda",    asyncHandler(catalogSyncController.syncOpenFDA));
router.post("/sync/openbeauty", asyncHandler(catalogSyncController.syncOpenBeauty));
router.post("/sync/eda",        asyncHandler(catalogSyncController.syncEDA));

export const platformCatalogRoutes = router;
