import type {
  IJwtPayloadUser,
  IJwtPayloadUserIntegration,
  ISignedUser,
  ISignedUserIntegration,
} from '@hsm/common/interfaces';
import { envs } from '@hsm/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AuthJwtATStrategy extends PassportStrategy(Strategy, 'jwt-at') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envs.JWT_AT_SECRET,
      passReqToCallback: false,
    });
  }

  validate(payload: IJwtPayloadUser | IJwtPayloadUserIntegration) {
    const { sub, ...rest } = payload;
    return { id: sub, ...rest } as ISignedUser | ISignedUserIntegration;
  }
}
