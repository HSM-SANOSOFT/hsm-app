import { RolesEnum } from '@hsm/common/enums';
export type RoleDomains = keyof typeof RolesEnum;

type RoleValues<T> = T extends object ? T[keyof T] : never;

export type RolesType = RoleValues<(typeof RolesEnum)[keyof typeof RolesEnum]>;
