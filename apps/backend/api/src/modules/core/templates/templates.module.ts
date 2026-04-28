import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  providers: [TemplatesService],
  exports: [TemplatesService],
  controllers: [TemplatesController],
})
export class TemplatesModule {}
