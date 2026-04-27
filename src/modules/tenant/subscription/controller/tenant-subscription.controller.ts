import { Request, Response } from "express";
import { tenantSubscriptionService } from "../service/tenant-subscription.service";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";

class TenantSubscriptionController {
  getCurrent = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const data = await tenantSubscriptionService.getCurrent(auth);
    res.json({ success: true, data });
  };
}

export const tenantSubscriptionController = new TenantSubscriptionController();
