import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { plansRepository, PlansRepository } from "../../plans/repository/plans.repository";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { QueryTenantsDto } from "../dto/query-tenant.dto";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { mapTenantResponse } from "../mapper/tenants.mapper";
import { tenantsRepository, TenantsRepository } from "../repository/tenants.repository";

export class TenantsService {
  constructor(
    private readonly repository: TenantsRepository,
    private readonly plans: PlansRepository,
  ) {}

  async createTenant(payload: CreateTenantDto) {
    const plan = await this.plans.findById(payload.planId);

    if (!plan) {
      throw new NotFoundError(
        "Plan not found",
        { planId: payload.planId },
        "plan.not_found",
      );
    }

    if (!plan.isActive) {
      throw new ConflictError(
        "Plan is not active",
        { planId: payload.planId },
        "plan.inactive",
      );
    }

    const tenant = await this.repository.createWithTransaction(payload, {
      id: plan.id,
      trialDays: plan.trialDays,
    });

    return mapTenantResponse(tenant);
  }

  async listTenants(query: QueryTenantsDto) {
    const tenants = await this.repository.list(query);
    return tenants.map(mapTenantResponse);
  }

  async getTenant(tenantId: string) {
    const tenant = await this.repository.findById(tenantId);

    if (!tenant) {
      throw new NotFoundError(
        "Tenant not found",
        { tenantId },
        "tenant.not_found",
      );
    }

    return mapTenantResponse(tenant);
  }

  async updateTenant(tenantId: string, payload: UpdateTenantDto) {
    const existing = await this.repository.findById(tenantId);

    if (!existing) {
      throw new NotFoundError(
        "Tenant not found",
        { tenantId },
        "tenant.not_found",
      );
    }

    const updated = await this.repository.update(tenantId, payload);
    return mapTenantResponse(updated);
  }
}

export const tenantsService = new TenantsService(tenantsRepository, plansRepository);
