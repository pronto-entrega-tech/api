import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsDate,
  IsMilitaryTime,
  IsInt,
  IsOptional,
  Length,
  ValidateNested,
} from "class-validator";
import TransformToDate from "~/common/decorators/to-date";
import {
  SortBusinessHours,
  IsBusinessHours,
} from "../decorators/business-hours";
import { CreateBankAccountDto, CreateMarketDto } from "./create.dto";

export class SpecialDay {
  @ApiProperty({ example: new Date().toISOString().slice(0, 10) })
  @TransformToDate()
  @IsDate()
  readonly date: Date;

  @IsInt()
  readonly reason_code: number;

  @Length(1, 256)
  readonly reason_name: string;

  @ApiProperty({ example: "09:00" })
  @IsMilitaryTime()
  readonly open_time: string;

  @ApiProperty({ example: "21:30" })
  @IsMilitaryTime()
  readonly close_time: string;
}

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {}

export class UpdateMarketDto extends PartialType(
  OmitType(CreateMarketDto, ["bank_account"]),
) {
  @IsOptional()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SpecialDay)
  @SortBusinessHours()
  @IsBusinessHours()
  readonly special_days?: SpecialDay[];
}
