import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const preferredLanguageEnum = z.enum(["en", "ar"]);

const createUserSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(120),
  branchId: z.string().cuid("Invalid branch ID").optional(),
  preferredLanguage: preferredLanguageEnum.optional(),
});

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    password: z.string().min(8).max(128).optional(),
    branchId: z.string().cuid("Invalid branch ID").nullable().optional(),
    preferredLanguage: preferredLanguageEnum.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const queryUsersSchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  branchId: z.string().cuid().optional(),
});

const userIdParamSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
});

export const parseCreateUserDto = (body: unknown) => {
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseUpdateUserDto = (body: unknown) => {
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseQueryUsersDto = (query: unknown) => {
  const result = queryUsersSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseUserIdParam = (params: unknown): string => {
  const result = userIdParamSchema.safeParse(params);
  if (!result.success) {
    throw new ValidationError("Invalid user ID", result.error.flatten().fieldErrors);
  }
  return result.data.userId;
};
