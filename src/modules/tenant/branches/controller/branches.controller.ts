import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateBranchDto,
  parseUpdateBranchDto,
  parseQueryBranchesDto,
  parseBranchIdParam,
} from "../validators/branches.validator";
import { mapBranchResponse } from "../mapper/branches.mapper";
import { branchesService, BranchesService } from "../service/branches.service";

export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const query = parseQueryBranchesDto(req.query);
    const branches = await this.service.listBranches(auth, query);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        branches.map(mapBranchResponse),
        undefined,
        req.requestId,
      ),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const branchId = parseBranchIdParam(req.params);
    const branch = await this.service.getBranch(auth, branchId);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapBranchResponse(branch),
        undefined,
        req.requestId,
      ),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const payload = parseCreateBranchDto(req.body);
    const branch = await this.service.createBranch(auth, payload);

    return res.status(201).json(
      successResponse(
        req.t?.("branch.created") || "Branch created",
        mapBranchResponse(branch),
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const branchId = parseBranchIdParam(req.params);
    const payload = parseUpdateBranchDto(req.body);
    const branch = await this.service.updateBranch(auth, branchId, payload);

    return res.status(200).json(
      successResponse(
        req.t?.("branch.updated") || "Branch updated",
        mapBranchResponse(branch),
        undefined,
        req.requestId,
      ),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const branchId = parseBranchIdParam(req.params);
    const branch = await this.service.deactivateBranch(auth, branchId);

    return res.status(200).json(
      successResponse(
        req.t?.("branch.deactivated") || "Branch deactivated",
        mapBranchResponse(branch),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const branchesController = new BranchesController(branchesService);
