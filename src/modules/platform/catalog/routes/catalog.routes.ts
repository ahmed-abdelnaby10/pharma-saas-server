import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { catalogController } from "../controller/catalog.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/", asyncHandler(catalogController.list));
router.post("/", asyncHandler(catalogController.create));
router.get("/:itemId", asyncHandler(catalogController.get));
router.patch("/:itemId", asyncHandler(catalogController.update));
router.delete("/:itemId", asyncHandler(catalogController.deactivate));

export const platformCatalogRoutes = router;
