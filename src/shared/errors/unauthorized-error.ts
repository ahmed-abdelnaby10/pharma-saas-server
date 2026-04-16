import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(
    message = "Unauthorized",
    details?: unknown,
    translationKey = "common.unauthorized",
  ) {
    super(message, 401, "UNAUTHORIZED", details, true, translationKey);
  }
}
