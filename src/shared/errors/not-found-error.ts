import { AppError } from "./app-error";

export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found",
    details?: unknown,
    translationKey = "common.not_found",
  ) {
    super(message, 404, "NOT_FOUND", details, true, translationKey);
  }
}
