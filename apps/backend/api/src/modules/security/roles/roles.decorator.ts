import { RolesEnum } from '@hsm/common/enums';
import type { RolesType } from '@hsm/common/types';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// BranchEnum is constrained to the actual branches of RolesEnum so the
// compiler rejects arbitrary Record<string,string> objects at call sites.
type BranchEnum = (typeof RolesEnum)[keyof typeof RolesEnum];
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
