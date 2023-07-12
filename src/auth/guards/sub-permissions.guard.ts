import { SetMetadata } from '@nestjs/common';
import { MetadataKey } from '~/common/constants/metadata-keys';
import { SubPermission } from '../constants/sub-permissions';

export const SubPermissions = (...permissions: SubPermission[]) =>
  SetMetadata(MetadataKey.SubPermission, permissions);
