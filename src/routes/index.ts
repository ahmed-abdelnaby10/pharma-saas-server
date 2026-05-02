import { Express, Router } from "express";
import { platformRoutes } from "./platform.routes";
import { tenantRoutes } from "./tenant.routes";
import { publicSignupsRoutes } from "../modules/platform/signups";
import { publicReleasesRoutes } from "../modules/platform/releases";

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  // Public routes — no authentication required
  apiRouter.use("/signups", publicSignupsRoutes);
  apiRouter.use("/downloads", publicReleasesRoutes);

  // Protected domains
  apiRouter.use("/platform", platformRoutes);
  apiRouter.use("/tenant", tenantRoutes);

  app.use("/api/v1", apiRouter);
};
