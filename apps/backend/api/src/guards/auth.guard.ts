import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorator';

/**
 * JWT Access Token Authentication Guard
 * Validates JWT access tokens and checks authorization.
 * Allows public routes and bypasses auth in development environment.
 */
@Injectable()
export class AuthJwtAtGuard extends AuthGuard('jwt-at') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Handles the authentication request and checks for token validity.
   * Throws specific exceptions for expired or invalid tokens.
   * @param err - Error object from authentication process
   * @param user - Authenticated user object (if valid)
   * @param info - Additional info about authentication failure
   * @returns Authenticated user if valid; otherwise throws an exception
   */
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
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}

/**
 * JWT Refresh Token Authentication Guard
 * Validates JWT refresh tokens for token refresh operations.
 */
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
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}

/**
 * Local Authentication Guard
 * Validates user credentials using local strategy (username/password).
 * Strategy does not use JWT - validates credentials directly.
 */
@Injectable()
export class AuthLocalGuard extends AuthGuard('local') {
  /**
   * Determines if the request can be activated
   * @param context - Execution context
   * @returns true if credentials are valid; otherwise false or throws an exception
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
