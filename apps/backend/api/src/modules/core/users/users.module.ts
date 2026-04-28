import { Module } from '@nestjs/common';
import { RolesModule } from '../../security/roles/roles.module';
import { UserController } from './user.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RolesModule],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UserController],
})
export class UsersModule {}
