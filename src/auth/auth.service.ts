import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { fail } from "assert";
import { randomUUID } from "crypto";
import { LockedAction } from "~/common/constants/locked-actions";
import { MailerService } from "~/common/mailer/mailer.service";
import { MutexService } from "~/common/mutex/mutex.service";
import { AdminRepository } from "~/repositories/admin/admin.repository";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { OTPRepository } from "~/repositories/otp/otp.repository";
import { SessionsRepository } from "~/repositories/sessions/sessions.repository";
import { Argon2Service } from "./argon2.service";
import { AuthToken } from "./constants/auth-tokens";
import { Role, RoleWithoutSub } from "./constants/roles";
import { SubPermission } from "./constants/sub-permissions";
import { EmailDto } from "./dto/email.dto";
import { ValidateDto } from "./dto/validate.dto";
import { otpEmail } from "./functions/otp-email";
import { SessionsService } from "./sessions/sessions.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly sessions: SessionsService,
    private readonly mailer: MailerService,
    private readonly argon2: Argon2Service,
    private readonly mutex: MutexService,
    private readonly otpRepo: OTPRepository,
    private readonly sessionsRepo: SessionsRepository,
    private readonly adminRepo: AdminRepository,
    private readonly customersRepo: CustomersRepository,
    private readonly marketsRepo: MarketsRepository
  ) {}
  private readonly logger = new Logger(AuthService.name);
  private readonly OTP_SECRET =
    process.env.OTP_SECRET ?? fail("OTP_SECRET must be defined");

  @Cron("0 0 * * *")
  deleteExpired() {
    this.otpRepo.deleteExpired().catch((error) => this.logger.error(error));
    this.sessionsRepo
      .deleteExpired()
      .catch((error) => this.logger.error(error));
  }

  email(dto: EmailDto) {
    return otpEmail(dto, {
      fakeKey: randomUUID,
      adminExist: () => this.adminRepo.exist(dto.email),
      createOtpHash: (otp) => this.argon2.hash(otp + this.OTP_SECRET),
      saveOtp: (otpDto) => this.otpRepo.create(otpDto),
      sendMail: (mail) => this.mailer.sendMail(mail),
    });
  }

  async validate(dto: ValidateDto) {
    const { role } = dto;

    const email = await this.validateOtp(dto);
    const id = await this.findId(role, email);

    const type = id ? AuthToken.Access : AuthToken.Create;
    const [session, token] = await Promise.all([
      id ? await this.sessions.create(id, role) : undefined,
      this.sessions.genToken({ sub: id ?? email, role, type }),
    ]);

    return { token, type, session };
  }

  private async validateOtp({ key, otp, role }: ValidateDto) {
    const otpInstance = await this.otpRepo.findOne(key, role);
    if (!otpInstance) {
      await this.argon2.pseudoVerify();
      throw new UnauthorizedException();
    }
    const { otp: otpHash, email } = otpInstance;

    const isOtpValid = await this.argon2.verify(otpHash, otp + this.OTP_SECRET);
    if (!isOtpValid) throw new UnauthorizedException();

    await this.otpRepo.delete(key);

    return email;
  }

  private async findId(role: RoleWithoutSub, email: string) {
    return {
      [Role.Admin]: () => this.adminRepo.findId(email),
      [Role.Customer]: () => this.customersRepo.findId(email),
      [Role.Market]: () => this.marketsRepo.findId(email),
    }[role]();
  }

  async revalidate(token: string, role: Role) {
    const revalidate = async () => {
      const session = await this.sessionsRepo.findOne(role, token);
      if (!session) throw new UnauthorizedException();

      return role === Role.MarketSub
        ? this.reconnect(token, session.user_id)
        : this.sessions.recreateAndGenToken(token, {
            sub: session.user_id,
            role,
          });
    };
    return this.mutex.exec(LockedAction.Revalidate, token, revalidate);
  }

  async signOut(token: string, role: Role) {
    // Don't inform if that session is not founded
    await this.sessionsRepo.delete(role, token).catch();
  }

  async connect(id: string) {
    const sub = await this.marketsRepo.subs.findOneById(id);

    return this.sessions.createAndGenToken({
      sub: id,
      role: Role.MarketSub,
      market_id: sub.market_id,
      sub_permissions: sub.permissions as SubPermission[],
    });
  }

  async reconnect(token: string, id: string) {
    const sub = await this.marketsRepo.subs.findOneById(id);

    return this.sessions.recreateAndGenToken(token, {
      sub: id,
      role: Role.MarketSub,
      market_id: sub.market_id,
      sub_permissions: sub.permissions as SubPermission[],
    });
  }
}
