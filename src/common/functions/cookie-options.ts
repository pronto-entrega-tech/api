import { CookieSerializeOptions } from '@fastify/cookie';

const authCookieOpts = (expiresIn: Date) => {
  return {
    expires: expiresIn,
    sameSite: true,
    httpOnly: true,
    secure: true,
    signed: true,
    path: '/auth',
  } as CookieSerializeOptions;
};

export const useCookieQueryOpts = {
  name: 'useCookie',
  example: true,
  required: false,
  type: Boolean,
};

export default authCookieOpts;
