import { Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QuerySalesDto } from "../dto/query-sales.dto";
import { SaleRecord, ReceiptRecord } from "../mapper/pos.mapper";

const saleInclude = {
  items: true,
  payments: true,
} satisfies Prisma.SaleInclude;

const receiptInclude = {
  items: {
    include: {
      inventoryItem: {
        include: {
          catalogItem: { select: { nameEn: true, nameAr: true, unitOfMeasure: true } },
        },
      },
    },
  },
  payments: true,
  shift: {
    include: {
      user: { select: { id: true, fullName: true } },
    },
  },
  branch: { select: { id: true, nameEn: true, nameAr: true, address: true, phone: true } },
} satisfies Prisma.SaleInclude;

export class PosRepository {
  async list(tenantId: string, query: QuerySalesDto): Promise<SaleRecord[]> {
    return prisma.sale.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        ...(query.shiftId ? { shiftId: query.shiftId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      include: saleInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(tenantId: string, saleId: string): Promise<SaleRecord | null> {
    return prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: saleInclude,
    });
  }

  /**
   * Offline sync: look up a Sale by the client-generated externalId.
   * Used for data-level idempotency — if the record already exists we return
   * it instead of creating a duplicate, even if the Redis cache has expired.
   */
  async findByExternalId(
    tenantId: string,
    externalId: string,
  ): Promise<SaleRecord | null> {
    return prisma.sale.findUnique({
      where: { tenantId_externalId: { tenantId, externalId } },
      include: saleInclude,
    });
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      branchId: string;
      shiftId: string;
      saleNumber: string;
      subtotal: Prisma.Decimal;
      vatPercentage: Prisma.Decimal;
      vatAmount: Prisma.Decimal;
      total: Prisma.Decimal;
      notes?: string | null;
      externalId?: string | null;
      items: Array<{
        inventoryItemId: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }>;
      payment: {
        paymentMethod: string;
        amount: Prisma.Decimal;
        reference?: string | null;
      };
    },
  ): Promise<SaleRecord> {
    return tx.sale.create({
      data: {
        tenantId: data.tenantId,
        branchId: data.branchId,
        shiftId: data.shiftId,
        saleNumber: data.saleNumber,
        status: SaleStatus.COMPLETED,
        subtotal: data.subtotal,
        vatPercentage: data.vatPercentage,
        vatAmount: data.vatAmount,
        total: data.total,
        ...(data.notes != null ? { notes: data.notes } : {}),
        ...(data.externalId != null ? { externalId: data.externalId } : {}),
        items: {
          create: data.items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
        payments: {
          create: [
            {
              tenantId: data.tenantId,
              paymentMethod: data.payment.paymentMethod as never,
              amount: data.payment.amount,
              ...(data.payment.reference != null
                ? { reference: data.payment.reference }
                : {}),
            },
          ],
        },
      },
      include: saleInclude,
    });
  }

  async findReceiptById(tenantId: string, saleId: string): Promise<ReceiptRecord | null> {
    return prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: receiptInclude,
    }) as Promise<ReceiptRecord | null>;
  }

  /** Cancel a sale in a transaction — sets status to CANCELLED. */
  async cancelInTransaction(
    tx: Prisma.TransactionClient,
    saleId: string,
    notes?: string | null,
  ): Promise<SaleRecord> {
    return tx.sale.update({
      where: { id: saleId },
      data: {
        status: "CANCELLED",
        ...(notes !== undefined ? { notes } : {}),
      },
      include: saleInclude,
    });
  }

  /** Fetch OUTBOUND stock movements created for a given sale (to reverse them on return). */
  async findSaleMovements(tenantId: string, saleId: string) {
    return prisma.stockMovement.findMany({
      where: {
        tenantId,
        referenceType: "sale",
        referenceId: saleId,
        movementType: "OUTBOUND",
      },
    });
  }

  /** Find active (non-zero quantity) batches for an item, sorted FEFO (earliest expiry first). */
  async findFefoBatches(
    tenantId: string,
    branchId: string,
    inventoryItemId: string,
  ) {
    return prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        branchId,
        inventoryItemId,
        isActive: true,
        quantityOnHand: { gt: 0 },
      },
      orderBy: [{ expiryDate: "asc" }],
    });
  }
}

export const posRepository = new PosRepository();
