import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreatePurchaseOrderDto,
  parseUpdatePurchaseOrderDto,
  parseQueryPurchaseOrdersDto,
  parseAddPurchaseOrderItemDto,
  parseUpdatePurchaseOrderItemDto,
  parseReceivePurchaseOrderDto,
  parseOrderIdParam,
  parsePoItemIdParam,
} from "../validators/purchasing.validator";
import { mapPurchaseOrderResponse } from "../mapper/purchasing.mapper";
import { purchasingService, PurchasingService } from "../service/purchasing.service";

export class PurchasingController {
  constructor(private readonly service: PurchasingService) {}

  listOrders = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryPurchaseOrdersDto(req.query);
    const orders = await this.service.listOrders(auth, query);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", orders.map(mapPurchaseOrderResponse), undefined, req.requestId),
    );
  };

  getOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const order = await this.service.getOrder(auth, orderId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  createOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreatePurchaseOrderDto(req.body);
    const order = await this.service.createOrder(auth, payload);
    return res.status(201).json(
      successResponse(req.t?.("purchase_order.created") || "Purchase order created", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  updateOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const payload = parseUpdatePurchaseOrderDto(req.body);
    const order = await this.service.updateOrder(auth, orderId, payload);
    return res.status(200).json(
      successResponse(req.t?.("purchase_order.updated") || "Purchase order updated", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  cancelOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const order = await this.service.cancelOrder(auth, orderId);
    return res.status(200).json(
      successResponse(req.t?.("purchase_order.cancelled") || "Purchase order cancelled", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  addItem = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const payload = parseAddPurchaseOrderItemDto(req.body);
    const order = await this.service.addItem(auth, orderId, payload);
    return res.status(201).json(
      successResponse(req.t?.("purchase_order.item_added") || "Item added to order", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  updateItem = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const poItemId = parsePoItemIdParam(req.params);
    const payload = parseUpdatePurchaseOrderItemDto(req.body);
    const order = await this.service.updateItem(auth, orderId, poItemId, payload);
    return res.status(200).json(
      successResponse(req.t?.("purchase_order.item_updated") || "Order item updated", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  removeItem = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const poItemId = parsePoItemIdParam(req.params);
    const order = await this.service.removeItem(auth, orderId, poItemId);
    return res.status(200).json(
      successResponse(req.t?.("purchase_order.item_removed") || "Order item removed", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };

  receiveOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const orderId = parseOrderIdParam(req.params);
    const payload = parseReceivePurchaseOrderDto(req.body);
    const order = await this.service.receiveOrder(auth, orderId, payload);
    return res.status(200).json(
      successResponse(req.t?.("purchase_order.received") || "Items received successfully", mapPurchaseOrderResponse(order), undefined, req.requestId),
    );
  };
}

export const purchasingController = new PurchasingController(purchasingService);
