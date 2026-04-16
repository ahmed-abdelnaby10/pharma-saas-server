import { AppError } from "./app-error";

export class ForbiddenError extends AppError {
  constructor(
    message = "Forbidden",
    details?: unknown,
    translationKey = "common.forbidden",
  ) {
    super(message, 403, "FORBIDDEN", details, true, translationKey);
  }
}
