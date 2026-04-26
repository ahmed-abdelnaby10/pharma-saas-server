import { Request, Response } from "express";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { syncService, SERVER_SCHEMA_VERSION, MIN_DESKTOP_SCHEMA_VERSION } from "../service/sync.service";
import {
  parseBootstrapQuery,
  parseDeltaQuery,
  parsePushBody,
  parseDeviceBody,
  parseDeviceIdParam,
} from "../validators/sync.validator";

class SyncController {
  /** GET /tenant/sync/schema-version */
  schemaVersion = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        serverSchemaVersion: SERVER_SCHEMA_VERSION,
        minDesktopSchemaVersion: MIN_DESKTOP_SCHEMA_VERSION,
      },
    });
  };

  /** GET /tenant/sync/bootstrap?branchId=X */
  bootstrap = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { branchId } = parseBootstrapQuery(req.query);
    const data = await syncService.bootstrap(auth, branchId);
    res.json({ success: true, data });
  };

  /** GET /tenant/sync/delta?branchId=X&since=ISO */
  delta = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { branchId, since } = parseDeltaQuery(req.query);
    const data = await syncService.delta(auth, branchId, new Date(since));
    res.json({ success: true, data });
  };

  /** POST /tenant/sync/push */
  push = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { operations } = parsePushBody(req.body);
    const results = await syncService.push(auth, operations);
    // Touch the device if fingerprint was provided
    const fingerprint = req.headers["x-device-fingerprint"];
    if (fingerprint && typeof fingerprint === "string") {
      void syncService.touchDevice(auth, fingerprint).catch(() => {/* best-effort */});
    }
    res.json({ success: true, data: { results } });
  };

  /** GET /tenant/sync/devices */
  listDevices = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const devices = await syncService.listDevices(auth);
    res.json({ success: true, data: devices });
  };

  /** POST /tenant/sync/devices */
  registerDevice = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const dto = parseDeviceBody(req.body);
    const device = await syncService.registerDevice(auth, dto);
    res.status(201).json({ success: true, data: device });
  };

  /** DELETE /tenant/sync/devices/:deviceId */
  revokeDevice = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const deviceId = parseDeviceIdParam(req.params);
    const device = await syncService.revokeDevice(auth, deviceId);
    res.json({ success: true, data: device });
  };
}

export const syncController = new SyncController();
