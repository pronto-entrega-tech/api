import { Injectable } from '@nestjs/common';
import { otp } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Role } from '~/auth/constants/roles';
import { NotFoundError } from '~/common/errors/not-found';

@Injectable()
export class InMemoryOTPRepository {
  private OTPs = [] as otp[];

  async create(dto: otp) {
    this.OTPs.push({
      ...dto,
      otp_id: dto.otp_id ?? randomUUID(),
    });
    return this.OTPs.at(-1);
  }

  async findOne(
    otp_id: string,
    role: Role,
    options?: { includeExpired: boolean },
  ) {
    const otp = this.OTPs.find(
      (otp) =>
        otp.otp_id === otp_id &&
        otp.role === role &&
        (options?.includeExpired || +otp.expires_in > Date.now()),
    );
    return otp ?? null;
  }

  async delete(otp_id: string) {
    const i = this.OTPs.findIndex((otp) => otp.otp_id === otp_id);
    if (i < 0) throw new NotFoundError('OTP');

    return this.OTPs.splice(i, 1)[0];
  }

  async deleteExpired() {
    this.OTPs = this.OTPs.filter((otp) => +otp.expires_in > Date.now());
  }
}
