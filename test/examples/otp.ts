import { otp } from '@prisma/client';
import { Role } from '~/auth/constants/roles';
import { expiresInOneMinute } from './common';
import { createCustomer } from './customer';

export const otpNumber = '12345';

export const createOTP: otp = {
  otp_id: '81f05122-fab4-42a1-a519-b275849d3c2f',
  otp: '$argon2id$v=19$m=32768,t=12,p=1$AiJVPkE9rm54yQFlWFuiYw$rLLRrSMQf8pTJQ7zyLtqK6tr2IzoYj5pWX33XV+J6nQ',
  email: createCustomer.email,
  role: Role.Customer,
  expires_in: expiresInOneMinute,
};
