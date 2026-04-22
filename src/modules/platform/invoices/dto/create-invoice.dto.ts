export interface CreateInvoiceDto {
  tenantId: string;
  subscriptionId?: string;
  amount: number;
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  notes?: string;
}
