import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { tenantsService, TenantsService } from "../service/tenants.service";
import {
  parseCreateTenantDto,
  parseQueryTenantsDto,
  parseTenantIdParam,
  parseUpdateTenantDto,
} from "../validators/tenants.validator";

export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  create = async (req: Request, res: Response) => {
    const payload = parseCreateTenantDto(req.body);
    const tenant = await this.service.createTenant(payload);
    return res.status(201).json(
      successResponse(
        req.t?.("tenant.created") || "Tenant created",
        tenant,
        undefined,
        req.requestId,
      ),
    );
  };

  list = async (req: Request, res: Response) => {
    const query = parseQueryTenantsDto(req.query);
    const tenants = await this.service.listTenants(query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        tenants,
        undefined,
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const tenant = await this.service.getTenant(tenantId);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        tenant,
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const payload = parseUpdateTenantDto(req.body);
    const tenant = await this.service.updateTenant(tenantId, payload);
    return res.status(200).json(
      successResponse(
        req.t?.("tenant.updated") || "Tenant updated",
        tenant,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const tenantsController = new TenantsController(tenantsService);
