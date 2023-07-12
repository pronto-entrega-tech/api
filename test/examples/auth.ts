import { Prisma } from '@prisma/client';
import { Role } from '~/auth/constants/roles';
import { EmailDto } from '~/auth/dto/email.dto';
import { SaveSessionDto } from '~/auth/dto/session';
import { ValidateDto } from '~/auth/dto/validate.dto';
import { expiresInOneMinute } from './common';
import { createCustomer } from './customer';
import { createOTP, otpNumber } from './otp';

export const emailCustomer: EmailDto = {
  email: createCustomer.email,
  role: Role.Customer,
};

export const validateDto: ValidateDto = {
  key: createOTP.otp_id,
  otp: otpNumber,
  role: Role.Customer,
};

export const createSession = Prisma.validator<SaveSessionDto>()({
  session_id: '01234567-89ab-cdef-0123-456789abcdef',
  user_id: createCustomer.customer_id,
  expires_in: expiresInOneMinute,
});
