import { CookieSerializeOptions } from "@fastify/cookie";
import { isDev } from "../constants/is-dev";

const authCookieOpts = (expiresIn: Date) => {
  return {
    expires: expiresIn,
    sameSite: "lax",
    secure: !isDev,
    httpOnly: true,
    signed: true,
    path: "/auth",
  } as CookieSerializeOptions;
};

export const useCookieQueryOpts = {
  name: "useCookie",
  example: true,
  required: false,
  type: Boolean,
};

export default authCookieOpts;
