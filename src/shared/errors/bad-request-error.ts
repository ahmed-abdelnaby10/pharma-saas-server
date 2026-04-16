import { AppError } from "./app-error";

export class BadRequestError extends AppError {
  constructor(
    message = "Bad request",
    details?: unknown,
    translationKey = "common.bad_request",
  ) {
    super(message, 400, "BAD_REQUEST", details, true, translationKey);
  }
}
