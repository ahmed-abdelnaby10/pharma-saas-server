import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateStockMovementDto,
  parseQueryStockMovementsDto,
} from "../validators/stock-movements.validator";
import { mapStockMovementResponse } from "../mapper/stock-movements.mapper";
import { stockMovementsService, StockMovementsService } from "../service/stock-movements.service";

export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryStockMovementsDto(req.query);
    const movements = await this.service.listMovements(auth, query);
    return res
      .status(200)
      .json(
        successResponse(
          req.t?.("common.ok") || "OK",
          movements.map(mapStockMovementResponse),
          undefined,
          req.requestId,
        ),
      );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreateStockMovementDto(req.body);
    const movement = await this.service.createMovement(auth, payload);
    return res
      .status(201)
      .json(
        successResponse(
          req.t?.("stock_movement.created") || "Stock movement recorded",
          mapStockMovementResponse(movement),
          undefined,
          req.requestId,
        ),
      );
  };
}

export const stockMovementsController = new StockMovementsController(stockMovementsService);
