import { Request, Response } from "express";
import { z } from "zod";
import { successResponse } from "../../../../core/http/api-response";
import { ValidationError } from "../../../../shared/errors/validation-error";
import {
  catalogSyncService,
  CatalogSyncService,
} from "../service/catalog-sync.service";

const syncQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (v > 0 && v <= 50_000), {
      message: "limit must be between 1 and 50000",
    }),
});

const edaBodySchema = z.object({
  filePath: z.string().min(1, "filePath is required"),
});

function parseQuery(query: unknown) {
  const result = syncQuerySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export class CatalogSyncController {
  constructor(private readonly service: CatalogSyncService) {}

  syncOpenFDA = async (req: Request, res: Response) => {
    const { limit } = parseQuery(req.query);
    const syncResult = await this.service.syncFromOpenFDA(limit);
    return res.status(200).json(
      successResponse(
        "OpenFDA sync complete",
        syncResult,
        undefined,
        req.requestId,
      ),
    );
  };

  syncOpenBeauty = async (req: Request, res: Response) => {
    const { limit } = parseQuery(req.query);
    const syncResult = await this.service.syncFromOpenBeauty(limit);
    return res.status(200).json(
      successResponse(
        "Open Beauty Facts sync complete",
        syncResult,
        undefined,
        req.requestId,
      ),
    );
  };

  syncEDA = async (req: Request, res: Response) => {
    const bodyResult = edaBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError("Validation failed", bodyResult.error.flatten().fieldErrors);
    }
    const { filePath } = bodyResult.data;
    const syncResult = await this.service.syncFromEDA(filePath);
    return res.status(200).json(
      successResponse(
        "EDA sync complete",
        syncResult,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const catalogSyncController = new CatalogSyncController(catalogSyncService);
