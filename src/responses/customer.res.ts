import { OmitType } from "@nestjs/mapped-types";
import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { IsBigInt } from "~/common/decorators/is-bigint";
import { IsDecimalObject } from "~/common/decorators/is-decimal-object";
import { SocialProvider } from "~/customers/constants/social-providers";

export class CustomerFindRes {
  @IsString()
  readonly email: string;

  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly document: string | null;

  @IsOptional()
  @IsString()
  readonly phone: string | null;

  @IsOptional()
  @IsDecimalObject()
  readonly debit: Prisma.Decimal | null;

  @Type(() => CustomerAddressRes)
  readonly addresses: CustomerAddressRes[];
}

export class CustomerUpdateRes {
  @IsString()
  readonly customer_id: string;

  @IsDate()
  readonly created_at: Date;

  @IsString()
  readonly email: string;

  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly document: string | null;

  @IsOptional()
  @IsString()
  readonly phone: string | null;

  @IsOptional()
  @IsString()
  readonly asaas_id: string | null;

  @IsOptional()
  @IsString()
  readonly debit: Prisma.Decimal | null;

  @IsOptional()
  @IsString()
  readonly social_id: string | null;

  @IsOptional()
  @IsEnum(SocialProvider)
  readonly social_provider: SocialProvider | null;

  @Type(() => CustomerAddressRes)
  readonly addresses: CustomerAddressRes[];
}

export class CustomerDeleteRes extends OmitType(CustomerUpdateRes, ["email"]) {
  @IsEmpty()
  readonly email: null;
}

export class CustomerCardRes {
  @IsString()
  readonly id: string;

  @IsString()
  readonly customer_id: string;

  @IsOptional()
  @IsString()
  readonly nickname: string | null;

  @IsString()
  readonly brand: string;

  @IsString()
  readonly last4: string;

  @IsString()
  readonly asaas_id: string;
}

class CustomerAddressRes {
  @IsBigInt()
  readonly id: bigint;

  @IsString()
  readonly customer_id: string;

  @IsString()
  readonly nickname: string;

  @IsString()
  readonly street: string;

  @IsString()
  readonly number: string;

  @IsString()
  readonly district: string;

  @IsString()
  readonly city: string;

  @IsString()
  readonly state: string;

  @IsOptional()
  @IsString()
  readonly complement: string | null;

  @IsNumber()
  readonly latitude: number;

  @IsNumber()
  readonly longitude: number;
}
