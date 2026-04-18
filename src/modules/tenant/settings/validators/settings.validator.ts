import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const updateSettingsSchema = z
  .object({
    organizationName: z.string().min(1).max(255).nullable().optional(),
    taxId: z.string().min(1).max(64).nullable().optional(),
    phone: z.string().min(5).max(30).nullable().optional(),
    email: z.string().email().max(255).nullable().optional(),
    lowStockAlerts: z.boolean().optional(),
    expiryAlerts: z.boolean().optional(),
    purchaseOrderUpdates: z.boolean().optional(),
    receiptHeader: z.string().max(1000).nullable().optional(),
    receiptFooter: z.string().max(1000).nullable().optional(),
    vatPercentage: z.number().min(0).max(100).optional(),
    defaultLanguage: z.enum(["en", "ar"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided",
  });

export const parseUpdateSettingsDto = (body: unknown) => {
  const result = updateSettingsSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};
