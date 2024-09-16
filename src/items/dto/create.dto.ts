import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { IsDecimalPositive } from '~/common/decorators/is-decimal-positive';
import TransformToBigInt from '~/common/decorators/to-bigint';
import TransformToDecimal from '~/common/decorators/to-decimal';
import { DiscountType } from '../constants/discount-type';

export class LoggingDto {
  @IsString()
  readonly data: string;
}

export class CreateItemDto {
  @ApiProperty({ description: 'Barcode of product', type: String })
  @TransformToBigInt()
  readonly code: bigint;

  @TransformToDecimal()
  @IsDecimalPositive()
  readonly market_price: Prisma.Decimal;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly stock?: number;

  @ApiProperty({ description: 'Weight of unit in kg', type: Number })
  @TransformToDecimal()
  @IsOptional()
  @IsDecimalPositive()
  readonly unit_weight?: Prisma.Decimal;

  @IsOptional()
  @IsEnum(DiscountType)
  readonly discount_type?: DiscountType;

  @TransformToDecimal()
  @IsOptional()
  @IsDecimalPositive()
  readonly discount_value_1?: Prisma.Decimal;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly discount_value_2?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly discount_max_per_client?: number;
}

export class CreateKitDto extends OmitType(CreateItemDto, ['code']) {
  @Length(1, 256)
  readonly kit_name: string;

  @Length(1, 256)
  readonly kit_quantity: string;

  @Length(1, 256)
  readonly kit_image_name: string;

  @IsOptional()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateDetailsDto)
  readonly details: CreateDetailsDto[];
}

export class CreateDetailsDto extends PickType(CreateItemDto, ['code']) {
  @IsPositive()
  readonly quantity: number;
}

export type SaveItemDto = CreateItemDto & {
  readonly city_slug: string;
  readonly market_id: string;
  readonly market_sub_id?: string;
  readonly prod_id: bigint;
  readonly name: string;
  readonly brand: string | null;
  readonly quantity: string | null;
  readonly item_id?: string;
};

export type SaveKitDto = Omit<CreateKitDto, 'details'> & {
  readonly city_slug: string;
  readonly market_id: string;
  readonly market_sub_id?: string;
  readonly details: { quantity: number; prod_id: bigint }[];
  readonly item_id?: string;
};
