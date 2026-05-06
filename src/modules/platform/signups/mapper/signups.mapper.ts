import { Prisma } from "@prisma/client";

const signupRequestSelect = {
  id: true,
  planId: true,
  fullName: true,
  email: true,
  phone: true,
  pharmacyNameEn: true,
  pharmacyNameAr: true,
  preferredLanguage: true,
  notes: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  rejectionReason: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  plan: { select: { id: true, code: true, name: true, trialDays: true } },
} satisfies Prisma.TenantSignupRequestSelect;

export type SignupRequestRecord = Prisma.TenantSignupRequestGetPayload<{
  select: typeof signupRequestSelect;
}>;

export { signupRequestSelect };

export function mapSignupRequestResponse(record: SignupRequestRecord) {
  return {
    id: record.id,
    planId: record.planId,
    plan: record.plan,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    pharmacyNameEn: record.pharmacyNameEn,
    pharmacyNameAr: record.pharmacyNameAr,
    preferredLanguage: record.preferredLanguage,
    notes: record.notes,
    status: record.status,
    reviewedById: record.reviewedById,
    reviewedAt: record.reviewedAt,
    rejectionReason: record.rejectionReason,
    tenantId: record.tenantId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
