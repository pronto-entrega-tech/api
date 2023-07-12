import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsUUID } from 'class-validator';
import { RoleWithoutSubDto } from './role.dto';

export class ValidateDto extends RoleWithoutSubDto {
  @ApiProperty({ example: '01234567-89ab-cdef-0123-456789abcdef' })
  @IsUUID()
  readonly key: string;

  @ApiProperty({ example: '01234' })
  @IsNumberString()
  readonly otp: string;
}
