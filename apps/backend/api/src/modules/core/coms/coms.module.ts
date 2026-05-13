import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ComsController } from './coms.controller';
import { ComsService } from './coms.service';

@Module({
  imports: [TemplatesModule],
  controllers: [ComsController],
  providers: [ComsService],
})
export class ComsModule {}
