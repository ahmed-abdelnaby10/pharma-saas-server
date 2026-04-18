import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateRoleDto,
  parseUpdateRoleDto,
  parseRoleIdParam,
  parseUserIdParam,
  parseAssignPermissionsDto,
  parseAssignRolesDto,
} from "../validators/roles.validator";
import { mapRoleResponse } from "../mapper/roles.mapper";
import { rolesService, RolesService } from "../service/roles.service";

export class RolesController {
  constructor(private readonly service: RolesService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roles = await this.service.listRoles(auth);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", roles.map(mapRoleResponse), undefined, req.requestId),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roleId = parseRoleIdParam(req.params);
    const role = await this.service.getRole(auth, roleId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreateRoleDto(req.body);
    const role = await this.service.createRole(auth, payload);
    return res.status(201).json(
      successResponse(req.t?.("role.created") || "Role created", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roleId = parseRoleIdParam(req.params);
    const payload = parseUpdateRoleDto(req.body);
    const role = await this.service.updateRole(auth, roleId, payload);
    return res.status(200).json(
      successResponse(req.t?.("role.updated") || "Role updated", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roleId = parseRoleIdParam(req.params);
    const role = await this.service.deactivateRole(auth, roleId);
    return res.status(200).json(
      successResponse(req.t?.("role.deactivated") || "Role deactivated", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  // ── Permission assignment ──────────────────────────────────────────────────

  assignPermissions = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roleId = parseRoleIdParam(req.params);
    const { permissionIds } = parseAssignPermissionsDto(req.body);
    const role = await this.service.assignPermissions(auth, roleId, permissionIds);
    return res.status(200).json(
      successResponse(req.t?.("role.permissions_assigned") || "Permissions assigned", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  removePermissions = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const roleId = parseRoleIdParam(req.params);
    const { permissionIds } = parseAssignPermissionsDto(req.body);
    const role = await this.service.removePermissions(auth, roleId, permissionIds);
    return res.status(200).json(
      successResponse(req.t?.("role.permissions_removed") || "Permissions removed", mapRoleResponse(role), undefined, req.requestId),
    );
  };

  // ── User-role assignment ───────────────────────────────────────────────────

  getUserRoles = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const userId = parseUserIdParam(req.params);
    const roles = await this.service.getUserRoles(auth, userId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", roles.map(mapRoleResponse), undefined, req.requestId),
    );
  };

  assignRolesToUser = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const userId = parseUserIdParam(req.params);
    const { roleIds } = parseAssignRolesDto(req.body);
    const roles = await this.service.assignRolesToUser(auth, userId, roleIds);
    return res.status(200).json(
      successResponse(req.t?.("role.assigned_to_user") || "Roles assigned", roles.map(mapRoleResponse), undefined, req.requestId),
    );
  };

  removeRolesFromUser = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const userId = parseUserIdParam(req.params);
    const { roleIds } = parseAssignRolesDto(req.body);
    const roles = await this.service.removeRolesFromUser(auth, userId, roleIds);
    return res.status(200).json(
      successResponse(req.t?.("role.removed_from_user") || "Roles removed", roles.map(mapRoleResponse), undefined, req.requestId),
    );
  };
}

export const rolesController = new RolesController(rolesService);
