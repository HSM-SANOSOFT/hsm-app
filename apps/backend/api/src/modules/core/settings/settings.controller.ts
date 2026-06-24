import {
  GetSettingsQueryDto,
  GetSettingsResponseDto,
  UpdateSettingsPayloadDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { ISignedUser } from '@hsm/common/interfaces';
import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiDocumentation(GetSettingsResponseDto)
  @Roles(RolesEnum.System.Admin)
  @Get()
  getSettings(@Query() query: GetSettingsQueryDto) {
    return this.settingsService.getByCategory(query.category);
  }

  @ApiDocumentation(GetSettingsResponseDto)
  @Roles(RolesEnum.System.Admin)
  @Put()
  updateSettings(
    @Body() payload: UpdateSettingsPayloadDto,
    @Req() req: Request,
  ) {
    return this.settingsService.update(
      payload,
      (req.user as ISignedUser)?.id ?? null,
    );
  }
}
