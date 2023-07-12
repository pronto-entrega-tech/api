import { IsString } from 'class-validator';

export class FullItemId {
  @IsString()
  readonly item_id: string;

  @IsString()
  readonly city_slug: string;
}
