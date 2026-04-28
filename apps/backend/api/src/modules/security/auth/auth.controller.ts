import {
  LoginPayloadDto,
  LogoutIntegrationTokenPayloadDto,
  PinGenerationPayloadDto,
  PinValidationPayloadDto,
  SignedIntegrationProfileDto,
  SignedUserProfileDto,
  SignupIntegrationTokenPayloadDto,
  SignupPayloadDto,
  TokensDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { IRefreshUser, ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiDocumentation, Public } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { AuthService } from './auth.service';
import { AuthJwtRtGuard, AuthLocalGuard } from './guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiDocumentation(TokensDto)
  @Public()
  @Post('signup')
  async signup(@Body() payload: SignupPayloadDto): Promise<TokensDto> {
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
  @UseGuards(AuthJwtRtGuard)
  @Get('refresh')
  async refresh(@Req() req: Request): Promise<TokensDto> {
    const user = req.user as IRefreshUser;
    return await this.authService.refresh(user);
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
}
