import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayMaxSize,
  ArrayUnique,
  IsEnum,
  IsMilitaryTime,
  IsNumberString,
  IsOptional,
  IsInt,
  IsPositive,
  Length,
  Max,
  ValidateNested,
} from "class-validator";
import { DecimalSize } from "~/common/decorators/decimal-size";
import { IsDecimalNonNegative } from "~/common/decorators/is-decimal-non-negative";
import { IsDecimalPositive } from "~/common/decorators/is-decimal-positive";
import TransformToDecimal from "~/common/decorators/to-decimal";
import {
  BankAccountType,
  HolderType,
  MarketsType,
  PixKeyType,
  WeekDay,
} from "../constants/market-enums";
import {
  IsBusinessHours,
  SortBusinessHours,
} from "../decorators/business-hours";
import { MarketsService } from "../markets.service";

export class BusinessHour {
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(WeekDay, { each: true })
  readonly days: WeekDay[];

  @ApiProperty({ example: "09:00" })
  @IsMilitaryTime()
  readonly open_time: string;

  @ApiProperty({ example: "21:30" })
  @IsMilitaryTime()
  readonly close_time: string;
}

export class CreateBankAccountDto {
  @Length(1, 256)
  readonly holder_name: string;

  @IsEnum(HolderType)
  readonly holder_type: HolderType;

  @Length(3, 3)
  readonly bank_number: string;

  @Length(3, 4)
  readonly agency_number: string;

  @Length(16, 16)
  readonly account_number: string;

  @Length(11, 14)
  readonly document: string;

  @IsEnum(BankAccountType)
  readonly type: BankAccountType;
}

export class CreateMarketDto {
  @IsEnum(MarketsType)
  readonly type: MarketsType;

  @Length(1, 256)
  readonly name: string;

  @Length(1, 256)
  readonly address_street: string;

  @IsNumberString()
  @Length(1, 256)
  readonly address_number: string;

  @Length(1, 256)
  readonly address_district: string;

  @Length(1, 256)
  readonly address_city: string;

  @Length(2, 2)
  readonly address_state: string;

  @IsOptional()
  @Length(1, 256)
  readonly address_complement?: string;

  @TransformToDecimal()
  @IsDecimalNonNegative()
  @DecimalSize(5, 2)
  readonly order_min: Prisma.Decimal;

  @TransformToDecimal()
  @IsDecimalNonNegative()
  @DecimalSize(4, 2)
  readonly delivery_fee: Prisma.Decimal;

  @TransformToDecimal()
  @IsDecimalNonNegative()
  @DecimalSize(4, 2)
  readonly markup: Prisma.Decimal;

  @TransformToDecimal()
  @IsDecimalPositive()
  @DecimalSize(3, 0)
  readonly min_time: Prisma.Decimal;

  @TransformToDecimal()
  @IsDecimalPositive()
  @DecimalSize(3, 0)
  readonly max_time: Prisma.Decimal;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(24 * 60)
  readonly schedule_mins_interval?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(7)
  readonly schedule_max_days?: number;

  @IsOptional()
  @Length(1, 256)
  readonly info?: string;

  @IsNumberString()
  @Length(14, 14)
  readonly document: string;

  @ArrayMaxSize(50)
  @Length(1, 256, { each: true })
  readonly payments_accepted: string[];

  @IsOptional()
  @Length(1, 32)
  readonly pix_key?: string;

  @IsOptional()
  @IsEnum(PixKeyType)
  readonly pix_key_type?: PixKeyType;

  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BusinessHour)
  @SortBusinessHours()
  @IsBusinessHours()
  readonly business_hours: BusinessHour[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBankAccountDto)
  readonly bank_account?: CreateBankAccountDto;
}

export type SaveMarketDto = Awaited<
  ReturnType<MarketsService["createMarketDto"]>
> & { now?: Date };
