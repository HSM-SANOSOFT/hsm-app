import type { RolesType } from '@hsm/common/types';
import { UserEntity, UserIntegrationEntity } from '@hsm/database/entities';

export interface IJwtPayloadUser extends Omit<IUnsignedUser, 'id'> {
  sub: IUnsignedUser['id'];
}

export interface IJwtPayloadUserIntegration
  extends Omit<IUnsignedUserIntegration, 'id'> {
  sub: IUnsignedUserIntegration['id'];
}

export type IRefreshUser = (ISignedUser | ISignedUserIntegration) & {
  refreshToken: string;
};

export interface ISignedUserIntegration extends IUnsignedUserIntegration {
  iat: number;
  exp: number;
}

export interface ISignedUser extends IUnsignedUser {
  iat: number;
  exp: number;
}

export interface ITokens {
  access_token: string;
  refresh_token: string;
}

export interface IUnsignedUserIntegration
  extends Pick<UserIntegrationEntity, 'id' | 'name'> {
  roles: RolesType[];
}

export interface IUnsignedUser
  extends Pick<
    UserEntity,
    'id' | 'username' | 'email' | 'firstName' | 'firstLastName'
  > {
  roles: RolesType[];
}
