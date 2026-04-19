import { prisma } from "../../../../core/db/prisma";
import { CreateSupplierDto } from "../dto/create-supplier.dto";
import { UpdateSupplierDto } from "../dto/update-supplier.dto";
import { QuerySuppliersDto } from "../dto/query-suppliers.dto";
import { SupplierRecord } from "../mapper/suppliers.mapper";

export class SuppliersRepository {
  async findById(tenantId: string, supplierId: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
  }

  async findByNameEn(tenantId: string, nameEn: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findUnique({
      where: { tenantId_nameEn: { tenantId, nameEn } },
    });
  }

  async findByNameAr(tenantId: string, nameAr: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findUnique({
      where: { tenantId_nameAr: { tenantId, nameAr } },
    });
  }

  async list(tenantId: string, query: QuerySuppliersDto): Promise<SupplierRecord[]> {
    return prisma.supplier.findMany({
      where: {
        tenantId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                { nameEn: { contains: query.search, mode: "insensitive" } },
                { nameAr: { contains: query.search, mode: "insensitive" } },
                { contactName: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ nameEn: "asc" }],
    });
  }

  async create(tenantId: string, payload: CreateSupplierDto): Promise<SupplierRecord> {
    return prisma.supplier.create({ data: { tenantId, ...payload } });
  }

  async update(
    tenantId: string,
    supplierId: string,
    payload: UpdateSupplierDto,
  ): Promise<SupplierRecord> {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: payload,
    });
  }

  async deactivate(tenantId: string, supplierId: string): Promise<SupplierRecord> {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    });
  }
}

export const suppliersRepository = new SuppliersRepository();
