import { AppError } from "./app-error";

export class TenantError extends AppError {
  constructor(message = "Tenant context is invalid", details?: unknown) {
    super(message, 400, "TENANT_ERROR", details, true, "tenant.context_invalid");
  }
}
