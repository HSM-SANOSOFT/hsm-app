import { Module } from '@nestjs/common';

import { ComsModule } from './coms/coms.module';
import { DocsModule } from './docs/docs.module';
import { UsersModule } from './users/users.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [DocsModule, ComsModule, UsersModule, TemplatesModule],
})
export class CoreModule {}
