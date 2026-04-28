import { RolesEnum } from '@hsm/common/enums';
import { ISignedUser, ISignedUserIntegration } from '@hsm/common/interfaces';
import type { RolesType } from '@hsm/common/types';
import { envs } from '@hsm/config/envs';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../decorator';
import { ROLES_KEY } from '../../security/roles/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (envs.ENVIRONMENT === 'dev') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RolesType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRequiredRoles = !!requiredRoles && requiredRoles.length > 0;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user }: { user: ISignedUser | ISignedUserIntegration } = context
      .switchToHttp()
      .getRequest();

    const isAdmin = user.roles.includes(RolesEnum.System.Admin);

    if (isPublic) {
      if (hasRequiredRoles) {
        const message = 'Public route should not have roles defined';
        this.logger.error(message);
        throw new InternalServerErrorException({ message });
      }
      return true;
    }
    if (!hasRequiredRoles) {
      return true;
    }
    if (isAdmin) {
      return true;
    }
    return requiredRoles!.some(role => user.roles.includes(role));
  }
}
