import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { mapCatalogItemResponse } from "../../../platform/catalog/mapper/catalog.mapper";
import { parseSuggestCatalogItemDto } from "../validators/tenant-catalog.validator";
import { tenantCatalogService, TenantCatalogService } from "../service/tenant-catalog.service";

export class TenantCatalogController {
  constructor(private readonly service: TenantCatalogService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const items  = await this.service.listItems(auth, search);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        items.map(mapCatalogItemResponse),
        undefined,
        req.requestId,
      ),
    );
  };

  suggest = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const payload = parseSuggestCatalogItemDto(req.body);
    const { record, wasCreated } = await this.service.suggestItem(auth, payload);

    const status  = wasCreated ? 201 : 200;
    const message = wasCreated
      ? req.t?.("catalog.suggested") || "Catalog item submitted for review"
      : req.t?.("catalog.already_exists") || "Catalog item already exists";

    return res.status(status).json(
      successResponse(message, mapCatalogItemResponse(record), undefined, req.requestId),
    );
  };
}

export const tenantCatalogController = new TenantCatalogController(tenantCatalogService);
