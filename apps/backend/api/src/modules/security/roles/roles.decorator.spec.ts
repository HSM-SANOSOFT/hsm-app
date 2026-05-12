import { RolesEnum } from '@hsm/common/enums';
import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, Roles } from './roles.decorator';

jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockReturnValue(jest.fn()),
}));

describe('Roles decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a flat string role in metadata', () => {
    Roles(RolesEnum.System.Admin)();
    expect(SetMetadata).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.arrayContaining([RolesEnum.System.Admin]),
    );
  });

  it('stores multiple string roles in metadata', () => {
    Roles(RolesEnum.System.Admin, RolesEnum.Clinical.Nurse)();
    expect(SetMetadata).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.arrayContaining([RolesEnum.System.Admin, RolesEnum.Clinical.Nurse]),
    );
  });

  it('expands a branch enum object to all its values', () => {
    Roles(RolesEnum.Clinical)();
    const storedRoles = (SetMetadata as jest.Mock).mock.calls[0][1] as string[];
    expect(storedRoles).toContain(RolesEnum.Clinical.Doctor);
    expect(storedRoles).toContain(RolesEnum.Clinical.Nurse);
    expect(storedRoles).toContain(RolesEnum.Clinical.Technician);
  });

  it('deduplicates roles when the same role appears multiple times', () => {
    Roles(RolesEnum.System.Admin, RolesEnum.System.Admin)();
    const storedRoles = (SetMetadata as jest.Mock).mock.calls[0][1] as string[];
    expect(storedRoles.filter(r => r === RolesEnum.System.Admin)).toHaveLength(1);
  });

  it('handles mixed string roles and branch enum objects', () => {
    Roles(RolesEnum.System.Admin, RolesEnum.Clinical)();
    const storedRoles = (SetMetadata as jest.Mock).mock.calls[0][1] as string[];
    expect(storedRoles).toContain(RolesEnum.System.Admin);
    expect(storedRoles).toContain(RolesEnum.Clinical.Doctor);
    expect(storedRoles).toContain(RolesEnum.Clinical.Nurse);
  });

  it('stores an empty array when called with no arguments', () => {
    Roles()();
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, []);
  });
});
