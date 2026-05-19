import { PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreateSupplierDto } from "../dto/create-supplier.dto";
import { UpdateSupplierDto } from "../dto/update-supplier.dto";
import { QuerySuppliersDto } from "../dto/query-suppliers.dto";
import { SupplierRecord, SupplierPaymentRecord, SupplierFinancials } from "../mapper/suppliers.mapper";

// Purchase orders that represent real financial obligations
const COMMITTED_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.ORDERED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
];

export class SuppliersRepository {
  // ── Supplier CRUD ────────────────────────────────────────────────────────────

  async findById(tenantId: string, supplierId: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
  }

  async findByNameEn(tenantId: string, nameEn: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findUnique({
      where: { tenantId_nameEn: { tenantId, nameEn } },
    });
  }

  async findByNameAr(tenantId: string, nameAr: string): Promise<SupplierRecord | null> {
    return prisma.supplier.findUnique({
      where: { tenantId_nameAr: { tenantId, nameAr } },
    });
  }

  async list(tenantId: string, query: QuerySuppliersDto): Promise<SupplierRecord[]> {
    return prisma.supplier.findMany({
      where: {
        tenantId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                { nameEn: { contains: query.search, mode: "insensitive" } },
                { nameAr: { contains: query.search, mode: "insensitive" } },
                { contactName: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ nameEn: "asc" }],
    });
  }

  async create(tenantId: string, payload: CreateSupplierDto): Promise<SupplierRecord> {
    return prisma.supplier.create({ data: { tenantId, ...payload } });
  }

  async update(
    tenantId: string,
    supplierId: string,
    payload: UpdateSupplierDto,
  ): Promise<SupplierRecord> {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: payload,
    });
  }

  async deactivate(tenantId: string, supplierId: string): Promise<SupplierRecord> {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    });
  }

  // ── Financials ────────────────────────────────────────────────────────────────

  async getFinancials(tenantId: string, supplierId: string): Promise<SupplierFinancials> {
    // Run all queries in parallel
    const [poLines, paidAgg, ordersBreakdownRaw, lastPayment] = await Promise.all([
      // All line items from committed POs for this supplier
      prisma.purchaseOrderItem.findMany({
        where: {
          purchaseOrder: {
            tenantId,
            supplierId,
            status: { in: COMMITTED_STATUSES },
          },
        },
        select: { quantityOrdered: true, unitCost: true },
      }),

      // Sum of all payments made to this supplier
      prisma.supplierPayment.aggregate({
        where: { tenantId, supplierId },
        _sum: { amount: true },
      }),

      // Count of POs per committed status
      prisma.purchaseOrder.groupBy({
        by: ["status"],
        where: { tenantId, supplierId, status: { in: COMMITTED_STATUSES } },
        _count: { _all: true },
      }),

      // Most recent payment
      prisma.supplierPayment.findFirst({
        where: { tenantId, supplierId },
        orderBy: { paidAt: "desc" },
        select: { amount: true, paidAt: true },
      }),
    ]);

    // Compute totalOrdered from line items (handle null unitCost gracefully)
    const totalOrdered = poLines.reduce((sum, line) => {
      if (!line.unitCost) return sum;
      return sum + Number(line.quantityOrdered) * Number(line.unitCost);
    }, 0);

    const totalPaid = Number(paidAgg._sum.amount ?? 0);

    // Build breakdown map
    const breakdown = { ORDERED: 0, PARTIALLY_RECEIVED: 0, RECEIVED: 0 };
    let ordersCount = 0;
    for (const row of ordersBreakdownRaw) {
      const count = row._count._all;
      ordersCount += count;
      if (row.status === PurchaseOrderStatus.ORDERED)             breakdown.ORDERED             = count;
      if (row.status === PurchaseOrderStatus.PARTIALLY_RECEIVED)  breakdown.PARTIALLY_RECEIVED  = count;
      if (row.status === PurchaseOrderStatus.RECEIVED)            breakdown.RECEIVED            = count;
    }

    return {
      totalOrdered:       parseFloat(totalOrdered.toFixed(2)),
      totalPaid:          parseFloat(totalPaid.toFixed(2)),
      outstanding:        parseFloat((totalOrdered - totalPaid).toFixed(2)),
      ordersCount,
      lastPaymentAmount:  lastPayment ? Number(lastPayment.amount) : null,
      lastPaymentDate:    lastPayment ? lastPayment.paidAt.toISOString() : null,
      ordersBreakdown:    breakdown,
    };
  }

  // ── Supplier Payments ─────────────────────────────────────────────────────────

  async listPayments(tenantId: string, supplierId: string): Promise<SupplierPaymentRecord[]> {
    return prisma.supplierPayment.findMany({
      where: { tenantId, supplierId },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { paidAt: "desc" },
    }) as Promise<SupplierPaymentRecord[]>;
  }

  async findPaymentById(
    tenantId: string,
    supplierId: string,
    paymentId: string,
  ): Promise<SupplierPaymentRecord | null> {
    return prisma.supplierPayment.findFirst({
      where: { id: paymentId, tenantId, supplierId },
      include: { createdBy: { select: { id: true, fullName: true } } },
    }) as Promise<SupplierPaymentRecord | null>;
  }

  async createPayment(
    tenantId: string,
    supplierId: string,
    createdById: string,
    payload: {
      amount: number;
      method: string;
      reference?: string;
      paidAt?: string;
      notes?: string;
    },
  ): Promise<SupplierPaymentRecord> {
    return prisma.supplierPayment.create({
      data: {
        tenantId,
        supplierId,
        createdById,
        amount:    payload.amount,
        method:    payload.method as any,
        reference: payload.reference,
        notes:     payload.notes,
        ...(payload.paidAt ? { paidAt: new Date(payload.paidAt) } : {}),
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    }) as Promise<SupplierPaymentRecord>;
  }

  async deletePayment(
    tenantId: string,
    supplierId: string,
    paymentId: string,
  ): Promise<void> {
    await prisma.supplierPayment.delete({
      where: { id: paymentId, tenantId, supplierId },
    });
  }
}

export const suppliersRepository = new SuppliersRepository();
