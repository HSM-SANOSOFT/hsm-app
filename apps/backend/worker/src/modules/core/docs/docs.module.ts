import { StorageModule } from '@hsm/storage';
import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { DocsService } from './docs.service';
import { DocsProcessorService } from './docs-processor.service';
import { GenerationModule } from './generation/generation.module';

@Module({
  imports: [GenerationModule, StorageModule, TemplatesModule],
  providers: [DocsService, DocsProcessorService],
  exports: [DocsService],
})
export class DocsModule {}
