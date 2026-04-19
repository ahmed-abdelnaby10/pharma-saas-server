import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateInventoryBatchDto,
  parseUpdateInventoryBatchDto,
  parseQueryInventoryBatchesDto,
  parseBatchIdParam,
  parseItemIdParam,
} from "../validators/inventory-batches.validator";
import { mapInventoryBatchResponse } from "../mapper/inventory-batches.mapper";
import {
  inventoryBatchesService,
  InventoryBatchesService,
} from "../service/inventory-batches.service";

export class InventoryBatchesController {
  constructor(private readonly service: InventoryBatchesService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const inventoryItemId = parseItemIdParam(req.params);
    const query = parseQueryInventoryBatchesDto(req.query);
    const batches = await this.service.listBatches(auth, inventoryItemId, query);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("common.ok") || "OK",
          batches.map(mapInventoryBatchResponse),
          undefined,
          req.requestId,
        ),
      );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const inventoryItemId = parseItemIdParam(req.params);
    const batchId = parseBatchIdParam(req.params);
    const batch = await this.service.getBatch(auth, inventoryItemId, batchId);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("common.ok") || "OK",
          mapInventoryBatchResponse(batch),
          undefined,
          req.requestId,
        ),
      );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const inventoryItemId = parseItemIdParam(req.params);
    const payload = parseCreateInventoryBatchDto(req.body);
    const batch = await this.service.createBatch(auth, inventoryItemId, payload);
    return res
      .status(201)
      .json(
        successResponse(
          req.t?.("inventory_batch.created") || "Batch registered successfully",
          mapInventoryBatchResponse(batch),
          undefined,
          req.requestId,
        ),
      );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const inventoryItemId = parseItemIdParam(req.params);
    const batchId = parseBatchIdParam(req.params);
    const payload = parseUpdateInventoryBatchDto(req.body);
    const batch = await this.service.updateBatch(auth, inventoryItemId, batchId, payload);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("inventory_batch.updated") || "Batch updated successfully",
          mapInventoryBatchResponse(batch),
          undefined,
          req.requestId,
        ),
      );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const inventoryItemId = parseItemIdParam(req.params);
    const batchId = parseBatchIdParam(req.params);
    const batch = await this.service.deactivateBatch(auth, inventoryItemId, batchId);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("inventory_batch.deactivated") || "Batch deactivated successfully",
          mapInventoryBatchResponse(batch),
          undefined,
          req.requestId,
        ),
      );
  };
}

export const inventoryBatchesController = new InventoryBatchesController(
  inventoryBatchesService,
);
