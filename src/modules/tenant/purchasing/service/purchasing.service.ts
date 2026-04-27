import { NotificationType, Prisma, PurchaseOrderStatus, StockMovementType } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { notificationsRepository } from "../../notifications/repository/notifications.repository";
import { logger } from "../../../../core/logger/logger";
import { CreatePurchaseOrderDto } from "../dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "../dto/update-purchase-order.dto";
import { QueryPurchaseOrdersDto } from "../dto/query-purchase-orders.dto";
import { AddPurchaseOrderItemDto } from "../dto/add-purchase-order-item.dto";
import { UpdatePurchaseOrderItemDto } from "../dto/update-purchase-order-item.dto";
import { ReceivePurchaseOrderDto } from "../dto/receive-purchase-order.dto";
import { PurchaseOrderWithRelations } from "../mapper/purchasing.mapper";
import {
  purchasingRepository,
  PurchasingRepository,
} from "../repository/purchasing.repository";
import { stockMovementsRepository } from "../../stock-movements/repository/stock-movements.repository";
import { prisma } from "../../../../core/db/prisma";

const EDITABLE_STATUSES = new Set<PurchaseOrderStatus>([
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.ORDERED,
]);

const RECEIVABLE_STATUSES = new Set<PurchaseOrderStatus>([
  PurchaseOrderStatus.ORDERED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]);

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `PO-${ts}`;
}

export class PurchasingService {
  constructor(private readonly repository: PurchasingRepository) {}

  async listOrders(
    auth: TenantAuthContext,
    query: QueryPurchaseOrdersDto,
  ): Promise<PurchaseOrderWithRelations[]> {
    await this.assertBranch(auth.tenantId, query.branchId);
    return this.repository.list(auth.tenantId, query);
  }

  async getOrder(
    auth: TenantAuthContext,
    orderId: string,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.repository.findById(auth.tenantId, orderId);
    if (!order) throw new NotFoundError("Purchase order not found", undefined, "purchase_order.not_found");
    return order;
  }

  async createOrder(
    auth: TenantAuthContext,
    payload: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    // 0. Data-level idempotency via externalId.
    //    If the desktop retries after the Redis TTL has expired, the order
    //    already exists in the DB — return it without re-running any logic.
    if (payload.externalId) {
      const existing = await this.repository.findByExternalId(
        auth.tenantId,
        payload.externalId,
      );
      if (existing) return existing;
    }

    await this.assertBranch(auth.tenantId, payload.branchId);

    if (payload.supplierId) {
      await this.assertSupplier(auth.tenantId, payload.supplierId);
    }

    const orderNumber = payload.orderNumber ?? generateOrderNumber();

    const existing = await this.repository.findByOrderNumber(auth.tenantId, orderNumber);
    if (existing) {
      throw new ConflictError(
        "A purchase order with this number already exists",
        undefined,
        "purchase_order.duplicate_number",
      );
    }

    return this.repository.create(auth.tenantId, {
      branchId: payload.branchId,
      supplierId: payload.supplierId ?? null,
      orderNumber,
      notes: payload.notes ?? null,
      expectedAt: payload.expectedAt ? new Date(payload.expectedAt) : null,
      externalId: payload.externalId ?? null,
    });
  }

  async updateOrder(
    auth: TenantAuthContext,
    orderId: string,
    payload: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);

    if (!EDITABLE_STATUSES.has(order.status)) {
      throw new ConflictError(
        "Only DRAFT or ORDERED purchase orders can be updated",
        undefined,
        "purchase_order.not_editable",
      );
    }

    if (payload.supplierId) {
      await this.assertSupplier(auth.tenantId, payload.supplierId);
    }

    // Validate status transitions
    if (payload.status !== undefined) {
      const allowed = this.allowedTransitions(order.status);
      if (!allowed.has(payload.status)) {
        throw new BadRequestError(
          `Cannot transition from ${order.status} to ${payload.status}`,
        );
      }
    }

    const orderedAt =
      payload.status === PurchaseOrderStatus.ORDERED ? new Date() : undefined;

