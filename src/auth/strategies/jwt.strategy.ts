import { ForbiddenException, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { CONNECT_TOKEN, CREATE_TOKEN } from "~/auth/constants/auth-tokens";
import { isDev, isTest } from "~/common/constants/is-dev";
import { AuthToken } from "../constants/auth-tokens";
import { JwtPayload } from "../constants/jwt-payload";

const jwtFromRequest = (type: AuthToken) =>
  ({
    [AuthToken.Access]: () => ExtractJwt.fromAuthHeaderAsBearerToken(),
    [AuthToken.Create]: () => ExtractJwt.fromHeader(CREATE_TOKEN),
    [AuthToken.Connect]: () => ExtractJwt.fromHeader(CONNECT_TOKEN),
  })[type]();

const createStrategy = (requiredType: AuthToken) => {
  @Injectable()
  class MyJwtStrategy extends PassportStrategy(JwtStrategy, requiredType) {
    constructor() {
      super({
        jwtFromRequest: jwtFromRequest(requiredType),
        secretOrKey: process.env.TOKEN_SECRET,
        ignoreExpiration:
          isTest || (isDev && process.env.IGNORE_TOKEN_EXPIRATION === "true"),
      });
    }

    async validate(payload: JwtPayload): Promise<JwtPayload> {
      if (payload.type !== requiredType) throw new ForbiddenException();

      return payload;
    }
  }
  return MyJwtStrategy;
};

export const CreateJwtStrategy = createStrategy(AuthToken.Create);

export const AccessJwtStrategy = createStrategy(AuthToken.Access);

export const ConnectJwtStrategy = createStrategy(AuthToken.Connect);
