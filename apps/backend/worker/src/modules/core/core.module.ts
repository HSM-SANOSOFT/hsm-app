import { Module } from '@nestjs/common';
import { ComsModule } from './coms/coms.module';
import { DocsModule } from './docs/docs.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [ComsModule, DocsModule, TemplatesModule],
})
export class CoreModule {}
