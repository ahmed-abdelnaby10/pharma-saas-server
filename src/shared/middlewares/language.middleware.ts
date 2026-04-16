import { NextFunction, Request, Response } from "express";
import { appConfig } from "../../core/config/app.config";
import { createTranslator, resolveLanguage } from "../../core/i18n";

export const languageMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const lang = resolveLanguage(
    req.header("accept-language") || undefined,
    appConfig.defaultLanguage,
  );
  const translator = createTranslator(lang);

  req.lang = lang;
  req.t = translator;
  req.translate = translator;

  next();
};
