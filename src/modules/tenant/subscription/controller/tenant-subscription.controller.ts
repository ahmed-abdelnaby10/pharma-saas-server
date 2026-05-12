import { PlatformInvoiceStatus } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { tenantSubscriptionService } from "../service/tenant-subscription.service";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { successResponse } from "../../../../core/http/api-response";

const VALID_STATUSES = Object.values(PlatformInvoiceStatus) as [string, ...string[]];

const listInvoicesQuerySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
});

const invoiceIdParamSchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice ID"),
});

class TenantSubscriptionController {
  getCurrent = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const data = await tenantSubscriptionService.getCurrent(auth);
    res.json({ success: true, data });
  };

  listInvoices = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const parsed = listInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const data = await tenantSubscriptionService.listInvoices(
      auth,
      parsed.data.status as PlatformInvoiceStatus | undefined,
    );

    res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", data, undefined, req.requestId),
    );
  };

  getInvoice = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const parsed = invoiceIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const data = await tenantSubscriptionService.getInvoice(auth, parsed.data.invoiceId);

    res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", data, undefined, req.requestId),
    );
  };
}

export const tenantSubscriptionController = new TenantSubscriptionController();
