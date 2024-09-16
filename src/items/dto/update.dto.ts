import { PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsOptional, ValidateNested } from 'class-validator';
import TransformToBigInt from '~/common/decorators/to-bigint';
import { CreateItemDto, CreateKitDto, CreateDetailsDto } from './create.dto';

export class UpdateItemDto extends PartialType(
  OmitType(CreateItemDto, ['code']),
) {}

export class UpdateKitDto extends PartialType(
  OmitType(CreateKitDto, ['details']),
) {
  @IsOptional()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpdateDetailsDto)
  readonly details?: UpdateDetailsDto[];
}

export class UpdateDetailsDto extends OmitType(CreateDetailsDto, ['code']) {
  @TransformToBigInt()
  readonly prod_id: bigint;
}
