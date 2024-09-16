import { omit } from "~/common/functions/omit";

export enum Role {
  Admin = "ADMIN",
  Customer = "CUSTOMER",
  Market = "MARKET",
  MarketSub = "MARKET_SUB",
}

export type RoleWithoutSub = Role.Admin | Role.Customer | Role.Market;

export const RoleWithoutSub = omit(Role, "MarketSub");
