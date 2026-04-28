// noinspection JSUnusedGlobalSymbols

import { envs } from '@hsm/config';
import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../../decorator';

@Injectable()
export class AuthJwtRtGuard extends AuthGuard('jwt-rt') {
  constructor(private reflector: Reflector) {
    super();
  }

  handleRequest(err, user, info) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('token expired', 'TOKEN_EXPIRED');
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token', 'INVALID_TOKEN');
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (envs.ENVIRONMENT === 'dev') {
      return true;
    }
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
