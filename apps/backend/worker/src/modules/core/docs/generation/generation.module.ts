import { Module } from '@nestjs/common';
import { ExcelGenerationService } from './excel-generation.service';
import { GenerationService } from './generation.service';

@Module({
  providers: [GenerationService, ExcelGenerationService],
  exports: [GenerationService, ExcelGenerationService],
})
export class GenerationModule {}
