import type { RolesType } from '@hsm/common/types';
import type { UserEntity, UserIntegrationEntity } from '@hsm/database/entities';

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
  /**
   * ISO timestamp of onboarding completion, or `null` if the account is still
   * pending. Carried in the JWT so `GET /auth/profile` (JWT-derived) can expose
   * it; the DB row remains the source of truth for the server-side guard.
   */
  onboardingCompletedAt: string | null;
}
