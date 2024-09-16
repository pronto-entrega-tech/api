import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, Length } from "class-validator";
import { RoleWithoutSubDto } from "./role.dto";

export class EmailDto extends RoleWithoutSubDto {
  @ApiProperty({ example: "contato@prontoentrega.com.br" })
  @Length(1, 256)
  @IsEmail()
  readonly email: string;
}
