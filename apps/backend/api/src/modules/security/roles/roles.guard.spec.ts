import { RolesEnum } from '@hsm/common/enums';
import { InsufficientRolesException } from '@hsm/common/errors';
import type { ISignedUser } from '@hsm/common/interfaces';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('@hsm/config/envs', () => ({
  envs: { ENVIRONMENT: 'test' },
}));

import { envs } from '@hsm/config/envs';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const IS_PUBLIC_KEY = 'isPublic';

function makeContext(overrides: {
  user?: Partial<ISignedUser> | undefined;
  handler?: object;
  clazz?: object;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: overrides.user }),
    }),
    getHandler: () => overrides.handler ?? {},
    getClass: () => overrides.clazz ?? {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    Object.assign(envs, { ENVIRONMENT: 'test' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('@Public() routes', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(key => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      });
    });

    it('returns true without touching user — no JWT means user is undefined', () => {
      const ctx = makeContext({ user: undefined });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws InternalServerErrorException when @Public() and @Roles() are combined', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(key => {
        if (key === IS_PUBLIC_KEY) return true;
        if (key === ROLES_KEY) return [RolesEnum.System.Admin];
        return undefined;
      });
      const ctx = makeContext({ user: undefined });
      expect(() => guard.canActivate(ctx)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Developer role', () => {
    const devUser = { roles: [RolesEnum.System.Developer] } as ISignedUser;

    it('grants access when ENVIRONMENT is dev', () => {
      Object.assign(envs, { ENVIRONMENT: 'dev' });
      const ctx = makeContext({ user: devUser });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when ENVIRONMENT is not dev', () => {
      const ctx = makeContext({ user: devUser });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('Admin role bypass', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(key => {
        if (key === ROLES_KEY) return [RolesEnum.Clinical.Nurse];
        return undefined;
      });
    });

    it('grants access to admin regardless of required roles', () => {
      const adminUser = { roles: [RolesEnum.System.Admin] } as ISignedUser;
      const ctx = makeContext({ user: adminUser });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('no @Roles() on protected endpoint', () => {
    it('grants access to any authenticated user when no roles required', () => {
      const user = { roles: [RolesEnum.Clinical.Nurse] } as ISignedUser;
      const ctx = makeContext({ user });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('role matching', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(key => {
        if (key === ROLES_KEY)
          return [RolesEnum.Clinical.Doctor, RolesEnum.Clinical.Nurse];
        return undefined;
      });
    });

    it('grants access when user has a matching role', () => {
      const user = { roles: [RolesEnum.Clinical.Nurse] } as ISignedUser;
      const ctx = makeContext({ user });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws InsufficientRolesException when user has no matching role', () => {
      const user = { roles: [RolesEnum.Administrative.Billing] } as ISignedUser;
      const ctx = makeContext({ user });
      expect(() => guard.canActivate(ctx)).toThrow(InsufficientRolesException);
    });
  });

  describe('null user on protected route', () => {
    it('throws UnauthorizedException when user is undefined on a protected endpoint', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(key => {
        if (key === ROLES_KEY) return [RolesEnum.System.Admin];
        return undefined;
      });
      const ctx = makeContext({ user: undefined });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });
});
