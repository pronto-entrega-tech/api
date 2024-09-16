import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  ArrayMaxSize,
  IsInt,
  IsPositive,
  Length,
} from "class-validator";
import TransformToBigInt from "~/common/decorators/to-bigint";

export class CreateProductDto {
  @ApiProperty({ description: "Barcode of product" })
  @IsOptional()
  @TransformToBigInt()
  readonly code?: bigint;

  @Length(1, 256)
  readonly name: string;

  @IsOptional()
  @Length(1, 256)
  readonly brand?: string;

  @IsOptional()
  @Length(1, 256)
  readonly quantity?: string;

  @IsInt()
  @IsPositive()
  readonly category_id: number;

  @ArrayMaxSize(50)
  @Length(1, 256, { each: true })
  readonly images_names: string[];
}
