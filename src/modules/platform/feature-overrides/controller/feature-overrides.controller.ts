import { Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { featureOverridesService } from "../service/feature-overrides.service";

const tenantIdSchema = z.string().cuid("Invalid tenantId");
const featureKeySchema = z.string().min(1).max(64);

const upsertBodySchema = z.object({
  enabled: z.boolean(),
  limitValue: z.number().int().positive().nullable().optional(),
  reason: z.string().max(255).nullable().optional(),
});

function parseTenantId(val: unknown): string {
  const r = tenantIdSchema.safeParse(val);
  if (!r.success) throw new ValidationError("Validation failed", r.error.flatten().fieldErrors);
  return r.data;
}

function parseFeatureKey(val: unknown): string {
  const r = featureKeySchema.safeParse(val);
  if (!r.success) throw new ValidationError("Validation failed", r.error.flatten().fieldErrors);
  return r.data;
}

class FeatureOverridesController {
  list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = parseTenantId(req.params.tenantId);
    const data = await featureOverridesService.list(tenantId);
    res.json({ success: true, data });
  };

  upsert = async (req: Request, res: Response): Promise<void> => {
    const tenantId = parseTenantId(req.params.tenantId);
    const featureKey = parseFeatureKey(req.params.featureKey);
    const parsed = upsertBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }
    const data = await featureOverridesService.upsert(tenantId, featureKey, parsed.data);
    res.json({ success: true, data });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const tenantId = parseTenantId(req.params.tenantId);
    const featureKey = parseFeatureKey(req.params.featureKey);
    await featureOverridesService.remove(tenantId, featureKey);
    res.json({ success: true, message: "Override removed" });
  };
}

export const featureOverridesController = new FeatureOverridesController();
