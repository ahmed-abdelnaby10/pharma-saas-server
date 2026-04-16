import { AppError } from "./app-error";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(
      message,
      422,
      "VALIDATION_ERROR",
      details,
      true,
      "common.validation_error",
    );
  }
}
