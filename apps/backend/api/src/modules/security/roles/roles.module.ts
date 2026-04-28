import { Module } from '@nestjs/common';

import { RolesGuard } from './roles.guard';
import { RolesService } from './roles.service';

@Module({
  controllers: [],
  providers: [RolesService, RolesGuard],
  exports: [RolesGuard, RolesService],
})
export class RolesModule {}