    return this.repository.update(orderId, {
      supplierId: payload.supplierId,
      notes: payload.notes,
      expectedAt: payload.expectedAt !== undefined
        ? payload.expectedAt ? new Date(payload.expectedAt) : null
        : undefined,
      status: payload.status,
      orderedAt,
    });
  }

  async cancelOrder(
    auth: TenantAuthContext,
    orderId: string,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);
    if (
      order.status === PurchaseOrderStatus.CANCELLED ||
      order.status === PurchaseOrderStatus.RECEIVED
    ) {
      throw new ConflictError(
        "Cannot cancel a received or already cancelled order",
        undefined,
        "purchase_order.not_cancellable",
      );
    }
    return this.repository.update(orderId, { status: PurchaseOrderStatus.CANCELLED });
  }

  async addItem(
    auth: TenantAuthContext,
    orderId: string,
    payload: AddPurchaseOrderItemDto,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictError(
        "Line items can only be added to DRAFT orders",
        undefined,
        "purchase_order.not_draft",
      );
    }

    // Validate inventory item belongs to tenant and same branch
    const item = await prisma.inventoryItem.findFirst({
      where: { id: payload.inventoryItemId, tenantId: auth.tenantId, branchId: order.branchId },
    });
    if (!item) {
      throw new NotFoundError(
        "Inventory item not found in this branch",
        undefined,
        "inventory.not_found",
      );
    }

    // Check duplicate
    const duplicate = order.items.find((i) => i.inventoryItemId === payload.inventoryItemId);
    if (duplicate) {
      throw new ConflictError(
        "This inventory item is already on this order",
        undefined,
        "purchase_order.item_duplicate",
      );
    }

    return this.repository.addItem(orderId, {
      inventoryItemId: payload.inventoryItemId,
      quantityOrdered: new Prisma.Decimal(payload.quantityOrdered),
      unitCost: payload.unitCost != null ? new Prisma.Decimal(payload.unitCost) : null,
    });
  }

  async updateItem(
    auth: TenantAuthContext,
    orderId: string,
    poItemId: string,
    payload: UpdatePurchaseOrderItemDto,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictError(
        "Line items can only be updated on DRAFT orders",
        undefined,
        "purchase_order.not_draft",
      );
    }
    const poItem = await this.repository.findPoItem(poItemId, orderId);
    if (!poItem) {
      throw new NotFoundError("Order line item not found", undefined, "purchase_order.item_not_found");
    }
    return this.repository.updateItem(poItemId, {
      quantityOrdered:
        payload.quantityOrdered !== undefined
          ? new Prisma.Decimal(payload.quantityOrdered)
          : undefined,
      unitCost:
        payload.unitCost !== undefined
          ? payload.unitCost != null ? new Prisma.Decimal(payload.unitCost) : null
          : undefined,
    });
  }

  async removeItem(
    auth: TenantAuthContext,
    orderId: string,
    poItemId: string,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictError(
        "Line items can only be removed from DRAFT orders",
        undefined,
        "purchase_order.not_draft",
      );
    }
    const poItem = await this.repository.findPoItem(poItemId, orderId);
    if (!poItem) {
      throw new NotFoundError("Order line item not found", undefined, "purchase_order.item_not_found");
    }
    return this.repository.removeItem(poItemId);
  }

  async receiveOrder(
    auth: TenantAuthContext,
    orderId: string,
    payload: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    const order = await this.getOrder(auth, orderId);

    if (!RECEIVABLE_STATUSES.has(order.status)) {
      throw new ConflictError(
        "Only ORDERED or PARTIALLY_RECEIVED orders can be received",
        undefined,
        "purchase_order.not_receivable",
      );
    }

    // Validate all line references exist in this order
    for (const line of payload.items) {
      const poItem = order.items.find((i) => i.id === line.purchaseOrderItemId);
      if (!poItem) {
        throw new NotFoundError(
          `Order line item ${line.purchaseOrderItemId} not found on this order`,
          undefined,
          "purchase_order.item_not_found",
        );
      }
    }

    let finalStatus: PurchaseOrderStatus = order.status;

    await prisma.$transaction(async (tx) => {
      for (const line of payload.items) {
        const poItem = order.items.find((i) => i.id === line.purchaseOrderItemId)!;
        const receivedQty = new Prisma.Decimal(line.quantityReceived);
        const costPrice = line.unitCost != null ? new Prisma.Decimal(line.unitCost) : null;

        // Upsert inventory batch
        const existingBatch = await tx.inventoryBatch.findUnique({
          where: {
            inventoryItemId_batchNumber: {
              inventoryItemId: poItem.inventoryItemId,
              batchNumber: line.batchNumber,
            },
          },
        });

        if (existingBatch) {
          await tx.inventoryBatch.update({
            where: { id: existingBatch.id },
            data: {
              quantityReceived: { increment: receivedQty },
              quantityOnHand: { increment: receivedQty },
              ...(costPrice != null ? { costPrice } : {}),
            },
          });
        } else {
          await tx.inventoryBatch.create({
            data: {
              tenantId: auth.tenantId,
              branchId: order.branchId,
              inventoryItemId: poItem.inventoryItemId,
              supplierId: order.supplierId ?? null,
              batchNumber: line.batchNumber,
              expiryDate: new Date(line.expiryDate),
              quantityReceived: receivedQty,
              quantityOnHand: receivedQty,
              ...(costPrice != null ? { costPrice } : {}),
            },
          });
        }

        // Update InventoryItem.quantityOnHand
        const currentItem = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: poItem.inventoryItemId },
          select: { quantityOnHand: true },
        });
        const qtyAfter = currentItem.quantityOnHand.add(receivedQty);

        await tx.inventoryItem.update({
          where: { id: poItem.inventoryItemId },
          data: { quantityOnHand: qtyAfter },
        });

        // Record INBOUND stock movement
        await stockMovementsRepository.createInTransaction(tx, {
          tenantId: auth.tenantId,
          branchId: order.branchId,
          inventoryItemId: poItem.inventoryItemId,
          movementType: StockMovementType.INBOUND,
          quantity: receivedQty,
          quantityBefore: currentItem.quantityOnHand,
          quantityAfter: qtyAfter,
          referenceType: "purchase_order",
          referenceId: order.id,
        });

        // Update PurchaseOrderItem.quantityReceived
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: { increment: receivedQty } },
        });
      }

      // Recalculate order status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });
      const allReceived = updatedItems.every((i) =>
        i.quantityReceived.gte(i.quantityOrdered),
      );
      const anyReceived = updatedItems.some((i) => i.quantityReceived.gt(0));
      const newStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : anyReceived
        ? PurchaseOrderStatus.PARTIALLY_RECEIVED
        : order.status;

      finalStatus = newStatus;

      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
    });

    // Fire-and-forget notification — runs after the transaction commits
    if (finalStatus === PurchaseOrderStatus.RECEIVED) {
      notificationsRepository
        .create({
          tenantId: auth.tenantId,
          userId: auth.userId,
          type: NotificationType.PURCHASE_ORDER_RECEIVED,
          title: "Purchase order received",
          body: `Purchase order #${order.orderNumber} has been fully received.`,
          metadata: {
            refId: orderId,
            purchaseOrderId: orderId,
            orderNumber: order.orderNumber,
            branchId: order.branchId,
          },
        })
        .catch((err: unknown) => {
          logger.error("purchasing: failed to create PURCHASE_ORDER_RECEIVED notification", {
            orderId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return this.repository.findById(auth.tenantId, orderId) as Promise<PurchaseOrderWithRelations>;
  }

  private allowedTransitions(current: PurchaseOrderStatus): Set<PurchaseOrderStatus> {
    const map: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      DRAFT: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED],
      ORDERED: [PurchaseOrderStatus.CANCELLED],
      PARTIALLY_RECEIVED: [],
      RECEIVED: [],
      CANCELLED: [],
    };
    return new Set(map[current]);
  }

  private async assertBranch(tenantId: string, branchId: string): Promise<void> {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) throw new ForbiddenError("Branch not found or does not belong to this tenant");
  }

  private async assertSupplier(tenantId: string, supplierId: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) {
      throw new NotFoundError("Supplier not found", undefined, "supplier.not_found");
    }
  }
}

export const purchasingService = new PurchasingService(purchasingRepository);
