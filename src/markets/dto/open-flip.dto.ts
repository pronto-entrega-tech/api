import { IsEnum, IsDate } from "class-validator";
import TransformToDate from "~/common/decorators/to-date";
import { OpenFlipType } from "../constants/market-enums";

export class CreateOpenFlipDto {
  @IsEnum(OpenFlipType)
  readonly type: OpenFlipType;
}

export class DeleteOpenFlipDto {
  @TransformToDate()
  @IsDate()
  readonly created_at: Date;
}
