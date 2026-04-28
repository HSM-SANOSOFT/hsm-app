import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../core/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthJwtAtGuard } from './guard';
import {
  AuthJwtATStrategy,
  AuthJwtRTStrategy,
  AuthLocalStrategy,
} from './strategy';

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
    AuthLocalStrategy,
    AuthJwtATStrategy,
    AuthJwtRTStrategy,
    AuthJwtAtGuard,
  ],
  exports: [AuthJwtAtGuard],
})
export class AuthModule {}
