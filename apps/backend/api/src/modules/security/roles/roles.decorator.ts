import type { RolesType } from '@hsm/common/types';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

type BranchEnum = Record<string, string>;
type RolesInput = RolesType | BranchEnum;

export const Roles = (...rolesOrBranches: RolesInput[]) => {
  const flat: RolesType[] = [];
  for (const item of rolesOrBranches) {
    if (typeof item === 'string') {
      flat.push(item);
    } else {
      flat.push(...(Object.values(item) as RolesType[]));
    }
  }
  return SetMetadata(ROLES_KEY, [...new Set(flat)]);
};
