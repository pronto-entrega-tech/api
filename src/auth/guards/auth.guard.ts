import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { MetadataKey } from "~/common/constants/metadata-keys";
import { AuthReq } from "../constants/auth-req";
import { AuthToken } from "../constants/auth-tokens";
import { Role } from "../constants/roles";
import { SubPermission } from "../constants/sub-permissions";

const createAuthGuard = (type: AuthToken) => {
  @Injectable()
  class MyAuthGuard extends AuthGuard(type) {
    constructor(private readonly reflector: Reflector) {
      super();
    }
    private readonly logger = new Logger(MyAuthGuard.name);

    async canActivate(context: ExecutionContext) {
      await super.canActivate(context);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const targets: [Function, Function] = [
        context.getHandler(),
        context.getClass(),
      ];

      const requiredRoles = this.reflector.getAllAndOverride<
        Role[] | undefined
      >(MetadataKey.Roles, targets);

      const requiredSubPermissions = this.reflector.getAllAndOverride<
        SubPermission[] | undefined
      >(MetadataKey.SubPermission, targets);

      if (!requiredRoles) {
        this.logger.error(
          `Missing roles on ${targets[1].name}.${targets[0].name}`,
        );
        return false;
      }

      const { user } =
        context.getType() === "http"
          ? context.switchToHttp().getRequest<AuthReq>()
          : context.switchToWs().getClient<AuthReq>();

      const hasRole = !!requiredRoles.includes(user.role);
      const hasPermission =
        user.role !== Role.MarketSub ||
        !requiredSubPermissions?.length ||
        requiredSubPermissions.some((role) =>
          user.sub_permissions?.includes(role),
        );

      return hasRole && hasPermission;
    }
  }
  return MyAuthGuard;
};

export const CreateAuthGuard = createAuthGuard(AuthToken.Create);

export const AccessAuthGuard = createAuthGuard(AuthToken.Access);

export const ConnectAuthGuard = createAuthGuard(AuthToken.Connect);
