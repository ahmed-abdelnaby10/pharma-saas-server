import { Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { usageService } from "../service/usage.service";

class UsageController {
  getTenantUsage = async (req: Request, res: Response): Promise<void> => {
    const result = z.string().cuid("Invalid tenantId").safeParse(req.params.tenantId);
    if (!result.success) {
      throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
    }
    const data = await usageService.getTenantUsage(result.data);
    res.json({ success: true, data });
  };
}

export const usageController = new UsageController();
