export enum RolesSystemEnum {
  Admin = 'admin',
  Integration = 'integration',
}

export enum RolesClinicalEnum {
  Doctor = 'doctor',
  Nurse = 'nurse',
}

export enum RolesAdministrativeEnum {
  Receptionist = 'receptionist',
}

export enum RolesDefaultEnum {
  Basic = 'basic',
  User = 'user',
  Auditor = 'auditor',
}

export const RolesEnum = {
  Default: RolesDefaultEnum,
  System: RolesSystemEnum,
  Clinical: RolesClinicalEnum,
  Administrative: RolesAdministrativeEnum,
} as const;

export enum RoleFunctionalityEnum {
  Prod = 'prod',
  Staging = 'staging',
  Dev = 'dev',
}
