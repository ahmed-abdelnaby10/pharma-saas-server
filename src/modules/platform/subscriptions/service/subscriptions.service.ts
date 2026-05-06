import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { SubscriptionError } from "../../../../shared/errors/subscription-error";
import { plansRepository, PlansRepository } from "../../plans/repository/plans.repository";
import { tenantsRepository, TenantsRepository } from "../../tenants/repository/tenants.repository";
import { ChangeSubscriptionDto } from "../dto/change-subscription.dto";
import { CreateSubscriptionDto } from "../dto/create-subscription.dto";
import { QuerySubscriptionsDto } from "../dto/query-subscription.dto";
import { mapSubscriptionResponse } from "../mapper/subscriptions.mapper";
import {
  subscriptionsRepository,
  SubscriptionsRepository,
} from "../repository/subscriptions.repository";

export class SubscriptionsService {
  constructor(
    private readonly repository: SubscriptionsRepository,
    private readonly plans: PlansRepository,
    private readonly tenants: TenantsRepository,
  ) {}

  async createSubscription(
    tenantId: string,
    payload: CreateSubscriptionDto,
  ) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found", { tenantId }, "tenant.not_found");
    }

    const plan = await this.plans.findById(payload.planId);
    if (!plan) {
      throw new NotFoundError("Plan not found", { planId: payload.planId }, "plan.not_found");
    }
    if (!plan.isActive) {
      throw new ConflictError("Plan is not active", { planId: payload.planId }, "plan.inactive");
    }

    // Prevent duplicate active subscriptions
    const existing = await this.repository.findCurrentByTenant(tenantId);
    if (existing) {
      throw new ConflictError(
        "Tenant already has an active subscription",
        { tenantId, subscriptionId: existing.id },
        "subscription.already_active",
      );
    }

    const now = new Date();
    const stillInTrial =
      tenant.isTrialActive &&
      tenant.trialEndsAt !== null &&
      tenant.trialEndsAt > now;

    const subscription = await this.repository.create({
      tenantId,
      planId: plan.id,
      status: stillInTrial ? "trialing" : "active",
      startsAt: now,
      ...(stillInTrial && tenant.trialEndsAt
        ? { trialEndsAt: tenant.trialEndsAt }
        : {}),
    });

    return mapSubscriptionResponse(subscription);
  }

  async listSubscriptions(
    tenantId: string,
    query: QuerySubscriptionsDto,
  ) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found", { tenantId }, "tenant.not_found");
    }

    const subscriptions = await this.repository.listByTenant(tenantId, query);
    return subscriptions.map(mapSubscriptionResponse);
  }

  async getCurrentSubscription(tenantId: string) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found", { tenantId }, "tenant.not_found");
    }

    const subscription = await this.repository.findCurrentByTenant(tenantId);
    if (!subscription) {
      throw new NotFoundError(
        "No active subscription found",
        { tenantId },
        "subscription.not_found",
      );
    }

    return mapSubscriptionResponse(subscription);
  }

  async changePlan(
    tenantId: string,
    payload: ChangeSubscriptionDto,
  ) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found", { tenantId }, "tenant.not_found");
    }

    const newPlan = await this.plans.findById(payload.planId);
    if (!newPlan) {
      throw new NotFoundError("Plan not found", { planId: payload.planId }, "plan.not_found");
    }
    if (!newPlan.isActive) {
      throw new ConflictError("Plan is not active", { planId: payload.planId }, "plan.inactive");
    }

    const current = await this.repository.findCurrentByTenant(tenantId);
    if (!current) {
      throw new NotFoundError(
        "No active subscription found",
        { tenantId },
        "subscription.not_found",
      );
    }

    if (current.planId === newPlan.id) {
      throw new ConflictError(
        "Tenant is already on this plan",
        { tenantId, planId: newPlan.id },
        "subscription.same_plan",
      );
    }

    const updated = await this.repository.changePlanWithTransaction({
      tenantId,
      currentSubscriptionId: current.id,
      newPlanId: newPlan.id,
      newPlanTrialDays: newPlan.trialDays,
      tenantIsTrialActive: tenant.isTrialActive,
      tenantTrialEndsAt: tenant.trialEndsAt,
    });

    return mapSubscriptionResponse(updated);
  }

  async cancelSubscription(tenantId: string) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found", { tenantId }, "tenant.not_found");
    }

    const current = await this.repository.findCurrentByTenant(tenantId);
    if (!current) {
      throw new SubscriptionError(
        "No active subscription to cancel",
        { tenantId },
      );
    }

    const canceled = await this.repository.cancelWithTransaction({
      tenantId,
      subscriptionId: current.id,
      wasTrialing: current.status === "trialing",
    });

    return mapSubscriptionResponse(canceled);
  }
}

export const subscriptionsService = new SubscriptionsService(
  subscriptionsRepository,
  plansRepository,
  tenantsRepository,
);