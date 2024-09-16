import { JwtPayload } from "~/auth/constants/jwt-payload";
import { Role } from "~/auth/constants/roles";

export const getMarketOrSubId = (user: JwtPayload) =>
  user.role === Role.MarketSub
    ? { market_id: user.market_id, market_sub_id: user.sub }
    : { market_id: user.sub };

export const getCustomerOrMarketId = (user: JwtPayload) =>
  user.role === Role.Customer
    ? { customer_id: user.sub }
    : { market_id: user.sub };
