import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  featureDefinitionsService,
  FeatureDefinitionsService,
} from "../service/feature-definitions.service";

export class FeatureDefinitionsController {
  constructor(private readonly service: FeatureDefinitionsService) {}

  /**
   * GET /api/v1/platform/features
   *
   * Returns the closed set of feature definitions available in this application.
   * The admin UI uses this to populate the feature-key dropdown when editing plans.
   *
   * Query params:
   *   - includeInactive=true  → also returns soft-disabled keys
   */
  list = async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === "true";
    const lang = req.lang ?? "en";

    const definitions = await this.service.listDefinitions(lang, includeInactive);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") ?? "OK",
        definitions,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const featureDefinitionsController = new FeatureDefinitionsController(
  featureDefinitionsService,
);
