import { SetMetadata } from '@nestjs/common';

/**
 * Routes that a pending-onboarding user is still allowed to reach (the
 * onboarding endpoint itself plus profile/refresh, so completion can't
 * deadlock). The global `OnboardingGuard` blocks every other feature route for
 * users whose onboarding is incomplete.
 */
export const ALLOW_PENDING_KEY = 'allowPending';
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
