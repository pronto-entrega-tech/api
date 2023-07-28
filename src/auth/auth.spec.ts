import { MailerService } from '~/common/mailer/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { emailCustomer, validateDto } from '@test/examples/auth';
import { createCustomer } from '@test/examples/customer';
import { createOTP } from '@test/examples/otp';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { InMemoryRepositoriesModule } from '~/repositories/in-memory-repositories.module';
import { OTPRepository } from '~/repositories/otp/otp.repository';
import { SessionsRepository } from '~/repositories/sessions/sessions.repository';
import { Argon2Module } from './argon2.service';
import { AuthService } from './auth.service';
import { AuthToken } from './constants/auth-tokens';
import { JwtPayload } from './constants/jwt-payload';
import { Role } from './constants/roles';
import { SessionsModule } from './sessions/sessions.module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from 'assert';

class FakeMailer {
  sendMail = vi.fn();
}

let auth: AuthService;
let jwt: JwtService;
let mailer: MailerService;
let otpRepo: OTPRepository;
let sessionsRepo: SessionsRepository;
let customersRepo: CustomersRepository;
const { customer_id, email: customer_email } = createCustomer;

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [
      InMemoryRepositoriesModule,
      SessionsModule,
      Argon2Module.forRootAsync(),
    ],
    providers: [AuthService, { provide: MailerService, useClass: FakeMailer }],
  }).compile();

  auth = module.get(AuthService);
  jwt = module.get(JwtService);
  mailer = module.get(MailerService);
  otpRepo = module.get(OTPRepository);
  sessionsRepo = module.get(SessionsRepository);
  customersRepo = module.get(CustomersRepository);
});

describe('Email Customer', () => {
  it('call sendMail', async () => {
    await auth.email(emailCustomer);

    expect(mailer.sendMail).toBeCalled();
  });

  it('save otp', async () => {
    const { key } = await auth.email(emailCustomer);

    const otp = await otpRepo.findOne(key, Role.Customer);
    expect(otp).toBeDefined();
  });
});

describe('Validate Customer', () => {
  it('return Create Token, given customer do not exist', async () => {
    await otpRepo.create(createOTP);

    const res = await auth.validate(validateDto);

    const payload = await jwt.verifyAsync<JwtPayload>(res.token);
    expect(res.type).toEqual(AuthToken.Create);
    expect(payload).toMatchObject({
      sub: customer_email,
      type: AuthToken.Create,
      role: Role.Customer,
    });
  });

  it('return Access Token, given customer exist', async () => {
    await customersRepo.create(createCustomer);
    await otpRepo.create(createOTP);

    const res = await auth.validate(validateDto);

    const payload = await jwt.verifyAsync<JwtPayload>(res.token);
    expect(res.type).toEqual(AuthToken.Access);
    expect(payload).toMatchObject({
      sub: customer_id,
      type: AuthToken.Access,
      role: Role.Customer,
    });
  });

  it('create Session, given customer exist', async () => {
    await customersRepo.create(createCustomer);
    await otpRepo.create(createOTP);

    const { session } = await auth.validate(validateDto);

    if (!session) fail('Missing Session');
    const _session = await sessionsRepo.findOne(
      Role.Customer,
      session.refresh_token,
    );
    expect(_session).toMatchObject({
      user_id: customer_id,
      session_id: session.refresh_token,
      expires_in: session.expires_in,
    });
  });
});

describe('Revalidate Customer', () => {
  it('return Access Token', async () => {
    await customersRepo.create(createCustomer);
    await otpRepo.create(createOTP);
    const { session } = await auth.validate(validateDto);

    if (!session) fail('Missing Session');
    const res = await auth.revalidate(session.refresh_token, Role.Customer);

    const payload = await jwt.verifyAsync<JwtPayload>(res.access_token);
    expect(payload).toMatchObject({
      sub: customer_id,
      type: AuthToken.Access,
      role: Role.Customer,
    });
  });

  it('create new Session', async () => {
    await customersRepo.create(createCustomer);
    await otpRepo.create(createOTP);
    const { session } = await auth.validate(validateDto);

    if (!session) fail('Missing Session');
    const res = await auth.revalidate(session.refresh_token, Role.Customer);

    const _session = await sessionsRepo.findOne(
      Role.Customer,
      res.refresh_token,
    );
    expect(_session).toMatchObject({
      user_id: customer_id,
      session_id: res.refresh_token,
      expires_in: res.expires_in,
    });
  });

  it('delete old Session', async () => {
    await customersRepo.create(createCustomer);
    await otpRepo.create(createOTP);
    const { session } = await auth.validate(validateDto);

    if (!session) fail('Missing Session');
    await auth.revalidate(session.refresh_token, Role.Customer);

    const _session = await sessionsRepo.findOne(
      Role.Customer,
      session.refresh_token,
    );
    expect(_session).toBeNull();
  });
});
