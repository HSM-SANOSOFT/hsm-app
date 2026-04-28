import type {
  IJwtPayloadUser,
  IJwtPayloadUserIntegration,
  IRefreshUser,
} from '@hsm/common/interfaces';

import { envs } from '@hsm/config';
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AuthJwtRTStrategy extends PassportStrategy(Strategy, 'jwt-rt') {
  private readonly logger = new Logger(AuthJwtRTStrategy.name);
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envs.JWT_RT_SECRET,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: IJwtPayloadUser | IJwtPayloadUserIntegration,
  ) {
    const refreshToken = req
      .get('Authorization')
      ?.replace('Bearer ', '')
      .trim();
    const { sub, ...rest } = payload;
    const refreshUser = { id: sub, ...rest, refreshToken } as IRefreshUser;
    this.logger.debug('jwt-rt strategy validate user:', refreshUser);
    return refreshUser;
  }
}
