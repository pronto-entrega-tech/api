import { IsDate, IsString } from 'class-validator';

export class MarketCreateRes {
  @IsString()
  readonly access_token: string;

  @IsString()
  readonly refresh_token: string;

  @IsDate()
  readonly expires_in: Date;
}
