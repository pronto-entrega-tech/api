import { ArrayUnique, IsEnum, Length } from 'class-validator';
import { SubPermission } from '~/auth/constants/sub-permissions';

export class CreateMarketSubDto {
  @Length(1, 256)
  readonly name: string;

  @ArrayUnique()
  @IsEnum(SubPermission, { each: true })
  readonly permissions: SubPermission[];
}

export type SaveMarketSubDto = CreateMarketSubDto & { id?: string };
