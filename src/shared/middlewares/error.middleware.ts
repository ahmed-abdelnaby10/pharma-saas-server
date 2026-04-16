import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { errorResponse } from "../../core/http/api-response";
import { logger } from "../../core/logger/logger";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    return res
      .status(422)
      .json(
        errorResponse(
          req.t?.("common.validation_error") || "Validation failed",
          "VALIDATION_ERROR",
          err.flatten(),
          req.requestId,
        ),
      );
  }

  if (err instanceof AppError) {
    const message = err.translationKey
      ? req.t?.(err.translationKey, err.translationParams) || err.message
      : err.message;

    return res
      .status(err.statusCode)
      .json(errorResponse(message, err.errorCode, err.details, req.requestId));
  }

  logger.error("Unhandled request error", err, {
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
  });

  return res
    .status(500)
    .json(
      errorResponse(
        req.t?.("common.internal_server_error") || "Internal server error",
        "INTERNAL_SERVER_ERROR",
        undefined,
        req.requestId,
      ),
    );
};
