import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { mapCatalogItemResponse } from "../../../platform/catalog/mapper/catalog.mapper";
import { parseQueryCatalogDto } from "../../../platform/catalog/validators/catalog.validator";
import {
  parseSuggestCatalogItemDto,
  parseLookupBarcodeDto,
} from "../validators/tenant-catalog.validator";
import { tenantCatalogService, TenantCatalogService } from "../service/tenant-catalog.service";

export class TenantCatalogController {
  constructor(private readonly service: TenantCatalogService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const query = parseQueryCatalogDto(req.query);
    const result = await this.service.listItems(auth, {
      search: query.search,
      page:   query.page,
      limit:  query.limit,
    });

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result.items.map(mapCatalogItemResponse),
        {
          page:       result.page,
          limit:      result.limit,
          total:      result.total,
          totalPages: result.totalPages,
        },
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

  lookupBarcode = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const { barcode } = parseLookupBarcodeDto(req.body);
    const outcome = await this.service.lookupByBarcode(auth, barcode);

    if (outcome.origin === "not_found") {
      return res.status(404).json(
        successResponse(
          req.t?.("catalog.barcode_not_found") || "No catalog match found for this barcode",
          {
            origin:  outcome.origin,
            item:    null,
            barcode,
          },
          undefined,
          req.requestId,
        ),
      );
    }

    const message =
      outcome.origin === "existing"
        ? req.t?.("catalog.barcode_existing") || "Catalog item already known"
        : req.t?.("catalog.barcode_imported") || "Catalog item imported from external source";

    const status = outcome.origin === "external_provider" ? 201 : 200;

    return res.status(status).json(
      successResponse(
        message,
        {
          origin:   outcome.origin,
          provider: outcome.provider ?? null,
          item:     outcome.item ? mapCatalogItemResponse(outcome.item) : null,
        },
        undefined,
        req.requestId,
      ),
    );
  };
}

export const tenantCatalogController = new TenantCatalogController(tenantCatalogService);
