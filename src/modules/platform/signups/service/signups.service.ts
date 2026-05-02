import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
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
   *  2. Creates a Tenant + default Subscription (via existing transaction helper)
   *  3. Marks the request as APPROVED and links the tenant
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

    // Create tenant (also creates trialing subscription)
    const tenant = await this.tenants.createWithTransaction(
      {
        nameEn: request.pharmacyNameEn,
        nameAr: request.pharmacyNameAr,
        preferredLanguage: "en",
        planId: request.planId,
      },
      { id: request.plan.id, trialDays: 14 },
    );

    const updated = await this.repository.approve(id, reviewedById, tenant.id);
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
    return mapSignupRequestResponse(updated);
  }
}

export const signupsService = new SignupsService(
  signupsRepository,
  plansRepository,
  tenantsRepository,
);
