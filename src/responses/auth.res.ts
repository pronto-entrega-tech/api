import { IntersectionType, PartialType } from '@nestjs/swagger';
import { IsDate, IsEnum, IsString } from 'class-validator';
import { AuthToken } from '~/auth/constants/auth-tokens';

class SessionRes {
  @IsString()
  readonly refresh_token: string;

  @IsDate()
  readonly expires_in: Date;
}

class AuthTokenRes {
  @IsString()
  readonly token: string;

  @IsEnum(AuthToken)
  readonly type: AuthToken;
}

export class AccessTokenRes {
  @IsString()
  readonly access_token: string;
}

export class ConnectTokenRes {
  @IsString()
  readonly connect_token: string;
}

export class AuthTokenAndSessionRes extends IntersectionType(
  AuthTokenRes,
  PartialType(SessionRes),
) {}

export class AccessTokenAndSessionRes extends IntersectionType(
  AccessTokenRes,
  PartialType(SessionRes),
) {}
