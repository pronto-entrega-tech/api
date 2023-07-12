import { IsOptional, IsLatitude, IsLongitude, Length } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @Length(1, 256)
  readonly nickname?: string;

  @Length(1, 256)
  readonly street: string;

  @Length(1, 256)
  readonly number: string;

  @Length(1, 256)
  readonly district: string;

  @Length(1, 256)
  readonly city: string;

  @Length(1, 256)
  readonly state: string;

  @IsOptional()
  @Length(1, 256)
  readonly complement?: string;

  @IsLatitude()
  readonly latitude: number;

  @IsLongitude()
  readonly longitude: number;
}
