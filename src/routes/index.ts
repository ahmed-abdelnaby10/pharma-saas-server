import { Express, Router } from "express";
import { platformRoutes } from "./platform.routes";
import { tenantRoutes } from "./tenant.routes";

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  apiRouter.use("/platform", platformRoutes);
  apiRouter.use("/tenant", tenantRoutes);

  app.use("/api/v1", apiRouter);
};
