import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import { appConfig } from "./core/config/app.config";
import { successResponse } from "./core/http/api-response";
import { requestIdMiddleware } from "./shared/middlewares/request-id.middleware";
import { languageMiddleware } from "./shared/middlewares/language.middleware";
import { errorMiddleware } from "./shared/middlewares/error.middleware";
import { notFoundMiddleware } from "./shared/middlewares/not-found.middleware";
import { registerRoutes } from "./routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.corsOrigin === "*" ? true : appConfig.corsOrigin,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(appConfig.isProduction ? "combined" : "dev"));

  app.use(languageMiddleware);

  app.get("/health", (req, res) => {
    res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        {
          service: appConfig.name,
          status: "ok",
          environment: appConfig.env,
        },
        undefined,
        req.requestId,
      ),
    );
  });

  registerRoutes(app);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
