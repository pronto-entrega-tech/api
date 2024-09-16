import { IsString } from "class-validator";

export class FindMarket {
  @IsString()
  readonly city: string;

  @IsString()
  readonly market_id: string;
}
