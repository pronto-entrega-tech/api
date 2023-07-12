import { otp } from '@prisma/client';
import { addMinutes } from 'date-fns';
import Mail from 'nodemailer/lib/mailer';
import { EmailHtml } from '~/common/emails';
import { CreateUrl } from '~/common/functions/create-url';
import { randomNumber } from '~/common/functions/random-number';
import { otpValidMinutes } from '../constants/opt-expiration';
import { Role } from '../constants/roles';
import { EmailDto } from '../dto/email.dto';

type IO = {
  adminExist(): Promise<boolean>;
  fakeKey(): string;
  createOtpHash(otp: string): Promise<string>;
  saveOtp(dto: Omit<otp, 'otp_id'>): Promise<{ otp_id: string }>;
  sendMail(mail: Mail.Options): Promise<void>;
};

export async function otpEmail({ email, role }: EmailDto, io: IO) {
  {
    if (role === Role.Admin && !(await io.adminExist()))
      return { key: io.fakeKey() }; // Don't inform if admin email exist or not

    const { code, otpDto } = await createOtpDto();
    const { otp_id: id } = await io.saveOtp(otpDto);

    const mailDto = await createMailDto(id, code);
    await io.sendMail(mailDto);

    return { key: id };
  }

  async function createOtpDto() {
    const code = randomNumber({ size: 5 });

    const otpDto = {
      otp: await io.createOtpHash(code),
      expires_in: addMinutes(new Date(), otpValidMinutes),
      email,
      role,
    };

    return { code, otpDto };
  }

  async function createMailDto(id: string, code: string) {
    const link = CreateUrl.verificationCode(id, code);

    return {
      to: email,
      subject: `${code} é o seu código de acesso`,
      html: await EmailHtml.otp(code, otpValidMinutes, link, role),
    };
  }
}
