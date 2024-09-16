import { SetMetadata } from "@nestjs/common";
import { MetadataKey } from "~/common/constants/metadata-keys";
import { Role } from "../constants/roles";

export const Roles = (...roles: Role[]) =>
  SetMetadata(MetadataKey.Roles, roles);
