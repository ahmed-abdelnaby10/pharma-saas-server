import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import {
  parseOpenShiftDto,
  parseCloseShiftDto,
  parseQueryShiftsDto,
  parseShiftIdParam,
} from "../validators/shifts.validator";
import { mapShiftResponse } from "../mapper/shifts.mapper";
import { shiftsService, ShiftsService } from "../service/shifts.service";

export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryShiftsDto(req.query);
    const shifts = await this.service.listShifts(auth, query);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", shifts.map(mapShiftResponse), undefined, req.requestId),
    );
  };

  getActive = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { branchId } = req.query;
    if (!branchId || typeof branchId !== "string") {
      throw new BadRequestError("branchId query parameter is required");
    }
    const shift = await this.service.getActiveShift(auth, branchId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapShiftResponse(shift), undefined, req.requestId),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const shiftId = parseShiftIdParam(req.params);
    const shift = await this.service.getShift(auth, shiftId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapShiftResponse(shift), undefined, req.requestId),
    );
  };

  open = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseOpenShiftDto(req.body);
    const shift = await this.service.openShift(auth, payload);
    return res.status(201).json(
      successResponse(req.t?.("shift.opened") || "Shift opened", mapShiftResponse(shift), undefined, req.requestId),
    );
  };

  close = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const shiftId = parseShiftIdParam(req.params);
    const payload = parseCloseShiftDto(req.body);
    const shift = await this.service.closeShift(auth, shiftId, payload);
    return res.status(200).json(
      successResponse(req.t?.("shift.closed") || "Shift closed", mapShiftResponse(shift), undefined, req.requestId),
    );
  };
}

export const shiftsController = new ShiftsController(shiftsService);
