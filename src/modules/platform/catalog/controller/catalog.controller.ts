import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parseCreateCatalogItemDto,
  parseUpdateCatalogItemDto,
  parseQueryCatalogDto,
  parseCatalogItemIdParam,
} from "../validators/catalog.validator";
import { mapCatalogItemResponse } from "../mapper/catalog.mapper";
import { catalogService, CatalogService } from "../service/catalog.service";

export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  list = async (req: Request, res: Response) => {
    const query = parseQueryCatalogDto(req.query);
    const items = await this.service.listItems(query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        items.map(mapCatalogItemResponse),
        undefined,
        req.requestId,
      ),
    );
  };

  get = async (req: Request, res: Response) => {
    const itemId = parseCatalogItemIdParam(req.params);
    const item = await this.service.getItem(itemId);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapCatalogItemResponse(item),
        undefined,
        req.requestId,
      ),
    );
  };

  create = async (req: Request, res: Response) => {
    const payload = parseCreateCatalogItemDto(req.body);
    const item = await this.service.createItem(payload);
    return res.status(201).json(
      successResponse(
        req.t?.("catalog.created") || "Catalog item created",
        mapCatalogItemResponse(item),
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const itemId = parseCatalogItemIdParam(req.params);
    const payload = parseUpdateCatalogItemDto(req.body);
    const item = await this.service.updateItem(itemId, payload);
    return res.status(200).json(
      successResponse(
        req.t?.("catalog.updated") || "Catalog item updated",
        mapCatalogItemResponse(item),
        undefined,
        req.requestId,
      ),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const itemId = parseCatalogItemIdParam(req.params);
    const item = await this.service.deactivateItem(itemId);
    return res.status(200).json(
      successResponse(
        req.t?.("catalog.deactivated") || "Catalog item deactivated",
        mapCatalogItemResponse(item),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const catalogController = new CatalogController(catalogService);
