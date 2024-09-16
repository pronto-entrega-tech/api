import { applyDecorators, BadRequestException } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Transform } from "class-transformer";
import { Allow } from "class-validator";

const allow = Allow();

const type = ApiProperty({ type: Number });

const transform = Transform(({ value, key }) => {
  if (value == null) return value;

  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new BadRequestException(`${key} must be a valid decimal`);
  }
});

const TransformToDecimal = () => applyDecorators(allow, type, transform);

export default TransformToDecimal;
