import { IsEnum, IsString, Length } from 'class-validator';
import { SocialProvider } from '../constants/social-providers';

export class CreateCustomerDto {
  @Length(1, 256)
  readonly name: string;
}

export class CustomerWSocialDto {
  @IsString()
  readonly token: string;

  @IsEnum(SocialProvider)
  readonly provider: SocialProvider;
}

export type SaveCustomerDto = CreateCustomerDto & {
  readonly email: string;
  readonly provider?: SocialProvider;
  readonly customer_id?: string;
  readonly created_at?: Date;
};
