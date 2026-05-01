import { Router } from "express";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { releasesController } from "../controller/releases.controller";

const router = Router();

// No auth — desktop clients poll this to check for updates
router.get("/", asyncHandler(releasesController.downloadManifest));

export const publicReleasesRoutes = router;
