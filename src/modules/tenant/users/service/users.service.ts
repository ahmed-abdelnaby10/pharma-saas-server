import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { hashPassword } from "../../../../core/security/password";
import { usageLimitService } from "../../../../core/usage/usage-limit.service";
import { FeatureKey } from "../../../../shared/constants/feature-keys";
import { branchesRepository } from "../../branches/repository/branches.repository";
import { rolesRepository } from "../../roles/repository/roles.repository";
import { sendEmail } from "../../../../core/email/email.service";
import { buildWelcomeUserEmail } from "../../../../core/email/templates/welcome-user.template";
import { sendWhatsApp, tenantHasWhatsApp } from "../../../../core/whatsapp/whatsapp.service";
import { buildWelcomeUserWhatsApp } from "../../../../core/whatsapp/whatsapp.templates";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { QueryUsersDto } from "../dto/query-users.dto";
import { UserRecord } from "../mapper/users.mapper";
import { usersRepository } from "../repository/users.repository";

export class UsersService {
  /**
   * Fire-and-forget: sends welcome email + WhatsApp (if plan allows) to a
   * newly created user.  Never throws.
   */
  private dispatchWelcomeNotifications(
    tenantId: string,
    user: { fullName: string; email: string; phone?: string | null; preferredLanguage?: string | null },
    plainPassword: string,
  ): void {
    const lang = (user.preferredLanguage === "ar" ? "ar" : "en") as "en" | "ar";

    // Email — always sent
    void (async () => {
      const { subject, html } = buildWelcomeUserEmail({
        fullName: user.fullName,
        email:    user.email,
        password: plainPassword,
        lang,
      });
      await sendEmail({ to: user.email, subject, html });
    })();

    // WhatsApp — only if tenant plan includes it AND user has a phone
    if (user.phone) {
      void (async () => {
        const allowed = await tenantHasWhatsApp(tenantId);
        if (!allowed) return;
        const body = buildWelcomeUserWhatsApp({
          fullName: user.fullName,
          email:    user.email,
          password: plainPassword,
          lang,
        });
        await sendWhatsApp({ to: user.phone!, body });
      })();
    }
  }

  /**
   * Validate that the given branchId belongs to the tenant and is active.
   */
  private async validateBranch(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await branchesRepository.findById(tenantId, branchId);
    if (!branch) {
      throw new BadRequestError("Branch not found or does not belong to this tenant");
    }
    if (!branch.isActive) {
      throw new BadRequestError("Cannot assign user to an inactive branch");
    }
  }

  async listUsers(
    auth: TenantAuthContext,
    query: QueryUsersDto,
  ): Promise<UserRecord[]> {
    return usersRepository.list(auth.tenantId, query);
  }

  async getUser(auth: TenantAuthContext, userId: string): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    return user;
  }

  async createUser(
    auth: TenantAuthContext,
    payload: CreateUserDto,
  ): Promise<UserRecord> {
    const activeCount = await usersRepository.countActive(auth.tenantId);
    await usageLimitService.assertCountUnderLimit(
      auth.tenantId,
      FeatureKey.MAX_USERS,
      activeCount,
    );

    const existing = await usersRepository.findByEmail(
      auth.tenantId,
      payload.email,
    );
    if (existing) {
      throw new ConflictError(
        "A user with this email already exists",
        undefined,
        "user.email_conflict",
      );
    }

    if (payload.branchId) {
      await this.validateBranch(auth.tenantId, payload.branchId);
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await usersRepository.create({
      tenantId: auth.tenantId,
      email: payload.email,
      passwordHash,
      fullName: payload.fullName,
      phone: payload.phone,
      branchId: payload.branchId,
      preferredLanguage: payload.preferredLanguage,
    });

    // Assign role if provided
    if (payload.role) {
      const role = await rolesRepository.findByCode(auth.tenantId, payload.role);
      if (!role) {
        throw new BadRequestError(
          `Role "${payload.role}" does not exist for this tenant. Create it first.`,
          undefined,
          "role.not_found",
        );
      }
      await rolesRepository.assignRolesToUser(user.id, [role.id]);
      // Reload user so the response includes the freshly assigned role
      const updated = await usersRepository.findById(auth.tenantId, user.id);
      if (updated) {
        // Fire-and-forget: email + WhatsApp welcome
        this.dispatchWelcomeNotifications(auth.tenantId, {
          fullName:          payload.fullName,
          email:             payload.email,
          phone:             payload.phone,
          preferredLanguage: payload.preferredLanguage,
        }, payload.password);
        return updated;
      }
    }

    // Fire-and-forget: email + WhatsApp welcome
    this.dispatchWelcomeNotifications(auth.tenantId, {
      fullName:          payload.fullName,
      email:             payload.email,
      phone:             payload.phone,
      preferredLanguage: payload.preferredLanguage,
    }, payload.password);

    return user;
  }

  async updateUser(
    auth: TenantAuthContext,
    userId: string,
    payload: UpdateUserDto,
  ): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }

    if (payload.branchId) {
      await this.validateBranch(auth.tenantId, payload.branchId);
    }

    const passwordHash = payload.password
      ? await hashPassword(payload.password)
      : undefined;

    const updated = await usersRepository.update(auth.tenantId, userId, {
      fullName: payload.fullName,
      passwordHash,
      phone: payload.phone,
      branchId: payload.branchId,
      preferredLanguage: payload.preferredLanguage,
    });

    // Replace role when provided
    if (payload.role !== undefined) {
      // Remove all existing roles first
      const currentRoleIds = user.userRoles.map((ur) => ur.role.id);
      if (currentRoleIds.length > 0) {
        await rolesRepository.removeRolesFromUser(userId, currentRoleIds);
      }

      // Assign the new role (null means "remove role, leave unassigned")
      if (payload.role !== null) {
        const role = await rolesRepository.findByCode(auth.tenantId, payload.role);
        if (!role) {
          throw new BadRequestError(
            `Role "${payload.role}" does not exist for this tenant. Create it first.`,
            undefined,
            "role.not_found",
          );
        }
        await rolesRepository.assignRolesToUser(userId, [role.id]);
      }

      // Reload to return accurate roles array
      const reloaded = await usersRepository.findById(auth.tenantId, userId);
      if (reloaded) return reloaded;
    }

    return updated;
  }

  async deactivateUser(
    auth: TenantAuthContext,
    userId: string,
  ): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    if (!user.isActive) {
      throw new ConflictError(
        "User is already inactive",
        undefined,
        "user.already_inactive",
      );
    }
    return usersRepository.deactivate(auth.tenantId, userId);
  }
}

export const usersService = new UsersService();
