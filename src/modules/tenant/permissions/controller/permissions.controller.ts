import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { permissionsRepository } from "../repository/permissions.repository";

export class PermissionsController {
  list = async (req: Request, res: Response) => {
    const permissions = await permissionsRepository.listAll();

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        permissions,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const permissionsController = new PermissionsController();
