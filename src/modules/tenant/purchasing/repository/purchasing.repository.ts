import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryPurchaseOrdersDto } from "../dto/query-purchase-orders.dto";
import { PurchaseOrderWithRelations } from "../mapper/purchasing.mapper";

const orderInclude = {
  supplier: true,
  items: {
    include: {
      inventoryItem: { include: { catalogItem: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.PurchaseOrderInclude;

export class PurchasingRepository {
  async findByExternalId(tenantId: string, externalId: string): Promise<PurchaseOrderWithRelations | null> {
    return prisma.purchaseOrder.findUnique({
      where: { tenantId_externalId: { tenantId, externalId } },
      include: orderInclude,
    });
  }

  async list(tenantId: string, query: QueryPurchaseOrdersDto): Promise<PurchaseOrderWithRelations[]> {
    return prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      include: orderInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(tenantId: string, orderId: string): Promise<PurchaseOrderWithRelations | null> {
    return prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      include: orderInclude,
    });
  }

  async findByOrderNumber(
    tenantId: string,
    orderNumber: string,
  ): Promise<PurchaseOrderWithRelations | null> {
    return prisma.purchaseOrder.findUnique({
      where: { tenantId_orderNumber: { tenantId, orderNumber } },
      include: orderInclude,
    });
  }

  async create(
    tenantId: string,
    data: {
      branchId: string;
      supplierId?: string | null;
      orderNumber: string;
      notes?: string | null;
      expectedAt?: Date | null;
      externalId?: string | null;
    },
  ): Promise<PurchaseOrderWithRelations> {
    return prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId: data.branchId,
        ...(data.supplierId != null ? { supplierId: data.supplierId } : {}),
        orderNumber: data.orderNumber,
        ...(data.notes != null ? { notes: data.notes } : {}),
        ...(data.expectedAt != null ? { expectedAt: data.expectedAt } : {}),
        ...(data.externalId != null ? { externalId: data.externalId } : {}),
      },
      include: orderInclude,
    });
  }

  async update(
    orderId: string,
    data: {
      supplierId?: string | null;
      notes?: string | null;
      expectedAt?: Date | null;
      status?: PurchaseOrderStatus;
      orderedAt?: Date | null;
    },
  ): Promise<PurchaseOrderWithRelations> {
    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.expectedAt !== undefined ? { expectedAt: data.expectedAt } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.orderedAt !== undefined ? { orderedAt: data.orderedAt } : {}),
      },
      include: orderInclude,
    });
  }

  async addItem(
    orderId: string,
    data: {
      inventoryItemId: string;
      quantityOrdered: Prisma.Decimal;
      unitCost?: Prisma.Decimal | null;
    },
  ): Promise<PurchaseOrderWithRelations> {
    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: orderId,
        inventoryItemId: data.inventoryItemId,
        quantityOrdered: data.quantityOrdered,
        ...(data.unitCost != null ? { unitCost: data.unitCost } : {}),
      },
    });
    return prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: orderInclude,
    });
  }

  async updateItem(
    poItemId: string,
    data: { quantityOrdered?: Prisma.Decimal; unitCost?: Prisma.Decimal | null },
  ): Promise<PurchaseOrderWithRelations> {
    const item = await prisma.purchaseOrderItem.update({
      where: { id: poItemId },
      data: {
        ...(data.quantityOrdered !== undefined ? { quantityOrdered: data.quantityOrdered } : {}),
        ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
      },
    });
    return prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: item.purchaseOrderId },
      include: orderInclude,
    });
  }

  async removeItem(poItemId: string): Promise<PurchaseOrderWithRelations> {
    const item = await prisma.purchaseOrderItem.delete({ where: { id: poItemId } });
    return prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: item.purchaseOrderId },
      include: orderInclude,
    });
  }

  async findPoItem(poItemId: string, orderId: string) {
    return prisma.purchaseOrderItem.findFirst({
      where: { id: poItemId, purchaseOrderId: orderId },
      include: { inventoryItem: true },
    });
  }
}

export const purchasingRepository = new PurchasingRepository();
