import {
  PinGenerationPayloadDto,
  PinValidationPayloadDto,
  SignupIntegrationTokenPayloadDto,
  SignupPayloadDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import {
  IJwtPayloadUser,
  IJwtPayloadUserIntegration,
  IRefreshUser,
  ISignedUser,
  ISignedUserIntegration,
  ITokens,
  IUnsignedUser,
  IUnsignedUserIntegration,
} from '@hsm/common/interfaces';
import { envs } from '@hsm/config';
import {
  RefreshTokenUserEntity,
  RefreshTokenUserIntegrationEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository, UpdateResult } from 'typeorm';
import { UsersService } from '../../core/users/users.service';

/**
 * Authentication Service
 * Handles user authentication, token generation, refresh token management, and PIN generation/validation.
 * Integrates with UsersService for user validation and database operations for token management.
 * Provides methods for user signup, login, logout, and token refresh functionality.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    @InjectRepository(RefreshTokenUserEntity, DatabasesEnum.HsmDbPostgres)
    private refreshTokenUserRepository: Repository<RefreshTokenUserEntity>,
    @InjectRepository(
      RefreshTokenUserIntegrationEntity,
      DatabasesEnum.HsmDbPostgres,
    )
    private refreshTokenUserIntegrationRepository: Repository<RefreshTokenUserIntegrationEntity>,
    private jwtService: JwtService,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Hashes the provided data using bcrypt with a salt round of 10.
   * @param data - The string data to be hashed
   * @returns A promise that resolves to the hashed string
   */
  async hashData(data: string): Promise<string> {
    return await bcrypt.hash(data, 10);
  }

  /**
   * Handles the refresh token logic by deactivating any existing active refresh tokens for the user and saving the new hashed refresh token in the database.
   * @param user - The user for whom the refresh token is being managed
   * @param refreshToken - The new refresh token to be saved (hashed before saving)
   * @returns A promise that resolves when the operation is complete
   */
  async refreshToken(
    user: IUnsignedUser | IUnsignedUserIntegration,
    refreshToken: string,
  ): Promise<void> {
    const integration: boolean = user.roles.includes(
      RolesEnum.System.Integration,
    );
    const userId: string = user.id;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (integration) {
        await queryRunner.manager.update(
          RefreshTokenUserIntegrationEntity,
          { user: { id: userId }, isActive: true },
          {
            isActive: false,
          },
        );
        await queryRunner.manager.save(RefreshTokenUserIntegrationEntity, {
          user: { id: userId },
          refreshToken: refreshToken,
          isActive: true,
        });
      } else {
        await queryRunner.manager.update(
          RefreshTokenUserEntity,
          { user: { id: userId }, isActive: true },
          {
            isActive: false,
          },
        );
        await queryRunner.manager.save(RefreshTokenUserEntity, {
          user: { id: userId },
          refreshToken: refreshToken,
          isActive: true,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validates the user credentials (username and password).
   * @param username - The username provided by the client
   * @param password - The password provided by the client
   * @returns A promise that resolves to an unsigned user object if valid; otherwise throws an exception
   */
  async validateUser(username: string, pass: string): Promise<IUnsignedUser> {
    const user = await this.usersService.findOneByUsername(username);
    const passwordValid = await bcrypt.compare(pass, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    const userRoles = user.roles.map(role => role.role);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      firstLastName: user.firstLastName,
      roles: userRoles,
    };
  }

  /**
   * Validates the JWT payload and extracts user information along with the refresh token.
   * @param user - The refresh user object containing user information and the refresh token
   * @returns An object representing the unsigned user if valid; otherwise throws an exception
   */
  async validateRefreshToken(
    user: IRefreshUser,
  ): Promise<IUnsignedUser | IUnsignedUserIntegration> {
    const { refreshToken, iat: _iat, exp: _exp, ...userData } = user;
    const integration: boolean = user.roles.includes(
      RolesEnum.System.Integration,
    );
    const userId: string = user.id;
    let refreshTokenInDb:
      | RefreshTokenUserEntity
      | RefreshTokenUserIntegrationEntity
      | null;
    if (integration) {
      refreshTokenInDb =
        await this.refreshTokenUserIntegrationRepository.findOne({
          where: { user: { id: userId }, isActive: true },
        });
    } else {
      refreshTokenInDb = await this.refreshTokenUserRepository.findOne({
        where: { user: { id: userId }, isActive: true },
      });
    }
    this.logger.debug('Validate Refresh Token', refreshTokenInDb);
    if (!refreshTokenInDb) {
      throw new UnauthorizedException('Active Refresh token not found');
    }

    const refreshTokenValid = await bcrypt.compare(
      refreshToken,
      refreshTokenInDb.refreshToken,
    );

    if (!refreshTokenValid) {
      throw new UnauthorizedException('Refresh token is not valid');
    }
    return userData;
  }

  /**
   * Generates JWT access and refresh tokens for the authenticated user.
   * Access token expires in 15 minutes for regular users and 1 day for integrations, while refresh token expires in 1 day for regular users and 30 days for integrations.
   * @param user - The unsigned user object containing user information to be included in the token payload
   * @returns An object containing the generated access token and refresh token
   */
  async generateTokens(
    user: IUnsignedUser | IUnsignedUserIntegration,
  ): Promise<ITokens> {
    const integration: boolean = user.roles.includes(
      RolesEnum.System.Integration,
    );
    const payload: IJwtPayloadUser | IJwtPayloadUserIntegration = {
      sub: user.id,
      ...user,
    };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: integration ? '1d' : '15m',
        secret: envs.JWT_AT_SECRET,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: integration ? '30d' : '1d',
        secret: envs.JWT_RT_SECRET,
      }),
    ]);
    return { access_token, refresh_token };
  }

  /**
   * Handles user signup by creating a new user in the database, generating JWT tokens for the new user, and saving the hashed refresh token in the database.
   * @param newUser - The payload containing the new user's information for signup
   * @returns An object containing the generated access token and refresh token for the newly created user
   */
  async signup(newUser: SignupPayloadDto): Promise<ITokens> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const hashedPassword = await this.hashData(newUser.password);
      const user = await this.usersService.createUser(
        {
          ...newUser,
          password: hashedPassword,
        },
        queryRunner,
      );
      const userToSign: IUnsignedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        firstLastName: user.firstLastName,
        roles: newUser.roles,
      };
      const tokens: ITokens = await this.generateTokens(userToSign);
      const refreshToken = await this.hashData(tokens.refresh_token);
      await queryRunner.manager.save(RefreshTokenUserEntity, {
        user: user,
        refreshToken: refreshToken,
        isActive: true,
      });
      await queryRunner.commitTransaction();
      return tokens;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handles user login by validating the user credentials, generating JWT tokens for the authenticated user, and saving the hashed refresh token in the database.
   * @param user - The unsigned user object containing user information for login
   * @returns An object containing the generated access token and refresh token for the authenticated user
   */
  async login(user: IUnsignedUser): Promise<ITokens> {
    const tokens: ITokens = await this.generateTokens(user);
    const refreshToken = await this.hashData(tokens.refresh_token);
    await this.refreshToken(user, refreshToken);
    return tokens;
  }

  /**
   * Handles user logout by validating the provided token, determining if it's an access token or refresh token, and deactivating the corresponding refresh token in the database to prevent further use.
   * @param token - The JWT token provided in the logout request (can be either access token or refresh token)
   * @returns A promise that resolves when the logout process is complete; otherwise throws an exception if the token is invalid or not found
   */
  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    let decoded: ISignedUser;
    try {
      decoded = await this.jwtService.verifyAsync<ISignedUser>(token, {
        secret: envs.JWT_AT_SECRET,
        ignoreExpiration: true,
      });
    } catch {
      try {
        decoded = await this.jwtService.verifyAsync<ISignedUser>(token, {
          secret: envs.JWT_RT_SECRET,
          ignoreExpiration: true,
        });
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
    const responseDb: UpdateResult =
      await this.refreshTokenUserRepository.update(
        {
          user: { id: decoded.id },
          isActive: true,
        },
        {
          isActive: false,
        },
      );
    if (!responseDb.affected) {
      throw new BadRequestException('already logged out');
    }
  }


  /**
   * Handles the signup process for integrations by creating a new integration user in the database, generating JWT tokens for the new integration, and saving the hashed refresh token in the database.
   * @param payload - The payload containing the new integration's information for signup
   * @returns An object containing the generated access token and refresh token for the newly created integration
   */
  async signupIntegration(
    payload: SignupIntegrationTokenPayloadDto,
  ): Promise<ITokens> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.createUserIntegration(
        payload,
        queryRunner,
      );

      const userToSign: IUnsignedUserIntegration = {
        id: user.id,
        name: user.name,
        roles: [RolesEnum.System.Integration],
      };

      const tokens: ITokens = await this.generateTokens(userToSign);
      const refreshToken = await this.hashData(tokens.refresh_token);
      await queryRunner.manager.save(RefreshTokenUserIntegrationEntity, {
        user: user,
        refreshToken: refreshToken,
        isActive: true,
      });
      await queryRunner.commitTransaction();
      return tokens;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handles integration logout by validating the provided token, determining if it's an access token or refresh token, and deactivating the corresponding refresh token in the database to prevent further use.
   * @param token - The JWT token provided in the logout request (can be either access token or refresh token)
   * @returns A promise that resolves when the logout process is complete; otherwise throws an exception if the token is invalid or not found
   */
  async logoutIntegration(token: string): Promise<void> {
    let decoded: ISignedUserIntegration;
    try {
      decoded = await this.jwtService.verifyAsync<ISignedUserIntegration>(
        token,
        {
          secret: envs.JWT_AT_SECRET,
          ignoreExpiration: true,
        },
      );
    } catch {
      try {
        decoded = await this.jwtService.verifyAsync<ISignedUserIntegration>(
          token,
          {
            secret: envs.JWT_RT_SECRET,
            ignoreExpiration: true,
          },
        );
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
    const integration: boolean = decoded.roles.includes(
      RolesEnum.System.Integration,
    );

    if (!integration) {
      throw new UnauthorizedException('Not an integration token');
    }
    const responseDb: UpdateResult =
      await this.refreshTokenUserIntegrationRepository.update(
        {
          user: { id: decoded.id },
          isActive: true,
        },
        {
          isActive: false,
        },
      );
    if (!responseDb.affected) {
      throw new BadRequestException('already logged out');
    }
  }

  /**
   * Handles the refresh token process by validating the provided refresh token, generating new JWT tokens, and updating the hashed refresh token in the database.
   * @param user - The user object containing information for refresh token validation
   * @returns An object containing the newly generated access token and refresh token
   */
  async refresh(user: IRefreshUser): Promise<ITokens> {
    const userToSign = await this.validateRefreshToken(user);
    const tokens: ITokens = await this.generateTokens(userToSign);
    const newRefreshToken = await this.hashData(tokens.refresh_token);
    await this.refreshToken(user, newRefreshToken);
    return tokens;
  }

  /**
   * Generates a PIN code for the specified purpose and target, and handles the logic for storing and sending the PIN.
   * @param payload - The payload containing the purpose and target for the PIN generation
   * @param ip - The IP address from which the request originated (for logging purposes)
   */
  async generatePin(payload: PinGenerationPayloadDto, ip: string) {
    // TODO: Implement PIN generation and validation methods for functionalities like email verification and password reset
    const { purpose: pinPurpose, target: pinTarget } = payload;

    const pinLength = 6;
    const pinMin = 10 ** (pinLength - 1);
    const pinMax = 9 * 10 ** (pinLength - 1);
    const pin = Math.floor(pinMin + Math.random() * pinMax);

    await this.logger.debug(
      `Generating PIN: ${pin} for target: ${pinTarget}, purpose: ${pinPurpose}, from IP: ${ip}`,
    );

    // Todo: Store the generated PIN with its purpose and target in the database with an expiration time
    // Todo: Send the PIN to the target (e.g., via email or SMS) based on the purpose
  }

  /**
   * Validates the provided PIN code for the specified purpose and target, and handles the logic for checking the PIN against stored values.
   * @param payload - The payload containing the purpose, target, and code for PIN validation
   */
  async validatePin(payload: PinValidationPayloadDto) {
    const { purpose: pinPurpose, target: pinTarget, code: pinCode } = payload;

    await this.logger.debug(
      `Validating PIN code: ${pinCode} for target: ${pinTarget}, purpose: ${pinPurpose}`,
    );
    // TODO: Retrieve the PIN from the database and validate it
    // TODO: If valid, mark the PIN as used or delete it to prevent reuse
  }
}
