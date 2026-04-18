import { Branch } from "@prisma/client";

export type BranchRecord = Branch;

export const mapBranchResponse = (branch: BranchRecord) => {
  return {
    id: branch.id,
    tenantId: branch.tenantId,
    nameEn: branch.nameEn,
    nameAr: branch.nameAr,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.isActive,
    isDefault: branch.isDefault,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
};
