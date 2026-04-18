import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateInventoryItemDto,
  parseUpdateInventoryItemDto,
  parseQueryInventoryItemsDto,
  parseInventoryItemIdParam,
} from "../validators/inventory.validator";
import { mapInventoryItemResponse } from "../mapper/inventory.mapper";
import { inventoryService, InventoryService } from "../service/inventory.service";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryInventoryItemsDto(req.query);
    const items = await this.service.listItems(auth, query);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("common.ok") || "OK",
          items.map(mapInventoryItemResponse),
          undefined,
          req.requestId,
        ),
      );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const itemId = parseInventoryItemIdParam(req.params);
    const item = await this.service.getItem(auth, itemId);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("common.ok") || "OK",
          mapInventoryItemResponse(item),
          undefined,
          req.requestId,
        ),
      );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreateInventoryItemDto(req.body);
    const item = await this.service.createItem(auth, payload);
    return res
      .status(201)
      .json(
        successResponse(
          req.t?.("inventory.created") || "Inventory item registered",
          mapInventoryItemResponse(item),
          undefined,
          req.requestId,
        ),
      );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const itemId = parseInventoryItemIdParam(req.params);
    const payload = parseUpdateInventoryItemDto(req.body);
    const item = await this.service.updateItem(auth, itemId, payload);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("inventory.updated") || "Inventory item updated",
          mapInventoryItemResponse(item),
          undefined,
          req.requestId,
        ),
      );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const itemId = parseInventoryItemIdParam(req.params);
    const item = await this.service.deactivateItem(auth, itemId);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("inventory.deactivated") || "Inventory item deactivated",
          mapInventoryItemResponse(item),
          undefined,
          req.requestId,
        ),
      );
  };
}

export const inventoryController = new InventoryController(inventoryService);
