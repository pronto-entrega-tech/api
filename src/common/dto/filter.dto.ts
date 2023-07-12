import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  isArray,
  IsEnum,
  IsInt,
  IsLatLong,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderBy } from '../constants/order-by';

export class ItemByMarketFilter {
  @ApiProperty({ description: 'Full text search' })
  @IsOptional()
  @IsString()
  readonly query?: string;

  @ApiProperty({ description: 'Category id' })
  @Type(() => Number)
  @Transform(({ value: v }) => (v && !isArray(v) ? [v] : v))
  @IsOptional()
  @IsNumber({}, { each: true })
  readonly categories?: number[];
}

export class ItemFeedFilter extends ItemByMarketFilter {
  @ApiProperty({ description: 'Item Id' })
  @Transform(({ value: v }) => (v && !isArray(v) ? [v] : v))
  @IsOptional()
  @IsString({ each: true })
  readonly ids?: string[];

  @IsOptional()
  @IsEnum(OrderBy)
  readonly order_by: OrderBy = OrderBy.Default;

  @ApiProperty({ description: 'Latitude,Longitude' })
  @IsOptional()
  @IsLatLong()
  readonly latLong?: string;

  /**
   * In km.
   */
  @ApiProperty({ description: 'Distance in kilometers' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  readonly distance: number = 15;
}

export type ItemFilter =
  | (ItemFeedFilter & { market_id?: undefined })
  | (ItemByMarketFilter & { market_id: string });

export class MarketFilter extends PickType(ItemFeedFilter, [
  'distance',
  'latLong',
  'query',
  'order_by',
]) {}
