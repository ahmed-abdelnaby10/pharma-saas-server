import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { QueryNotificationsDto } from "../dto/query-notifications.dto";

const queryNotificationsSchema = z.object({
  isRead: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Math.min(parseInt(v, 10) || 20, 100) : 20)),
  cursor: z.string().optional(),
});

const notificationIdParamSchema = z.object({
  notificationId: z.string().cuid("Invalid notificationId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseQueryNotificationsDto = (q: unknown): QueryNotificationsDto =>
  parse(queryNotificationsSchema, q) as QueryNotificationsDto;

export const parseNotificationIdParam = (p: unknown): string =>
  parse(notificationIdParamSchema, p).notificationId;
