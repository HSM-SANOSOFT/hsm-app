import { RolesEnum } from '@hsm/common/enums';
import type { ISignedUser } from '@hsm/common/interfaces';
import { UserEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { ALLOW_PENDING_KEY, IS_PUBLIC_KEY } from '../decorator';

/**
 * Server-side enforcement of first-login onboarding (R6). A user whose account
 * is still pending (`onboardingCompletedAt IS NULL`) is blocked from every
 * feature route; only `@Public()` routes and `@AllowPending()` routes (the
 * onboarding endpoint plus profile/refresh) remain reachable, so completion
 * can't deadlock.
 *
 * The DB row is authoritative, NOT the JWT claim: the profile/token is
 * JWT-derived and stale until onboarding reissues a fresh token. As an
 * optimization the guard trusts a non-null claim (a completed account never
 * reverts) and only reads the DB when the claim says pending — which is exactly
 * the security-relevant case, and is cheap because it's the uncommon one.
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserEntity, DatabasesEnum.HsmDbPostgres)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const target = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      target,
    );
    if (isPublic) return true;

    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_KEY,
      target,
    );
    if (allowPending) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as
      | (ISignedUser & { onboardingCompletedAt?: string | null })
      | undefined;

    // No authenticated user (shouldn't happen behind the auth guard) or an
    // integration principal (integrations don't onboard) → not gated.
    if (!user?.id) return true;
    if (user.roles?.includes(RolesEnum.System.Integration)) return true;

    // Trust a completed claim; only the DB can clear a pending one.
    if (user.onboardingCompletedAt != null) return true;

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: { id: true, onboardingCompletedAt: true },
    });
    if (dbUser && dbUser.onboardingCompletedAt == null) {
      throw new ForbiddenException(
        'Onboarding required: complete first-login onboarding to continue',
      );
    }
    return true;
  }
}
