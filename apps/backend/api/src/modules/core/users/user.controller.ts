import { Controller, Post } from '@nestjs/common';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';

@Controller('user')
export class UserController {
  //TODO: Add endpoint implementations

  @ApiDocumentation()
  @Roles()
  @Post('create')
  async createUser() {
    // Implementation for creating a user
  }

  @ApiDocumentation()
  @Roles()
  @Post('update')
  async updateUser() {
    // Implementation for updating a user
  }

  @ApiDocumentation()
  @Roles()
  @Post('delete')
  async deleteUser() {
    // Implementation for deleting a user
  }
}
