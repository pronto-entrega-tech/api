import {
  Body,
  Controller,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "~/auth/auth.service";
import {
  CONNECT_TOKEN,
  MARKET_SUB_REFRESH_TOKEN,
} from "~/auth/constants/auth-tokens";
import { Role } from "~/auth/constants/roles";
import { RoleDto } from "~/auth/dto/role.dto";
import authCookieOpts, {
  useCookieQueryOpts,
} from "~/common/functions/cookie-options";
import {
  AccessTokenAndSessionRes,
  AuthTokenAndSessionRes,
} from "~/responses/auth.res";
import { AuthReq } from "./constants/auth-req";
import { EmailDto } from "./dto/email.dto";
import { ValidateDto } from "./dto/validate.dto";
import { ConnectAuthGuard } from "./guards/auth.guard";
import { Roles } from "./guards/roles.guard";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: "Send a validation code via email" })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("email")
  async email(@Body() dto: EmailDto) {
    return this.auth.email(dto);
  }

  @ApiOperation({
    summary: "Generate create_token, or access_token and refresh_token cookie",
  })
  @ApiQuery(useCookieQueryOpts)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("validate")
  async validate(
    @Query(useCookieQueryOpts.name) useCookie: boolean,
    @Body() dto: ValidateDto,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<AuthTokenAndSessionRes> {
    const result = await this.auth.validate(dto);

    if (!useCookie) return result;

    const { session, ...response } = result;
    if (session) {
      const { refresh_token, expires_in } = session;
      res.setCookie(
        cookieName(dto.role),
        refresh_token,
        authCookieOpts(expires_in)
      );
    }
    return response;
  }

  @ApiOperation({ summary: "Generate a new access_token and refresh_token" })
  @ApiQuery(useCookieQueryOpts)
  @ApiQuery({ name: "refreshToken", required: false })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("revalidate")
  async revalidate(
    @Query(useCookieQueryOpts.name) useCookie: boolean,
    @Query("refreshToken") refreshToken: string,
    @Body() { role }: RoleDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<AccessTokenAndSessionRes> {
    const cookie = () =>
      req.unsignCookie(req.cookies[cookieName(role)] ?? "").value;
    const token = useCookie ? cookie() : refreshToken;
    if (!token) throw new UnauthorizedException();

    const result = await this.auth.revalidate(token, role);

    if (!useCookie) return result;

    const { refresh_token, expires_in, ...response } = result;
    res.setCookie(cookieName(role), refresh_token, authCookieOpts(expires_in));

    return response;
  }

  @ApiOperation({
    summary: "Generate an access_token and refresh_token cookie to sub-account",
  })
  @ApiHeader({ name: CONNECT_TOKEN })
  @ApiQuery(useCookieQueryOpts)
  @UseGuards(ConnectAuthGuard)
  @Roles(Role.MarketSub)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("connect")
  async connect(
    @Query(useCookieQueryOpts.name) useCookie: boolean,
    @Req() { user: { sub: sub_id } }: AuthReq,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<AccessTokenAndSessionRes> {
    const result = await this.auth.connect(sub_id);

    if (!useCookie) return result;

    const { refresh_token, expires_in, ...response } = result;
    res.setCookie(
      MARKET_SUB_REFRESH_TOKEN,
      refresh_token,
      authCookieOpts(expires_in)
    );

    return response;
  }

  @ApiOperation({ summary: "Sign out, overwrite refresh_token cookie" })
  @ApiQuery({ name: "refreshToken", required: false })
  @Post("sign-out")
  async signOut(
    @Query("refreshToken") refreshToken: string | undefined,
    @Body() { role }: RoleDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const cookie = () =>
      req.unsignCookie(req.cookies[cookieName(role)] ?? "").value;
    const token = refreshToken ?? cookie();
    if (!token) throw new UnauthorizedException();

    await this.auth.signOut(token, role);

    res.setCookie(cookieName(role), "", authCookieOpts(new Date()));
  }
}

const cookieName = (role: Role) => `${role}_REFRESH_TOKEN`;
