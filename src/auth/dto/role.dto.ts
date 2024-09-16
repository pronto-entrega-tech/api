import { IsEnum } from "class-validator";
import { Role, RoleWithoutSub } from "~/auth/constants/roles";

export class RoleDto {
  @IsEnum(Role)
  readonly role: Role;
}

export class RoleWithoutSubDto {
  @IsEnum(RoleWithoutSub)
  readonly role: RoleWithoutSub;
}
