import { applyDecorators, BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Allow } from 'class-validator';

const allow = Allow();

const type = ApiProperty({ type: String });

const transform = Transform(({ value, key }) => {
  if (value == null) return value;

  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException(`${key} must be a valid bigint`);
  }
});

const TransformToBigInt = () => applyDecorators(allow, type, transform);

export default TransformToBigInt;
