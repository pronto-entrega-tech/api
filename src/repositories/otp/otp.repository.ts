import { Injectable } from "@nestjs/common";
import { otp } from "@prisma/client";
import { Role } from "~/auth/constants/roles";
import { prismaNotFound } from "~/common/prisma/handle-prisma-errors";
import { PrismaService } from "~/common/prisma/prisma.service";

@Injectable()
export class OTPRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Omit<otp, "otp_id">) {
    return this.prisma.otp.create({
      data: dto,
    });
  }

  async findOne(otp_id: string, role: Role, { includeExpired = false } = {}) {
    return this.prisma.otp.findFirst({
      where: {
        otp_id,
        role,
        expires_in: { gt: !includeExpired ? new Date() : undefined },
      },
    });
  }

  async delete(otp_id: string) {
    return this.prisma.otp
      .delete({ where: { otp_id } })
      .catch(prismaNotFound("OTP"));
  }

  async deleteExpired() {
    await this.prisma.otp.deleteMany({
      where: { expires_in: { lte: new Date() } },
    });
  }
}
