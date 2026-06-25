import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthJwtAtGuard, OnboardingGuard } from '../../guards';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './roles/roles.guard';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [AuthModule, RolesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthJwtAtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Runs after auth + roles: blocks pending users from feature routes
    // (server-side enforcement of first-login onboarding, R6).
    {
      provide: APP_GUARD,
      useClass: OnboardingGuard,
    },
  ],
})
export class SecurityModule {}
