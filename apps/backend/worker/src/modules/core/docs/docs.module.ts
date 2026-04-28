import { StorageModule } from '@hsm/storage';
import { Module } from '@nestjs/common';
import { DocsService } from './docs.service';
import { GenerationModule } from './generation/generation.module';

@Module({
  imports: [GenerationModule, StorageModule],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocsModule {}
