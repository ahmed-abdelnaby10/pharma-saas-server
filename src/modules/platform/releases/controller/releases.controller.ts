import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { createReleaseSchema } from "../dto/create-release.dto";
import { updateReleaseSchema } from "../dto/update-release.dto";
import { queryReleasesSchema } from "../dto/query-releases.dto";
import { parseReleaseIdParam } from "../validators/releases.validator";
import { releasesService } from "../service/releases.service";

class ReleasesController {
  list = async (req: Request, res: Response): Promise<void> => {
    const query = queryReleasesSchema.parse(req.query);
    const results = await releasesService.list(query);
    res.json(successResponse(req.t?.("common.ok") || "OK", results, undefined, req.requestId));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseReleaseIdParam(req.params);
    const result = await releasesService.getById(id);
    res.json(successResponse(req.t?.("common.ok") || "OK", result, undefined, req.requestId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createReleaseSchema.parse(req.body);
    const result = await releasesService.create(body);
    res.status(201).json(
      successResponse(
        req.t?.("release.created") || "Release created",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseReleaseIdParam(req.params);
    const body = updateReleaseSchema.parse(req.body);
    const result = await releasesService.update(id, body);
    res.json(
      successResponse(
        req.t?.("release.updated") || "Release updated",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const id = parseReleaseIdParam(req.params);
    await releasesService.remove(id);
    res.json(
      successResponse(
        req.t?.("release.deleted") || "Release deleted",
        null,
        undefined,
        req.requestId,
      ),
    );
  };

  /** Public — no auth required */
  downloadManifest = async (req: Request, res: Response): Promise<void> => {
    const manifest = await releasesService.getDownloadManifest();
    res.json(successResponse(req.t?.("common.ok") || "OK", manifest, undefined, req.requestId));
  };
}

export const releasesController = new ReleasesController();
