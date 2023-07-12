import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import TransformToBigInt from '~/common/decorators/to-bigint';

export class FindManyOrdersDto {
  @ApiProperty({
    description: 'For pagination, id of last item in last query',
  })
  @IsOptional()
  @TransformToBigInt()
  readonly after_id?: bigint;
}
