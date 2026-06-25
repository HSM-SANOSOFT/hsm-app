import {
  CompleteOnboardingDto,
  ForgotPasswordDto,
  LoginPayloadDto,
  LogoutIntegrationTokenPayloadDto,
  PinGenerationPayloadDto,
  PinValidationPayloadDto,
  PublicSignupPayloadDto,
  RecoverUsernameDto,
  ResetPasswordDto,
  SignedIntegrationProfileDto,
  SignedUserProfileDto,
  SignupIntegrationTokenPayloadDto,
  TokensDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { IRefreshUser, ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AllowPending, ApiDocumentation, Public } from '../../../decorator';
import { AuthJwtRtGuard, AuthLocalGuard } from '../../../guards';
import { Roles } from '../../security/roles/roles.decorator';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthService } from './auth.service';

/**
 * Generic, non-committal acknowledgement returned by the recovery endpoints
 * regardless of whether an account exists — the non-enumerating contract.
 */
const GENERIC_RECOVERY_MESSAGE = {
  message: 'If an account exists, we have sent an email.',
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private accountRecoveryService: AccountRecoveryService,
  ) {}

  @ApiDocumentation(TokensDto)
  @Public()
  @Post('signup')
  async signup(@Body() payload: PublicSignupPayloadDto): Promise<TokensDto> {
    return await this.authService.signup(payload);
  }

  @ApiDocumentation(TokensDto)
  @UseGuards(AuthLocalGuard)
  @Public()
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() _payload: LoginPayloadDto,
  ): Promise<TokensDto> {
    return await this.authService.login(req.user as ISignedUser);
  }

  @ApiDocumentation()
  @Public()
  @Get('logout')
  async logout(@Req() req: Request): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];
    return await this.authService.logout(token);
  }

  @ApiDocumentation(TokensDto)
  @AllowPending()
  @UseGuards(AuthJwtRtGuard)
  @Get('refresh')
  async refresh(@Req() req: Request): Promise<TokensDto> {
    const user = req.user as IRefreshUser;
    return await this.authService.refresh(user);
  }

  /**
   * Completes first-login onboarding for the authenticated pending user.
   * @AllowPending so a pending user can reach it; returns a reissued token pair
   * reflecting the cleared flag.
   */
  @ApiDocumentation(TokensDto, { additionalErrors: [HttpStatus.BAD_REQUEST] })
  @AllowPending()
  @Post('onboarding')
  async completeOnboarding(
    @Req() req: Request,
    @Body() payload: CompleteOnboardingDto,
  ): Promise<TokensDto> {
    return await this.authService.completeOnboarding(
      (req.user as ISignedUser).id,
      payload,
    );
  }

  @ApiDocumentation(TokensDto)
  @Roles(RolesEnum.System.Admin)
  @Post('signup/integration')
  async signupIntegration(
    @Body() payload: SignupIntegrationTokenPayloadDto,
  ): Promise<TokensDto> {
    return await this.authService.signupIntegration(payload);
  }

  @ApiDocumentation()
  @Roles(RolesEnum.System.Admin)
  @Post('logout/integration')
  async logoutIntegration(@Body() payload: LogoutIntegrationTokenPayloadDto) {
    const token = payload.token;
    return await this.authService.logoutIntegration(token);
  }

  @ApiDocumentation([SignedUserProfileDto, SignedIntegrationProfileDto])
  @AllowPending()
  @Get('profile')
  profile(@Req() req: Request) {
    return req.user;
  }

  @ApiDocumentation()
  @Post('pin/generate')
  async generatePin(
    @Body() payload: PinGenerationPayloadDto,
    @Ip() ip: string,
  ) {
    return await this.authService.generatePin(payload, ip);
  }

  @ApiDocumentation()
  @Roles()
  @Post('pin/validate')
  async validatePin(@Body() payload: PinValidationPayloadDto) {
    return await this.authService.validatePin(payload);
  }

  /**
   * Begin a password reset. Always returns the same generic message so callers
   * can't enumerate accounts; the per-account 429 from the service is the only
   * non-generic outcome and is allowed to propagate. A tighter per-IP throttle
   * sits on top of the per-account rate limit.
   */
  @ApiDocumentation()
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('password/forgot')
  async forgotPassword(@Body() payload: ForgotPasswordDto) {
    await this.accountRecoveryService.forgotPassword(payload.email);
    return GENERIC_RECOVERY_MESSAGE;
  }

  /**
   * Consume a reset token and set a new password. A 400 for an invalid/expired/
   * used token is allowed to propagate.
   */
  @ApiDocumentation()
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('password/reset')
  async resetPassword(@Body() payload: ResetPasswordDto) {
    await this.accountRecoveryService.resetPassword(
      payload.token,
      payload.newPassword,
    );
    return { message: 'Password updated.' };
  }

  /** Email the username for an account. Always returns the generic message. */
  @ApiDocumentation()
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('username/recover')
  async recoverUsername(@Body() payload: RecoverUsernameDto) {
    await this.accountRecoveryService.recoverUsername(payload.email);
    return GENERIC_RECOVERY_MESSAGE;
  }
}
