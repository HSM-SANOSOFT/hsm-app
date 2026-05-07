import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthJwtAtGuard } from '../../guards';
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
  ],
})
export class SecurityModule {}
