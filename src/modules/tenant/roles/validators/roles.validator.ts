import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const createRoleSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "code must be lowercase letters, digits, or underscores"),
  nameEn: z.string().min(2).max(120),
  nameAr: z.string().min(2).max(120),
});

const updateRoleSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_]+$/, "code must be lowercase letters, digits, or underscores")
      .optional(),
    nameEn: z.string().min(2).max(120).optional(),
    nameAr: z.string().min(2).max(120).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided",
  });

const roleIdParamSchema = z.object({
  roleId: z.string().cuid("Invalid role ID"),
});

const userIdParamSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
});

const permissionIdsSchema = z.object({
  permissionIds: z
    .array(z.string().cuid("Invalid permission ID"))
    .min(1, "At least one permissionId is required"),
});

const roleIdsSchema = z.object({
  roleIds: z
    .array(z.string().cuid("Invalid role ID"))
    .min(1, "At least one roleId is required"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateRoleDto = (body: unknown) => parse(createRoleSchema, body);
export const parseUpdateRoleDto = (body: unknown) => parse(updateRoleSchema, body);
export const parseRoleIdParam = (params: unknown): string =>
  parse(roleIdParamSchema, params).roleId;
export const parseUserIdParam = (params: unknown): string =>
  parse(userIdParamSchema, params).userId;
export const parseAssignPermissionsDto = (body: unknown) =>
  parse(permissionIdsSchema, body);
export const parseAssignRolesDto = (body: unknown) => parse(roleIdsSchema, body);
