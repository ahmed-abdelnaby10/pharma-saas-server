import { AppError } from "./app-error";

export class PaymentRequiredError extends AppError {
  constructor(
    message: string,
    details?: unknown,
    translationKey?: string,
  ) {
    super(message, 402, "PAYMENT_REQUIRED", details, true, translationKey);
  }
}
