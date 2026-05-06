import { ActorType } from "@prisma/client";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { logAudit } from "../../../../core/audit/audit-logger";
import { notifySignupApproval } from "../../../../core/notifications/notification-sender";
import { plansRepository, PlansRepository } from "../../plans/repository/plans.repository";
import { tenantsRepository, TenantsRepository } from "../../tenants/repository/tenants.repository";
import { CreateSignupRequestDto } from "../dto/create-signup-request.dto";
import { QuerySignupRequestsDto } from "../dto/query-signup-requests.dto";
import { RejectSignupRequestDto } from "../dto/review-signup-request.dto";
import { mapSignupRequestResponse } from "../mapper/signups.mapper";
import { signupsRepository, SignupsRepository } from "../repository/signups.repository";

export class SignupsService {
  constructor(
    private readonly repository: SignupsRepository,
    private readonly plans: PlansRepository,
    private readonly tenants: TenantsRepository,
  ) {}

  async submit(payload: CreateSignupRequestDto) {
    // Plan must exist and be active
    const plan = await this.plans.findById(payload.planId);
    if (!plan) {
      throw new NotFoundError("Plan not found", { planId: payload.planId }, "plan.not_found");
    }
    if (!plan.isActive) {
      throw new ConflictError("Plan is not active", { planId: payload.planId }, "plan.inactive");
    }

    // Prevent duplicate pending requests from the same email
    const existing = await this.repository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError(
        "A pending signup request already exists for this email",
        { email: payload.email },
        "signup.duplicate",
      );
    }

    const request = await this.repository.create(payload);
    return mapSignupRequestResponse(request);
  }

  async list(query: QuerySignupRequestsDto) {
    const requests = await this.repository.list(query);
    return requests.map(mapSignupRequestResponse);
  }

  async getById(id: string) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundError("Signup request not found", { id }, "signup.not_found");
    }
    return mapSignupRequestResponse(request);
  }

  /**
   * Approve a signup request:
   *  1. Validates it is PENDING
   *  2. Creates Tenant + TenantSettings + trialing Subscription in one transaction
   *  3. Marks the request as APPROVED and links the new tenantId
   *  4. Writes a fire-and-forget audit log entry
   *  5. Dispatches fire-and-forget approval notifications (email stubs until
   *     the email service is wired up)
   */
  async approve(id: string, reviewedById: string) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundError("Signup request not found", { id }, "signup.not_found");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestError(
        "Only PENDING requests can be approved",
        { status: request.status },
        "signup.not_pending",
      );
    }

    // ── Gap #1: use the plan's actual trialDays (was hardcoded to 14) ────────
    // ── Gap #2: use the applicant's preferredLanguage (was hardcoded "en") ──
    const tenant = await this.tenants.createWithTransaction(
      {
        nameEn: request.pharmacyNameEn,
        nameAr: request.pharmacyNameAr,
        preferredLanguage: request.preferredLanguage,
        planId: request.planId,
      },
      { id: request.plan.id, trialDays: request.plan.trialDays },
    );

    const updated = await this.repository.approve(id, reviewedById, tenant.id);

    // ── Gap #3: audit log (fire-and-forget, never throws) ────────────────────
    logAudit({
      actorId: reviewedById,
      actorType: ActorType.PLATFORM_ADMIN,
      action: "signup.approve",
      resource: "TenantSignupRequest",
      resourceId: id,
      tenantId: tenant.id,
      metadata: {
        email: request.email,
        pharmacyNameEn: request.pharmacyNameEn,
        pharmacyNameAr: request.pharmacyNameAr,
        planId: request.planId,
        planCode: request.plan.code,
        trialDays: request.plan.trialDays,
        preferredLanguage: request.preferredLanguage,
      },
    });

    // ── Gap #4: inbox / email notifications (fire-and-forget stubs) ──────────
    // Email delivery is wired in once the notification service is ready.
    // Tenant inbox notifications will be created when the first tenant admin
    // user is registered (no userId exists yet at this stage).
    notifySignupApproval({
      email: request.email,
      pharmacyNameEn: request.pharmacyNameEn,
      pharmacyNameAr: request.pharmacyNameAr,
      preferredLanguage: request.preferredLanguage,
      tenantId: tenant.id,
    });

    return mapSignupRequestResponse(updated);
  }

  async reject(id: string, reviewedById: string, payload: RejectSignupRequestDto) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundError("Signup request not found", { id }, "signup.not_found");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestError(
        "Only PENDING requests can be rejected",
        { status: request.status },
        "signup.not_pending",
      );
    }

    const updated = await this.repository.reject(id, reviewedById, payload.rejectionReason);

    // Audit log for rejection (fire-and-forget)
    logAudit({
      actorId: reviewedById,
      actorType: ActorType.PLATFORM_ADMIN,
      action: "signup.reject",
      resource: "TenantSignupRequest",
      resourceId: id,
      metadata: {
        email: request.email,
        pharmacyNameEn: request.pharmacyNameEn,
        rejectionReason: payload.rejectionReason,
      },
    });

    return mapSignupRequestResponse(updated);
  }
}

export const signupsService = new SignupsService(
  signupsRepository,
  plansRepository,
  tenantsRepository,
);
