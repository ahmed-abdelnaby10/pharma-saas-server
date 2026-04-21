import { Prisma, SaleStatus, ShiftStatus, StockMovementType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { posRepository } from "../repository/pos.repository";
import { settingsRepository } from "../../settings/repository/settings.repository";
import { stockMovementsRepository } from "../../stock-movements/repository/stock-movements.repository";
import { CreateSaleDto } from "../dto/create-sale.dto";
import { QuerySalesDto } from "../dto/query-sales.dto";
import { ReturnSaleDto } from "../dto/return-sale.dto";
import { SaleRecord, ReceiptRecord, TenantBranding } from "../mapper/pos.mapper";

function generateSaleNumber(): string {
  return "SALE-" + Date.now().toString(36).toUpperCase();
}

export class PosService {
  async listSales(
    tenantId: string,
    query: QuerySalesDto,
    t: Translator,
  ): Promise<SaleRecord[]> {
    return posRepository.list(tenantId, query);
  }

  async getSale(tenantId: string, saleId: string, t: Translator): Promise<SaleRecord> {
    const sale = await posRepository.findById(tenantId, saleId);
    if (!sale) {
      throw new NotFoundError(t("sale.not_found"));
    }
    return sale;
  }

  async getReceipt(
    tenantId: string,
    saleId: string,
    t: Translator,
  ): Promise<{ sale: ReceiptRecord; branding: TenantBranding }> {
    const sale = await posRepository.findReceiptById(tenantId, saleId);
    if (!sale) {
      throw new NotFoundError(t("sale.not_found"));
    }
    const settings = await settingsRepository.findByTenant(tenantId);
    const branding: TenantBranding = {
      organizationName: settings?.organizationName ?? null,
      taxId: settings?.taxId ?? null,
      receiptHeader: settings?.receiptHeader ?? null,
      receiptFooter: settings?.receiptFooter ?? null,
    };
    return { sale, branding };
  }

  async returnSale(
    tenantId: string,
    saleId: string,
    payload: ReturnSaleDto,
    t: Translator,
  ): Promise<SaleRecord> {
    // 1. Fetch the sale
    const sale = await posRepository.findById(tenantId, saleId);
    if (!sale) {
      throw new NotFoundError(t("sale.not_found"));
    }

    // 2. Guard: already cancelled
    if (sale.status === SaleStatus.CANCELLED) {
      throw new ConflictError(t("sale.already_cancelled"));
    }

    // 3. Fetch the OUTBOUND movements that were created for this sale
    const movements = await posRepository.findSaleMovements(tenantId, saleId);

    // 4. Atomic reversal: restore batches + items + create RETURN_IN movements + cancel sale
    const cancelled = await prisma.$transaction(async (tx) => {
      for (const movement of movements) {
        // Restore batch quantity (batchId may be null if batch was deleted)
        if (movement.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: movement.batchId },
          });
          if (batch) {
            const restoredQty = batch.quantityOnHand.add(movement.quantity);
            await tx.inventoryBatch.update({
              where: { id: movement.batchId },
              data: { quantityOnHand: restoredQty },
            });

            await stockMovementsRepository.createInTransaction(tx, {
              tenantId,
              branchId: sale.branchId,
              inventoryItemId: movement.inventoryItemId,
              batchId: movement.batchId,
              movementType: StockMovementType.RETURN_IN,
              quantity: movement.quantity,
              quantityBefore: batch.quantityOnHand,
              quantityAfter: restoredQty,
              referenceType: "sale_return",
              referenceId: saleId,
              ...(payload.notes != null ? { notes: payload.notes } : {}),
            });
          }
        }

        // Restore inventory item quantity
        await tx.inventoryItem.update({
          where: { id: movement.inventoryItemId },
          data: { quantityOnHand: { increment: movement.quantity } },
        });
      }

      // Cancel the sale
      return posRepository.cancelInTransaction(tx, saleId, payload.notes);
    });

    return cancelled;
  }

  async createSale(
    tenantId: string,
    userId: string,
    payload: CreateSaleDto,
    t: Translator,
  ): Promise<SaleRecord> {
    // 1. Validate shift is OPEN and belongs to branch
    const shift = await prisma.shift.findFirst({
      where: {
        id: payload.shiftId,
        tenantId,
        branchId: payload.branchId,
      },
    });
    if (!shift) {
      throw new NotFoundError(t("sale.not_found"));
    }
    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestError(t("sale.shift_not_open"));
    }

    // 2. Get VAT from tenant settings (default 0 if not configured)
    const settings = await settingsRepository.findByTenant(tenantId);
    const vatPercentage = settings?.vatPercentage ?? new Prisma.Decimal(0);

    // 3. For each sale line, resolve FEFO batches and validate stock
    type BatchConsumption = {
      batchId: string;
      quantity: Prisma.Decimal;
      quantityBefore: Prisma.Decimal;
      quantityAfter: Prisma.Decimal;
    };

    type LineResolution = {
      inventoryItemId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      itemQuantityBefore: Prisma.Decimal;
      itemQuantityAfter: Prisma.Decimal;
      batches: BatchConsumption[];
    };

    const resolutions: LineResolution[] = [];

    for (const line of payload.items) {
      const qty = new Prisma.Decimal(line.quantity);
      const unitPrice = new Prisma.Decimal(line.unitPrice);

      // Get current item quantity for movement tracking
      const item = await prisma.inventoryItem.findFirst({
        where: { id: line.inventoryItemId, tenantId, branchId: payload.branchId },
      });
      if (!item) {
        throw new NotFoundError(t("sale.not_found"));
      }

      // FEFO batch selection
      const batches = await posRepository.findFefoBatches(
        tenantId,
        payload.branchId,
        line.inventoryItemId,
      );

      let remaining = qty;
      const batchConsumptions: BatchConsumption[] = [];

      for (const batch of batches) {
        if (remaining.lte(0)) break;
        const consume = Prisma.Decimal.min(remaining, batch.quantityOnHand);
        batchConsumptions.push({
          batchId: batch.id,
          quantity: consume,
          quantityBefore: batch.quantityOnHand,
          quantityAfter: batch.quantityOnHand.sub(consume),
        });
        remaining = remaining.sub(consume);
      }

      if (remaining.gt(0)) {
        throw new BadRequestError(t("sale.insufficient_stock"));
      }

      const lineSubtotal = qty.mul(unitPrice).toDecimalPlaces(2);
      const itemQtyBefore = item.quantityOnHand;
      const itemQtyAfter = itemQtyBefore.sub(qty);

      resolutions.push({
        inventoryItemId: line.inventoryItemId,
        quantity: qty,
        unitPrice,
        subtotal: lineSubtotal,
        itemQuantityBefore: itemQtyBefore,
        itemQuantityAfter: itemQtyAfter,
        batches: batchConsumptions,
      });
    }

    // 4. Calculate totals
    const subtotal = resolutions
      .reduce((acc, r) => acc.add(r.subtotal), new Prisma.Decimal(0))
      .toDecimalPlaces(2);
    const vatAmount = subtotal
      .mul(vatPercentage)
      .div(100)
      .toDecimalPlaces(2);
    const total = subtotal.add(vatAmount).toDecimalPlaces(2);

    // 5. Validate payment amount covers total
    const paymentAmount = new Prisma.Decimal(payload.paymentAmount);
    if (paymentAmount.lt(total)) {
      throw new BadRequestError(t("sale.payment_shortfall"));
    }

    // 6. Execute $transaction: create Sale + SaleItems + Payment + OUTBOUND movements
    const saleNumber = generateSaleNumber();

    const sale = await prisma.$transaction(async (tx) => {
      // Create the sale with items and payment
      const created = await posRepository.createInTransaction(tx, {
        tenantId,
        branchId: payload.branchId,
        shiftId: payload.shiftId,
        saleNumber,
        subtotal,
        vatPercentage: new Prisma.Decimal(vatPercentage),
        vatAmount,
        total,
        notes: payload.notes,
        items: resolutions.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          subtotal: r.subtotal,
        })),
        payment: {
          paymentMethod: payload.paymentMethod,
          amount: paymentAmount,
          reference: payload.paymentReference,
        },
      });

      // OUTBOUND stock movements per batch + update batch.quantityOnHand + update item.quantityOnHand
      for (const resolution of resolutions) {
        for (const bc of resolution.batches) {
          await tx.inventoryBatch.update({
            where: { id: bc.batchId },
            data: { quantityOnHand: bc.quantityAfter },
          });

          await stockMovementsRepository.createInTransaction(tx, {
            tenantId,
            branchId: payload.branchId,
            inventoryItemId: resolution.inventoryItemId,
            batchId: bc.batchId,
            movementType: StockMovementType.OUTBOUND,
            quantity: bc.quantity,
            quantityBefore: bc.quantityBefore,
            quantityAfter: bc.quantityAfter,
            referenceType: "sale",
            referenceId: created.id,
          });
        }

        await tx.inventoryItem.update({
          where: { id: resolution.inventoryItemId },
          data: { quantityOnHand: resolution.itemQuantityAfter },
        });
      }

      return created;
    });

    return sale;
  }
}

export const posService = new PosService();
