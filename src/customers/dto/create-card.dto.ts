import { IsNumberString, IsOptional, Length } from "class-validator";

export class CreateCardDto {
  @IsOptional()
  @Length(1, 256)
  readonly nickname?: string;

  @IsNumberString()
  @Length(16, 17)
  readonly number: string;

  @Length(1, 256)
  readonly holderName: string;

  @IsNumberString()
  @Length(2)
  readonly expiryMonth: string;

  @IsNumberString()
  @Length(4)
  readonly expiryYear: string;

  @IsNumberString()
  @Length(3, 4)
  readonly cvv: string;
}

export type SaveCardDto = {
  readonly id?: string;
  readonly customer_id: string;
  readonly nickname?: string;
  readonly brand: string;
  readonly last4: string;
  readonly asaas_id: string;
};
