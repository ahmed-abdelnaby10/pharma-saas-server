import { PlatformInvoiceStatus } from "@prisma/client";
import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { invoicesRepository } from "../repository/invoices.repository";
import { CreateInvoiceDto } from "../dto/create-invoice.dto";
import { QueryInvoicesDto } from "../dto/query-invoices.dto";
import { InvoiceRecord } from "../mapper/invoices.mapper";

export class InvoicesService {
  async listInvoices(query: QueryInvoicesDto, t: Translator): Promise<InvoiceRecord[]> {
    return invoicesRepository.list(query);
  }

  async getInvoice(invoiceId: string, t: Translator): Promise<InvoiceRecord> {
    const inv = await invoicesRepository.findById(invoiceId);
    if (!inv) throw new NotFoundError(t("invoice.not_found"));
    return inv;
  }

  async createInvoice(data: CreateInvoiceDto, t: Translator): Promise<InvoiceRecord> {
    return invoicesRepository.create({
      tenantId: data.tenantId,
      subscriptionId: data.subscriptionId,
      amount: data.amount,
      currency: data.currency ?? "EGP",
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      dueDate: data.dueDate,
      notes: data.notes,
    });
  }

  async issueInvoice(invoiceId: string, t: Translator): Promise<InvoiceRecord> {
    const inv = await invoicesRepository.findById(invoiceId);
    if (!inv) throw new NotFoundError(t("invoice.not_found"));
    if (inv.status !== PlatformInvoiceStatus.DRAFT) {
      throw new ConflictError(t("invoice.not_draft"));
    }
    return invoicesRepository.updateStatus(invoiceId, PlatformInvoiceStatus.ISSUED);
  }

  async markPaid(invoiceId: string, t: Translator): Promise<InvoiceRecord> {
    const inv = await invoicesRepository.findById(invoiceId);
    if (!inv) throw new NotFoundError(t("invoice.not_found"));
    const payable: PlatformInvoiceStatus[] = [
      PlatformInvoiceStatus.ISSUED,
      PlatformInvoiceStatus.OVERDUE,
    ];
    if (!payable.includes(inv.status)) {
      throw new ConflictError(t("invoice.not_payable"));
    }
    return invoicesRepository.updateStatus(invoiceId, PlatformInvoiceStatus.PAID, {
      paidAt: new Date(),
    });
  }

  async voidInvoice(invoiceId: string, t: Translator): Promise<InvoiceRecord> {
    const inv = await invoicesRepository.findById(invoiceId);
    if (!inv) throw new NotFoundError(t("invoice.not_found"));
    if (inv.status === PlatformInvoiceStatus.PAID) {
      throw new ConflictError(t("invoice.already_paid"));
    }
    if (inv.status === PlatformInvoiceStatus.VOID) {
      throw new ConflictError(t("invoice.already_void"));
    }
    return invoicesRepository.updateStatus(invoiceId, PlatformInvoiceStatus.VOID);
  }
}

export const invoicesService = new InvoicesService();
