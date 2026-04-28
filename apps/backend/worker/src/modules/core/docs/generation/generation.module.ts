import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';

@Module({
  providers: [GenerationService],
})
export class GenerationModule {}
