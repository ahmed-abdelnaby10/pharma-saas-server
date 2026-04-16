import { env } from "./env";

export const appConfig = {
  name: env.APP_NAME,
  url: env.APP_URL,
  env: env.NODE_ENV,
  port: env.PORT,
  defaultLanguage: env.DEFAULT_LANGUAGE,
  logLevel: env.LOG_LEVEL,
  corsOrigin: env.CORS_ORIGIN,
  isProduction: env.NODE_ENV === "production",
};
