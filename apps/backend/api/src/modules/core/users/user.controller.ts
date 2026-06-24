import {
  ChangePasswordDto,
  ChangeUserRoleDto,
  CreateStaffPayloadDto,
  ListUsersQueryDto,
  UpdateOwnProfileDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { UsersService } from './users.service';

@Controller('user')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  // --- Self-service (any authenticated user) ---

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Patch('me')
  async updateOwnProfile(
    @Body() payload: UpdateOwnProfileDto,
    @Req() req: Request,
  ) {
    return await this.usersService.updateOwnProfile(
      (req.user as ISignedUser).id,
      payload,
    );
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Post('me/password')
  async changeOwnPassword(
    @Body() payload: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return await this.usersService.changeOwnPassword(
      (req.user as ISignedUser).id,
      payload,
    );
  }

  // --- Admin user management ---

  @ApiDocumentation(undefined, { hasPagination: true })
  @Roles(RolesEnum.System.Admin)
  @Get()
  async listUsers(@Query() query: ListUsersQueryDto) {
    return await this.usersService.findAll(query);
  }

  @ApiDocumentation(undefined, {
    additionalErrors: [HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT],
  })
  @Roles(RolesEnum.System.Admin)
  @Post('staff')
  async createStaff(@Body() payload: CreateStaffPayloadDto) {
    return await this.usersService.createStaffUser(payload);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles(RolesEnum.System.Admin)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return await this.usersService.findUserById(id);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles(RolesEnum.System.Admin)
  @Patch(':id/role')
  async changeUserRole(
    @Param('id') id: string,
    @Body() payload: ChangeUserRoleDto,
  ) {
    return await this.usersService.changeUserRole(id, payload.role);
  }
}
