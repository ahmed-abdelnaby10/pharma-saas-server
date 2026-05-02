import { Prisma, PlatformInvoiceStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryInvoicesDto } from "../dto/query-invoices.dto";
import { InvoiceRecord } from "../mapper/invoices.mapper";

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${year}-${suffix}`;
}

export class InvoicesRepository {
  async list(query: QueryInvoicesDto): Promise<InvoiceRecord[]> {
    return prisma.platformInvoice.findMany({
      where: {
        ...(query.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(invoiceId: string): Promise<InvoiceRecord | null> {
    return prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
  }

  async create(data: {
    tenantId: string;
    subscriptionId?: string;
    amount: Prisma.Decimal | number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    notes?: string;
  }): Promise<InvoiceRecord> {
    const invoiceNumber = generateInvoiceNumber();
    return prisma.platformInvoice.create({
      data: {
        ...data,
        invoiceNumber,
        amount: new Prisma.Decimal(data.amount),
      },
    });
  }

  async updateStatus(
    invoiceId: string,
    status: PlatformInvoiceStatus,
    extra?: { paidAt?: Date },
  ): Promise<InvoiceRecord> {
    return prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status,
        ...(extra?.paidAt !== undefined ? { paidAt: extra.paidAt } : {}),
      },
    });
  }
}

export const invoicesRepository = new InvoicesRepository();
