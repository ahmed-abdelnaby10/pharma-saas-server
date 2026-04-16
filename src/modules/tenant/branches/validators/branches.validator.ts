import { z } from "zod";
import { CreateBranchDto } from "../dto/create-branch.dto";
import { UpdateBranchDto } from "../dto/update-branch.dto";
import { QueryBranchesDto } from "../dto/query-branch.dto";

const createBranchSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(500).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  isDefault: z.boolean().default(false),
});

const updateBranchSchema = z
  .object({
    nameEn: z.string().trim().min(2).max(120).optional(),
    nameAr: z.string().trim().min(2).max(120).optional(),
    address: z.string().trim().min(2).max(500).optional(),
    phone: z.string().trim().min(5).max(30).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const queryBranchesSchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

const branchIdParamSchema = z.object({
  branchId: z.string().trim().min(1),
});

export const parseCreateBranchDto = (input: unknown): CreateBranchDto => {
  return createBranchSchema.parse(input) as CreateBranchDto;
};

export const parseUpdateBranchDto = (input: unknown): UpdateBranchDto => {
  return updateBranchSchema.parse(input) as UpdateBranchDto;
};

export const parseQueryBranchesDto = (input: unknown): QueryBranchesDto => {
  return queryBranchesSchema.parse(input) as QueryBranchesDto;
};

export const parseBranchIdParam = (input: unknown): string => {
  return branchIdParamSchema.parse(input).branchId;
};
