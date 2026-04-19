import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { CreateSupplierDto } from "../dto/create-supplier.dto";
import { UpdateSupplierDto } from "../dto/update-supplier.dto";
import { QuerySuppliersDto } from "../dto/query-suppliers.dto";
import { SupplierRecord } from "../mapper/suppliers.mapper";
import {
  suppliersRepository,
  SuppliersRepository,
} from "../repository/suppliers.repository";

export class SuppliersService {
  constructor(private readonly repository: SuppliersRepository) {}

  async listSuppliers(
    auth: TenantAuthContext,
    query: QuerySuppliersDto,
  ): Promise<SupplierRecord[]> {
    return this.repository.list(auth.tenantId, query);
  }

  async getSupplier(
    auth: TenantAuthContext,
    supplierId: string,
  ): Promise<SupplierRecord> {
    const supplier = await this.repository.findById(auth.tenantId, supplierId);
    if (!supplier) {
      throw new NotFoundError(
        "Supplier not found",
        undefined,
        "supplier.not_found",
      );
    }
    return supplier;
  }

  async createSupplier(
    auth: TenantAuthContext,
    payload: CreateSupplierDto,
  ): Promise<SupplierRecord> {
    const [existingEn, existingAr] = await Promise.all([
      this.repository.findByNameEn(auth.tenantId, payload.nameEn),
      this.repository.findByNameAr(auth.tenantId, payload.nameAr),
    ]);

    if (existingEn || existingAr) {
      throw new ConflictError(
        "A supplier with this name already exists",
        undefined,
        "supplier.name_conflict",
      );
    }

    return this.repository.create(auth.tenantId, payload);
  }

  async updateSupplier(
    auth: TenantAuthContext,
    supplierId: string,
    payload: UpdateSupplierDto,
  ): Promise<SupplierRecord> {
    const supplier = await this.repository.findById(auth.tenantId, supplierId);
    if (!supplier) {
      throw new NotFoundError(
        "Supplier not found",
        undefined,
        "supplier.not_found",
      );
    }

    if (payload.nameEn !== undefined && payload.nameEn !== supplier.nameEn) {
      const conflict = await this.repository.findByNameEn(
        auth.tenantId,
        payload.nameEn,
      );
      if (conflict) {
        throw new ConflictError(
          "A supplier with this name already exists",
          undefined,
          "supplier.name_conflict",
        );
      }
    }

    if (payload.nameAr !== undefined && payload.nameAr !== supplier.nameAr) {
      const conflict = await this.repository.findByNameAr(
        auth.tenantId,
        payload.nameAr,
      );
      if (conflict) {
        throw new ConflictError(
          "A supplier with this name already exists",
          undefined,
          "supplier.name_conflict",
        );
      }
    }

    return this.repository.update(auth.tenantId, supplierId, payload);
  }

  async deactivateSupplier(
    auth: TenantAuthContext,
    supplierId: string,
  ): Promise<SupplierRecord> {
    const supplier = await this.repository.findById(auth.tenantId, supplierId);
    if (!supplier) {
      throw new NotFoundError(
        "Supplier not found",
        undefined,
        "supplier.not_found",
      );
    }
    if (!supplier.isActive) {
      throw new ConflictError(
        "Supplier is already inactive",
        undefined,
        "supplier.already_inactive",
      );
    }
    return this.repository.deactivate(auth.tenantId, supplierId);
  }
}

export const suppliersService = new SuppliersService(suppliersRepository);
