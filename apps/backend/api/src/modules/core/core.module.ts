import { Module } from '@nestjs/common';

import { ComsModule } from './coms/coms.module';
import { DocsModule } from './docs/docs.module';
import { SettingsModule } from './settings/settings.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DocsModule,
    ComsModule,
    UsersModule,
    TemplatesModule,
    SettingsModule,
  ],
})
export class CoreModule {}
