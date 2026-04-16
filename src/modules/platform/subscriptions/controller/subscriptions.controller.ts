import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parseChangeSubscriptionDto,
  parseCreateSubscriptionDto,
  parseQuerySubscriptionsDto,
  parseTenantIdParam,
} from "../validators/subscriptions.validator";
import {
  subscriptionsService,
  SubscriptionsService,
} from "../service/subscriptions.service";

export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  create = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const payload = parseCreateSubscriptionDto(req.body);
    const subscription = await this.service.createSubscription(tenantId, payload);
    return res.status(201).json(
      successResponse(
        req.t?.("subscription.created") || "Subscription created",
        subscription,
        undefined,
        req.requestId,
      ),
    );
  };

  list = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const query = parseQuerySubscriptionsDto(req.query);
    const subscriptions = await this.service.listSubscriptions(tenantId, query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        subscriptions,
        undefined,
        req.requestId,
      ),
    );
  };

  getCurrent = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const subscription = await this.service.getCurrentSubscription(tenantId);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        subscription,
        undefined,
        req.requestId,
      ),
    );
  };

  changePlan = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const payload = parseChangeSubscriptionDto(req.body);
    const subscription = await this.service.changePlan(tenantId, payload);
    return res.status(200).json(
      successResponse(
        req.t?.("subscription.changed") || "Subscription changed",
        subscription,
        undefined,
        req.requestId,
      ),
    );
  };

  cancel = async (req: Request, res: Response) => {
    const tenantId = parseTenantIdParam(req.params);
    const subscription = await this.service.cancelSubscription(tenantId);
    return res.status(200).json(
      successResponse(
        req.t?.("subscription.canceled") || "Subscription canceled",
        subscription,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const subscriptionsController = new SubscriptionsController(
  subscriptionsService,
);