import { Module } from '@nestjs/common';
import { RolesModule } from '../../security/roles/roles.module';
import { AdminSeedService } from './admin-seed.service';
import { UserController } from './user.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RolesModule],
  providers: [UsersService, AdminSeedService],
  exports: [UsersService],
  controllers: [UserController],
})
export class UsersModule {}
