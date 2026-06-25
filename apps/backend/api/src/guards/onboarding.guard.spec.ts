import { RolesEnum } from '@hsm/common/enums';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { ALLOW_PENDING_KEY, IS_PUBLIC_KEY } from '../decorator';
import { OnboardingGuard } from './onboarding.guard';

type Meta = { isPublic?: boolean; allowPending?: boolean };

const makeReflector = (meta: Meta) => ({
  getAllAndOverride: jest.fn((key: string) =>
    key === IS_PUBLIC_KEY
      ? meta.isPublic
      : key === ALLOW_PENDING_KEY
        ? meta.allowPending
        : undefined,
  ),
});

const makeContext = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as never;

describe('OnboardingGuard', () => {
  const userRepository = { findOne: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  const guard = (meta: Meta) =>
    new OnboardingGuard(makeReflector(meta) as never, userRepository as never);

  it('allows @Public routes without reading the DB', async () => {
    const g = guard({ isPublic: true });
    await expect(g.canActivate(makeContext(undefined))).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows @AllowPending routes (onboarding/profile/refresh) without reading the DB', async () => {
    const g = guard({ allowPending: true });
    await expect(
      g.canActivate(
        makeContext({ id: 'u1', roles: [], onboardingCompletedAt: null }),
      ),
    ).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows a completed user (non-null JWT claim) without reading the DB', async () => {
    const g = guard({});
    await expect(
      g.canActivate(
        makeContext({
          id: 'u1',
          roles: [RolesEnum.Clinical.Nurse],
          onboardingCompletedAt: '2026-06-24T10:00:00.000Z',
        }),
      ),
    ).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('blocks a pending user (null claim, DB still null) with 403', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'u1',
      onboardingCompletedAt: null,
    });
    const g = guard({});
    await expect(
      g.canActivate(
        makeContext({
          id: 'u1',
          roles: [RolesEnum.Clinical.Nurse],
          onboardingCompletedAt: null,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepository.findOne).toHaveBeenCalled();
  });

  it('allows a just-completed user whose token is stale (null claim, DB now set)', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'u1',
      onboardingCompletedAt: new Date(),
    });
    const g = guard({});
    await expect(
      g.canActivate(
        makeContext({
          id: 'u1',
          roles: [RolesEnum.Clinical.Nurse],
          onboardingCompletedAt: null,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('does not gate integration principals', async () => {
    const g = guard({});
    await expect(
      g.canActivate(
        makeContext({
          id: 'int1',
          roles: [RolesEnum.System.Integration],
          onboardingCompletedAt: null,
        }),
      ),
    ).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('does not gate when there is no authenticated user', async () => {
    const g = guard({});
    await expect(g.canActivate(makeContext(undefined))).resolves.toBe(true);
  });
});
