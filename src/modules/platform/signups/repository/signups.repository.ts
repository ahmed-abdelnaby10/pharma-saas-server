import { prisma } from "../../../../core/db/prisma";
import { CreateSignupRequestDto } from "../dto/create-signup-request.dto";
import { QuerySignupRequestsDto } from "../dto/query-signup-requests.dto";
import { signupRequestSelect, SignupRequestRecord } from "../mapper/signups.mapper";

export class SignupsRepository {
  async findById(id: string): Promise<SignupRequestRecord | null> {
    return prisma.tenantSignupRequest.findUnique({
      where: { id },
      select: signupRequestSelect,
    });
  }

  /**
   * Returns the most recent request for this email that blocks a new submission:
   *   PENDING  → already under review
   *   APPROVED → tenant already exists for this email (should log in instead)
   * REJECTED requests are intentionally excluded so the applicant can reapply.
   */
  async findBlockingByEmail(email: string): Promise<SignupRequestRecord | null> {
    return prisma.tenantSignupRequest.findFirst({
      where: { email, status: { in: ["PENDING", "APPROVED"] } },
      select: signupRequestSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async list(query: QuerySignupRequestsDto): Promise<SignupRequestRecord[]> {
    return prisma.tenantSignupRequest.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { pharmacyNameEn: { contains: query.search, mode: "insensitive" } },
                { pharmacyNameAr: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: signupRequestSelect,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async create(
    data: Omit<CreateSignupRequestDto, "password"> & { passwordHash: string },
  ): Promise<SignupRequestRecord> {
    return prisma.tenantSignupRequest.create({
      data,
      select: signupRequestSelect,
    });
  }

  async approve(
    id: string,
    reviewedById: string,
    tenantId: string,
  ): Promise<SignupRequestRecord> {
    return prisma.tenantSignupRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById,
        reviewedAt: new Date(),
        tenantId,
      },
      select: signupRequestSelect,
    });
  }

  async reject(
    id: string,
    reviewedById: string,
    rejectionReason: string,
  ): Promise<SignupRequestRecord> {
    return prisma.tenantSignupRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById,
        reviewedAt: new Date(),
        rejectionReason,
      },
      select: signupRequestSelect,
    });
  }
}

export const signupsRepository = new SignupsRepository();
