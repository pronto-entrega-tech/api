import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CoordsDto {
  @ApiProperty()
  @IsString()
  readonly address: string;
}

export class CoordsRes {
  readonly lat: number;
  readonly lng: number;
}
