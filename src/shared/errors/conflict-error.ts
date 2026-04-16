import { AppError } from "./app-error";

export class ConflictError extends AppError {
  constructor(
    message = "Conflict",
    details?: unknown,
    translationKey = "common.conflict",
  ) {
    super(message, 409, "CONFLICT", details, true, translationKey);
  }
}
