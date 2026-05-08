import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthJwtAtGuard } from '../../../guards';
import { UsersModule } from '../../core/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AuthJwtATStrategy,
  AuthJwtRTStrategy,
  AuthLocalStrategy,
} from './auth.strategy';
import { AuthDevService } from './auth-dev.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthDevService,
    AuthLocalStrategy,
    AuthJwtATStrategy,
    AuthJwtRTStrategy,
    AuthJwtAtGuard,
  ],
  exports: [AuthJwtAtGuard],
})
export class AuthModule {}
