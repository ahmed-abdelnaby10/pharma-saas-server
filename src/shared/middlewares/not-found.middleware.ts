import { Request, Response } from "express";
import { errorResponse } from "../../core/http/api-response";

export const notFoundMiddleware = (req: Request, res: Response) => {
  return res
    .status(404)
    .json(
      errorResponse(
        req.t?.("common.route_not_found") || "Route not found",
        "ROUTE_NOT_FOUND",
        undefined,
        req.requestId,
      ),
    );
};
