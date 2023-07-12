import { SubPermission } from '~/auth/constants/sub-permissions';
import { AuthToken } from './auth-tokens';
import { Role, RoleWithoutSub } from './roles';

export type JwtPayload = {
  iss: 'ProntoEntrega';
  sub: string;
  type: AuthToken;
} & (
  | {
      role: RoleWithoutSub;
    }
  | {
      role: Role.MarketSub;
      market_id: string;
      sub_permissions: SubPermission[];
    }
);

export type CreateJwtPayload = {
  sub: JwtPayload['sub'];
  type?: JwtPayload['type'];
} & (
  | {
      role: RoleWithoutSub;
    }
  | {
      role: Role.MarketSub;
      market_id: string;
      sub_permissions: SubPermission[];
    }
);
