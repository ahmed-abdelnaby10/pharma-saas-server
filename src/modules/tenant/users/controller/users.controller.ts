import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateUserDto,
  parseUpdateUserDto,
  parseQueryUsersDto,
  parseUserIdParam,
} from "../validators/users.validator";
import { mapUserResponse } from "../mapper/users.mapper";
import { usersService, UsersService } from "../service/users.service";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const query = parseQueryUsersDto(req.query);
    const users = await this.service.listUsers(auth, query);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        users.map(mapUserResponse),
        undefined,
        req.requestId,
      ),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const userId = parseUserIdParam(req.params);
    const user = await this.service.getUser(auth, userId);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapUserResponse(user),
        undefined,
        req.requestId,
      ),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const payload = parseCreateUserDto(req.body);
    const user = await this.service.createUser(auth, payload);

    return res.status(201).json(
      successResponse(
        req.t?.("user.created") || "User created",
        mapUserResponse(user),
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const userId = parseUserIdParam(req.params);
    const payload = parseUpdateUserDto(req.body);
    const user = await this.service.updateUser(auth, userId, payload);

    return res.status(200).json(
      successResponse(
        req.t?.("user.updated") || "User updated",
        mapUserResponse(user),
        undefined,
        req.requestId,
      ),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const userId = parseUserIdParam(req.params);
    const user = await this.service.deactivateUser(auth, userId);

    return res.status(200).json(
      successResponse(
        req.t?.("user.deactivated") || "User deactivated",
        mapUserResponse(user),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const usersController = new UsersController(usersService);
