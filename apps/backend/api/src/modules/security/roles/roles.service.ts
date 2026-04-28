import { RolesEnum } from '@hsm/common/enums';
import type { RoleDomains, RolesType } from '@hsm/common/types';

import { Injectable } from '@nestjs/common';
@Injectable()
export class RolesService {
  findRoleDomains(
    roles: RolesType[],
  ): { role: RolesType; domain: RoleDomains }[] {
    const result: { role: RolesType; domain: RoleDomains }[] = [];

    for (const role of roles) {
      for (const [domain, domainRoles] of Object.entries(RolesEnum)) {
        if (Object.values(domainRoles).includes(role)) {
          result.push({ role, domain: domain as RoleDomains });
          break;
        }
      }
    }

    return result;
  }
}
