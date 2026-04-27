import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { tenantSubscriptionService } from "../../subscription/service/tenant-subscription.service";
import { posService } from "../../pos/service/pos.service";
import { shiftsService } from "../../shifts/service/shifts.service";
import { stockMovementsService } from "../../stock-movements/service/stock-movements.service";
import { CreateSaleDto } from "../../pos/dto/create-sale.dto";
import { OpenShiftDto } from "../../shifts/dto/open-shift.dto";
import { CloseShiftDto } from "../../shifts/dto/close-shift.dto";
import { CreateStockMovementDto } from "../../stock-movements/dto/create-stock-movement.dto";

/** Increment this whenever the DB schema changes in a way that breaks the desktop SQLite mirror. */
export const SERVER_SCHEMA_VERSION = 1;

/** Minimum desktop schema version this server accepts. Force-update older clients. */
export const MIN_DESKTOP_SCHEMA_VERSION = 1;

// Minimal pass-through translator for push operations (errors carry their default message)
const t = (key: string) => key;

export class SyncService {
  /**
   * One-shot bootstrap payload for a fresh desktop install or after a cache wipe.
   * Returns everything the desktop needs to operate offline for its branch.
   */
  async bootstrap(auth: TenantAuthContext, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId: auth.tenantId, isActive: true },
      select: {
        id: true, nameEn: true, nameAr: true,
        address: true, phone: true, isDefault: true,
      },
    });
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }

    const [
      settings,
      catalogItems,
      inventoryItems,
      patients,
      activePrescriptions,
      openShift,
      subscription,
    ] = await Promise.all([
      prisma.tenantSettings.findUnique({ where: { tenantId: auth.tenantId } }),

      prisma.catalogItem.findMany({
        where: { isActive: true },
        select: {
          id: true, nameEn: true, nameAr: true,
          genericName: true, unitOfMeasure: true, category: true,
        },
      }),

      prisma.inventoryItem.findMany({
        where: { tenantId: auth.tenantId, branchId, isActive: true },
        include: {
          batches: {
            where: { isActive: true, quantityOnHand: { gt: 0 } },
            orderBy: [{ expiryDate: "asc" }],
          },
        },
      }),

      prisma.patient.findMany({
        where: { tenantId: auth.tenantId, isActive: true },
        select: {
          id: true, fullName: true, phone: true,
          email: true, nationalId: true, gender: true,
        },
      }),

      prisma.prescription.findMany({
        where: { tenantId: auth.tenantId, branchId, status: "PENDING" },
        include: { items: true },
      }),

      prisma.shift.findFirst({
        where: { tenantId: auth.tenantId, branchId, status: "OPEN" },
        include: { user: { select: { id: true, fullName: true } } },
      }),

      tenantSubscriptionService.getCurrent(auth),
    ]);

    return {
      schemaVersion: SERVER_SCHEMA_VERSION,
      branch,
      settings: settings
        ? {
            organizationName: settings.organizationName,
            taxId: settings.taxId,
            vatPercentage: settings.vatPercentage?.toString() ?? "0",
            receiptHeader: settings.receiptHeader,
            receiptFooter: settings.receiptFooter,
            defaultLanguage: settings.defaultLanguage,
          }
        : null,
      catalogItems,
      inventoryItems: inventoryItems.map((item) => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        branchId: item.branchId,
        quantityOnHand: item.quantityOnHand.toString(),
        reorderLevel: item.reorderLevel?.toString() ?? null,
        sellingPrice: item.sellingPrice?.toString() ?? null,
        isActive: item.isActive,
        batches: item.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantityOnHand: b.quantityOnHand.toString(),
          costPrice: b.costPrice?.toString() ?? null,
        })),
      })),
      patients,
      activePrescriptions,
      openShift,
      license: subscription.license,
    };
  }

  // ─── Delta Sync ─────────────────────────────────────────────────────────────

  async delta(auth: TenantAuthContext, branchId: string, since: Date) {
    const [inventoryItems, patients, prescriptions, catalog] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { tenantId: auth.tenantId, branchId, updatedAt: { gt: since } },
        include: {
          batches: {
            where: { isActive: true },
            orderBy: [{ expiryDate: "asc" }],
          },
        },
      }),

      prisma.patient.findMany({
        where: { tenantId: auth.tenantId, updatedAt: { gt: since } },
        select: {
          id: true, fullName: true, phone: true, email: true,
          nationalId: true, gender: true, isActive: true, updatedAt: true,
        },
      }),

      prisma.prescription.findMany({
        where: { tenantId: auth.tenantId, branchId, updatedAt: { gt: since } },
        include: { items: true },
      }),

      prisma.catalogItem.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, nameEn: true, nameAr: true,
          genericName: true, unitOfMeasure: true, category: true, isActive: true, updatedAt: true,
        },
      }),
    ]);

    return {
      since: since.toISOString(),
      asOf: new Date().toISOString(),
      inventoryItems: inventoryItems.map((item) => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        branchId: item.branchId,
        quantityOnHand: item.quantityOnHand.toString(),
        reorderLevel: item.reorderLevel?.toString() ?? null,
        sellingPrice: item.sellingPrice?.toString() ?? null,
        isActive: item.isActive,
        updatedAt: item.updatedAt,
        batches: item.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantityOnHand: b.quantityOnHand.toString(),
          costPrice: b.costPrice?.toString() ?? null,
          isActive: b.isActive,
        })),
      })),
      patients,
      prescriptions,
      catalog,
    };
  }

  // ─── Push batch ──────────────────────────────────────────────────────────────

  async push(auth: TenantAuthContext, operations: PushOperation[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const op of operations) {
      try {
        const id = await this.processPushOperation(auth, op);
        results.push({ externalId: op.externalId, status: "ok", id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code =
          err instanceof ConflictError
            ? "conflict"
            : err instanceof NotFoundError
            ? "not_found"
            : err instanceof BadRequestError
            ? "invalid"
            : "error";
        results.push({ externalId: op.externalId, status: "error", code, error: message });
      }
    }

    return results;
  }

  private async processPushOperation(
    auth: TenantAuthContext,
    op: PushOperation,
  ): Promise<string | undefined> {
    switch (op.type) {
      case "sale": {
        const sale = await posService.createSale(
          auth.tenantId,
          auth.userId,
          op.payload as unknown as CreateSaleDto,
          t,
        );
        return sale.id;
      }

      case "shift_open": {
        const shift = await shiftsService.openShift(
          auth,
          op.payload as unknown as OpenShiftDto,
        );
        return shift.id;
      }

      case "shift_close": {
        const payload = op.payload as unknown as CloseShiftDto & { shiftId: string };
        const shift = await shiftsService.closeShift(auth, payload.shiftId, payload);
        return shift.id;
      }

      case "stock_movement": {
        const movement = await stockMovementsService.createMovement(
          auth,
          op.payload as unknown as CreateStockMovementDto,
        );
        return movement.id;
      }

      default:
        throw new BadRequestError(`Unknown operation type: ${(op as { type: string }).type}`);
    }
  }

  // ─── Device management ───────────────────────────────────────────────────────

  async registerDevice(
    auth: TenantAuthContext,
    data: { branchId: string; fingerprint: string; label?: string | null },
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId: auth.tenantId, isActive: true },
    });
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }

    return prisma.device.upsert({
      where: { tenantId_fingerprint: { tenantId: auth.tenantId, fingerprint: data.fingerprint } },
      create: {
        tenantId: auth.tenantId,
        branchId: data.branchId,
        fingerprint: data.fingerprint,
        label: data.label ?? null,
        isActive: true,
        lastSyncAt: new Date(),
      },
      update: {
        branchId: data.branchId,
        ...(data.label !== undefined ? { label: data.label } : {}),
        isActive: true,
        lastSyncAt: new Date(),
      },
    });
  }

  async touchDevice(auth: TenantAuthContext, fingerprint: string) {
    await prisma.device.updateMany({
      where: { tenantId: auth.tenantId, fingerprint },
      data: { lastSyncAt: new Date() },
    });
  }

  async listDevices(auth: TenantAuthContext) {
    return prisma.device.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ lastSyncAt: "desc" }],
    });
  }

  async revokeDevice(auth: TenantAuthContext, deviceId: string) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, tenantId: auth.tenantId },
    });
    if (!device) {
      throw new NotFoundError("Device not found", undefined, "device.not_found");
    }
    return prisma.device.update({
      where: { id: deviceId },
      data: { isActive: false },
    });
  }
}

export const syncService = new SyncService();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PushOperation {
  externalId: string;
  type: "sale" | "shift_open" | "shift_close" | "stock_movement";
  payload: Record<string, unknown>;
}

export interface PushResult {
  externalId: string;
  status: "ok" | "error";
  id?: string;
  code?: string;
  error?: string;
}
