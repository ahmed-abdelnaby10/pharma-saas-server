import { AppError } from "./app-error";

export class SubscriptionError extends AppError {
  constructor(message = "Subscription operation failed", details?: unknown) {
    super(
      message,
      409,
      "SUBSCRIPTION_ERROR",
      details,
      true,
      "subscription.operation_failed",
    );
  }
}
