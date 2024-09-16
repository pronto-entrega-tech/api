import { PartialType } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber, Length } from "class-validator";
import { CreateCustomerDto } from "./create.dto";

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @Length(11)
  readonly document?: string;

  @IsOptional()
  @IsPhoneNumber("BR")
  readonly phone?: string;
}
